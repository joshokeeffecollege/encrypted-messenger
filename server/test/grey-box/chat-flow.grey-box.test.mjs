import test from "node:test";
import assert from "node:assert/strict";
import {
  getLocalHandle,
  getLocalUsername,
  isRemoteChatHandle,
  parseHandle,
} from "../../dist/app/config.js";

function withServerEnv(baseUrl, run) {
  const oldBaseUrl = process.env.PUBLIC_BASE_URL;
  process.env.PUBLIC_BASE_URL = baseUrl;

  try {
    run();
  } finally {
    if (oldBaseUrl === undefined) {
      delete process.env.PUBLIC_BASE_URL;
    } else {
      process.env.PUBLIC_BASE_URL = oldBaseUrl;
    }
  }
}

test("local chat names stay local", () => {
  withServerEnv("http://127.0.0.1:5001", () => {
    assert.equal(getLocalUsername("alice"), "alice");
    assert.equal(isRemoteChatHandle("alice"), false);
    assert.equal(getLocalHandle("alice"), "alice@127.0.0.1:5001");
  });
});

test("remote chat names get picked up as remote", () => {
  withServerEnv("http://127.0.0.1:5001", () => {
    const parsed = parseHandle("bob@example.com");

    assert.equal(parsed?.username, "bob");
    assert.equal(parsed?.domain, "example.com");
    assert.equal(isRemoteChatHandle("bob@example.com"), true);
    assert.equal(getLocalUsername("bob@example.com"), null);
  });
});
