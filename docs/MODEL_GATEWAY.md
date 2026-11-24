# Model gateway

COGNIX uses a small provider-neutral interface in `src/lib/ai/model.ts`. The first adapter targets Vercel AI Gateway's OpenAI-compatible Chat Completions endpoint so the hosting and model routing can stay separate from application logic.

## Configuration

Set these only after deciding on a model and an acceptable spend limit:

- `AI_GATEWAY_MODEL`: an exact `provider/model` ID from `https://ai-gateway.vercel.sh/v1/models`.
- `AI_GATEWAY_API_KEY`: optional gateway key for local development or non-Vercel hosting.
- On Vercel, `VERCEL_OIDC_TOKEN` is preferred and is supplied to deployments automatically.

No model ID or credential is committed. The adapter fails closed if configuration is missing. It makes one non-streaming request, has a 25-second timeout, caps output at 1,024 tokens, and does not retry automatically.

## Cost and activation

Model inference is metered separately from Vercel hosting. Do not enable the adapter until the team has reviewed the selected model's live pricing and configured an acceptable spend limit. Some AI Gateway free-credit eligibility may require a valid payment method. This repository does not create keys, add a payment method, purchase credits, or initiate a model request.

## Safety boundary

The adapter only generates text. It does not choose or execute application tools, access databases, or authorize users. Application-side identity, tenant, role, and record-level checks must be completed before any application data is passed to it.
