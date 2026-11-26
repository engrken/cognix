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

The schema rejects unknown fields and all free-form incident text. Raw logs, stack traces, request/response bodies, hostnames, URLs, user/tenant identifiers, credentials, and application business data are not accepted.

## Output and safety

The model response is parsed and validated against a strict Zod schema. It may return:
- up to three additional hypotheses with low/moderate confidence
- up to three resolution options with explicit risk tiers, preconditions, and verification checks
- up to three caveats

Output fields are screened for URLs, code fences, common command forms, and common SQL statement forms. This is a conservative content filter, not a proof of safety. All model output remains untrusted, inert advisory text. No commands, SQL, code, or model-supplied actions are ever executed.

No model response means no AI advice; deterministic diagnosis remains available. Provider errors are reduced to safe error codes. No automatic retries or paid fallbacks are performed.

## Synthetic verification

`npm run test:advisor` uses Node's built-in test runner and a mocked fetch implementation. It makes no external network calls. Tests cover:
1. Strict allowlisted input and rejection of unknown/free-form fields.
2. Disabled-by-default configuration.
3. Successful structured response parsing and outbound payload inspection.
4. Input rejection before provider invocation.
5. HTTP 429 handling.
6. Malformed, oversized, and unsafe output rejection.
7. Network failure mapping without leaking provider details.

## Explicit non-goals

- No admin UI integration in this change.
- No event ingestion or application adapters.
- No production credentials or environment changes.
- No database or Blob persistence of model prompts/responses.
- No autonomous execution, deployment, restart, replay, permission changes, or business mutations.
