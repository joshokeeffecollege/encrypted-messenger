import test from "node:test";
import assert from "node:assert/strict";
import {
  getLocalHandle,
  getLocalUsername,
  isRemoteChatHandle,
  parseHandle,
} from "../../dist/app/config.js";

function withServerEnv(baseUrl, run) {
  // save the old base url so we can put it back after each test
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
  // this one is simple local chat behavior on the current server
  withServerEnv("http://127.0.0.1:5001", () => {
    // a plain username should stay local all the way through
    assert.equal(getLocalUsername("alice"), "alice");
    assert.equal(isRemoteChatHandle("alice"), false);
    assert.equal(getLocalHandle("alice"), "alice@127.0.0.1:5001");
  });
});

test("remote chat names get picked up as remote", () => {
  // this test knows a little about parsing but checks the final behavior too
  withServerEnv("http://127.0.0.1:5001", () => {
    // a full remote handle should get split into user and server
    const parsed = parseHandle("bob@example.com");

    // after that it should still count as remote
    assert.equal(parsed?.username, "bob");
    assert.equal(parsed?.domain, "example.com");
    assert.equal(isRemoteChatHandle("bob@example.com"), true);
    assert.equal(getLocalUsername("bob@example.com"), null);
  });
});
