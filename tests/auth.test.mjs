import test from "node:test";
import assert from "node:assert/strict";
import { hasValidServiceToken } from "../src/lib/auth.ts";

const ENV_KEYS = [
  "COGNIX_API_KEY",
  "COGNIX_SAGA_API_KEY",
  "COGNIX_CLEAR_API_KEY",
  "COGNIX_ROAMPH_API_KEY",
];

function withIsolatedCredentials(run) {
  const original = new Map(ENV_KEYS.map((key) => [key, process.env[key]]));
  for (const key of ENV_KEYS) delete process.env[key];
  try {
    run();
  } finally {
    for (const key of ENV_KEYS) {
      const value = original.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function requestWithToken(token) {
  return new Request("https://cognix.invalid/api/v1/agent", {
    headers: token ? { authorization: token } : {},
  });
}

test("keeps the legacy compatibility credential SAGA-only", () => {
  withIsolatedCredentials(() => {
    process.env.COGNIX_API_KEY = "legacy-saga-secret";
    assert.equal(hasValidServiceToken(requestWithToken("Bearer legacy-saga-secret"), "saga"), true);
    assert.equal(hasValidServiceToken(requestWithToken("Bearer legacy-saga-secret"), "clear"), false);
    assert.equal(hasValidServiceToken(requestWithToken("Bearer legacy-saga-secret"), "roamph"), false);
  });
});

test("binds dedicated service credentials to exactly one application", () => {
  withIsolatedCredentials(() => {
    process.env.COGNIX_SAGA_API_KEY = "saga-secret";
    process.env.COGNIX_CLEAR_API_KEY = "clear-secret";
    process.env.COGNIX_ROAMPH_API_KEY = "roamph-secret";

    const credentials = [
      ["saga", "saga-secret"],
      ["clear", "clear-secret"],
      ["roamph", "roamph-secret"],
    ];

    for (const [app, token] of credentials) {
      assert.equal(hasValidServiceToken(requestWithToken(`Bearer ${token}`), app), true);
      for (const [otherApp] of credentials) {
        if (otherApp !== app) {
          assert.equal(hasValidServiceToken(requestWithToken(`Bearer ${token}`), otherApp), false);
        }
      }
    }
  });
});

test("rejects missing, malformed, and incorrect bearer credentials", () => {
  withIsolatedCredentials(() => {
    process.env.COGNIX_CLEAR_API_KEY = "clear-secret";
    assert.equal(hasValidServiceToken(requestWithToken(null), "clear"), false);
    assert.equal(hasValidServiceToken(requestWithToken("Basic clear-secret"), "clear"), false);
    assert.equal(hasValidServiceToken(requestWithToken("Bearer wrong-secret"), "clear"), false);
  });
});
