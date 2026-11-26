# Cognix AI Resolution Advisor v1

## Purpose

Add optional AI-assisted analysis beside the deterministic Learning Machine Layer (LML) diagnostic engine. The AI advisor may suggest alternative technical hypotheses, evidence to collect, and bounded resolution options. It is advisory only and cannot execute repairs.

## Initial provider

The first adapter uses Groq's OpenAI-compatible Chat Completions endpoint. The adapter is isolated behind the `AiResolutionProvider` interface so another provider can be added without changing LML diagnosis or evaluation logic.

The model is supplied through `COGNIX_AI_MODEL`; do not assume a model ID remains available. Confirm the selected model in the provider's current model catalog and verify its free-tier eligibility and quotas before enabling it. Groq documents the compatible endpoint and JSON response mode:
- https://console.groq.com/docs/openai
- https://console.groq.com/docs/structured-outputs
- https://console.groq.com/docs/rate-limits

Free-tier availability and limits are provider/account-specific and may change. The implementation does not retry, fail over, or switch to a paid provider automatically.

## Configuration

The advisor is disabled by default. It returns no provider unless all values are explicitly set:

- `COGNIX_AI_ADVISOR_ENABLED=true`
- `COGNIX_AI_PROVIDER=groq`
- `COGNIX_AI_API_KEY` (server-only secret)
- `COGNIX_AI_MODEL` (exact current model ID)

No environment variables or credentials are added by this change. Do not expose these variables to browser/client bundles.

## Data boundary

Only a strict allowlist is accepted:
- app enum (saga, clear, roamph)
- technical error category, severity, component, dependency code
- HTTP status class
- bounded occurrence count and timestamps
- deterministic hypothesis and bounded deterministic checks

The schema rejects unknown fields. Raw logs, stack traces, request/response bodies, hostnames, URLs, user/tenant identifiers, credentials, and application business data are not accepted.

## Output and safety

The model response is parsed and validated against a strict Zod schema. It may return:
- up to three additional hypotheses with low/moderate confidence
- up to three resolution options with explicit risk tiers, preconditions, and verification checks
- up to three caveats

The system prompt prohibits commands, SQL, code, credentials, tool calls, and business-record changes. The application must still treat every model statement as untrusted. Schema validation checks structure, not factual correctness.

No model response means no AI advice; deterministic diagnosis remains available. Provider errors are reduced to safe error codes. No automatic retries or paid fallbacks are performed.

## Verification cases

Before enabling the provider, validate:
1. Advisor is unavailable when the feature flag is absent or false.
2. Unknown input fields are rejected.
3. A valid allowlisted incident summary is accepted.
4. API keys never appear in returned errors or logs.
5. HTTP 429 maps to `rate_limited`; network/5xx errors map to `provider_unavailable`.
6. Malformed, oversized, or schema-invalid model output is rejected.
7. Model output containing command-like text remains inert advisory text and is never executed.
8. Provider failure does not affect deterministic diagnosis.
9. Synthetic inputs contain no user, tenant, student, teacher, booking, payment, academic, or uploaded-file data.

## Explicit non-goals

- No admin UI integration in this change.
- No event ingestion or application adapters.
- No production credentials or environment changes.
- No database or Blob persistence of model prompts/responses.
- No autonomous execution, deployment, restart, replay, permission changes, or business mutations.
