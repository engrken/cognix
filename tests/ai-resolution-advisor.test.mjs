import assert from "node:assert/strict";
import test from "node:test";
import {
  AiAdvisorProviderError,
  createConfiguredAiResolutionProvider,
  createGroqAiResolutionProvider,
  sanitizeAiAdvisorInput,
} from "../src/lib/ai-resolution-advisor.ts";

const input = {
  app: "saga",
  category: "database_unavailable",
  severity: "error",
  component: "database",
  dependencyCode: "primary_database",
  httpStatusClass: "5xx",
  occurrences: 4,
  firstSeenAt: "2026-11-26T12:00:00.000Z",
  lastSeenAt: "2026-11-26T12:05:00.000Z",
};

const advice = {
  additionalHypotheses: [{
    cause: "The database connection pool may be saturated.",
    whyItFits: "Repeated database availability events can coincide with exhausted connections.",
    confidence: "low",
    evidenceToCollect: ["Review connection utilization metrics."],
  }],
  resolutionOptions: [{
    summary: "Inspect database health and connection utilization.",
    preconditions: ["Use the database provider's read-only health dashboard."],
    riskTier: "tier1_read_only",
    verification: ["Confirm connection utilization returns to its normal range."],
  }],
  caveats: ["The event metadata does not establish a definitive root cause."],
};

function providerResponse(content, status = 200) {
  return new Response(JSON.stringify({
    choices: [{ message: { content: JSON.stringify(content) } }],
  }), { status, headers: { "content-type": "application/json" } });
}

test("accepts the bounded structured incident contract", () => {
  assert.deepEqual(sanitizeAiAdvisorInput(input), input);
});

test("rejects free-form or unknown incident fields", () => {
  assert.throws(() => sanitizeAiAdvisorInput({ ...input, rawLog: "private data" }));
  assert.throws(() => sanitizeAiAdvisorInput({ ...input, diagnosticHypothesis: "free text" }));
});

test("advisor stays disabled unless explicitly enabled and configured", () => {
  assert.equal(createConfiguredAiResolutionProvider({}), null);
  assert.equal(createConfiguredAiResolutionProvider({
    COGNIX_AI_ADVISOR_ENABLED: "false",
    COGNIX_AI_PROVIDER: "groq",
    COGNIX_AI_API_KEY: "test-key",
    COGNIX_AI_MODEL: "test-model",
  }), null);
  assert.equal(createConfiguredAiResolutionProvider({
    COGNIX_AI_ADVISOR_ENABLED: "true",
    COGNIX_AI_PROVIDER: "groq",
    COGNIX_AI_MODEL: "test-model",
  }), null);
});

test("returns schema-validated advice and sends only structured input", async () => {
  let captured;
  const provider = createGroqAiResolutionProvider({
    apiKey: "test-secret",
    model: "test-model",
    fetcher: async (url, init) => {
      captured = { url, init };
      return providerResponse(advice);
    },
  });

  assert.deepEqual(await provider.analyze(input), advice);
  assert.equal(captured.url, "https://api.groq.com/openai/v1/chat/completions");
  assert.equal(new Headers(captured.init.headers).get("authorization"), "Bearer test-secret");
  const request = JSON.parse(captured.init.body);
  assert.deepEqual(JSON.parse(request.messages[1].content), input);
  assert.equal(request.stream, false);
});

test("rejects unknown input before making a provider request", async () => {
  let called = false;
  const provider = createGroqAiResolutionProvider({
    apiKey: "test-secret",
    model: "test-model",
    fetcher: async () => {
      called = true;
      return providerResponse(advice);
    },
  });

  await assert.rejects(provider.analyze({ ...input, rawLog: "do not send" }));
  assert.equal(called, false);
});

test("maps provider quota exhaustion to a safe rate-limit error", async () => {
  const provider = createGroqAiResolutionProvider({
    apiKey: "test-secret",
    model: "test-model",
    fetcher: async () => new Response("{}", { status: 429 }),
  });

  await assert.rejects(provider.analyze(input), (error) =>
    error instanceof AiAdvisorProviderError && error.code === "rate_limited");
});

test("rejects malformed, oversized, and unsafe model output", async (t) => {
  await t.test("malformed response", async () => {
    const provider = createGroqAiResolutionProvider({
      apiKey: "test-secret",
      model: "test-model",
      fetcher: async () => new Response("not-json", { status: 200 }),
    });
    await assert.rejects(provider.analyze(input), (error) =>
      error instanceof AiAdvisorProviderError && error.code === "invalid_provider_response");
  });

  await t.test("oversized response", async () => {
    const provider = createGroqAiResolutionProvider({
      apiKey: "test-secret",
      model: "test-model",
      fetcher: async () => new Response("x".repeat(20_001), { status: 200 }),
    });
    await assert.rejects(provider.analyze(input), (error) =>
      error instanceof AiAdvisorProviderError && error.code === "invalid_provider_response");
  });

  await t.test("unsafe operational text", async () => {
    const unsafe = structuredClone(advice);
    unsafe.resolutionOptions[0].summary = "Run rm -rf / to clear the issue";
    const provider = createGroqAiResolutionProvider({
      apiKey: "test-secret",
      model: "test-model",
      fetcher: async () => providerResponse(unsafe),
    });
    await assert.rejects(provider.analyze(input), (error) =>
      error instanceof AiAdvisorProviderError && error.code === "invalid_provider_response");
  });
});

test("maps network and upstream failures without exposing provider details", async () => {
  const provider = createGroqAiResolutionProvider({
    apiKey: "test-secret",
    model: "test-model",
    fetcher: async () => { throw new Error("sensitive provider response"); },
  });

  await assert.rejects(provider.analyze(input), (error) =>
    error instanceof AiAdvisorProviderError
      && error.code === "provider_unavailable"
      && !error.message.includes("sensitive"));
});
