export type ModelResult = {
  text: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
};

export class ModelNotConfiguredError extends Error {
  constructor() {
    super("The model gateway is not configured.");
    this.name = "ModelNotConfiguredError";
  }
}

export class ModelGatewayError extends Error {
  readonly status: number;

  constructor(status: number) {
    super("The model gateway request failed.");
    this.name = "ModelGatewayError";
    this.status = status;
  }
}

type GatewayResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

function readModelConfig() {
  const model = process.env.AI_GATEWAY_MODEL?.trim();
  const token =
    process.env.AI_GATEWAY_API_KEY?.trim() ||
    process.env.VERCEL_OIDC_TOKEN?.trim();

  if (!model || !token) {
    throw new ModelNotConfiguredError();
  }

  if (!/^[a-z0-9._-]+\/[a-z0-9._:-]+$/i.test(model)) {
    throw new ModelNotConfiguredError();
  }

  return { model, token };
}

/**
 * Single-shot, non-streaming model call through Vercel AI Gateway.
 * The endpoint is fixed (not caller-controlled), output is capped, and
 * provider response bodies are never copied into thrown errors or logs.
 */
export async function generateModelText(input: {
  system: string;
  prompt: string;
  maxOutputTokens?: number;
}): Promise<ModelResult> {
  const { model, token } = readModelConfig();

  if (
    input.system.length > 4_000 ||
    input.prompt.length < 1 ||
    input.prompt.length > 12_000
  ) {
    throw new ModelNotConfiguredError();
  }

  const maxTokens = Math.min(
    Math.max(input.maxOutputTokens ?? 512, 128),
    1_024,
  );

  let response: Response;
  try {
    response = await fetch(
      "https://ai-gateway.vercel.sh/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: input.system },
            { role: "user", content: input.prompt },
          ],
          max_tokens: maxTokens,
          temperature: 0.2,
          stream: false,
        }),
        signal: AbortSignal.timeout(25_000),
        cache: "no-store",
      },
    );
  } catch {
    throw new ModelGatewayError(0);
  }

  if (!response.ok) {
    throw new ModelGatewayError(response.status);
  }

  let payload: GatewayResponse;
  try {
    payload = (await response.json()) as GatewayResponse;
  } catch {
    throw new ModelGatewayError(502);
  }

  const content = payload.choices?.[0]?.message?.content;
  const text =
    typeof content === "string"
      ? content
      : Array.isArray(content)
        ? content
            .filter((part) => part.type === "text" && typeof part.text === "string")
            .map((part) => part.text)
            .join("\n")
        : "";

  if (!text.trim() || text.length > 8_000) {
    throw new ModelGatewayError(502);
  }

  return {
    text: text.trim(),
    usage: {
      inputTokens: payload.usage?.prompt_tokens,
      outputTokens: payload.usage?.completion_tokens,
      totalTokens: payload.usage?.total_tokens,
    },
  };
}
