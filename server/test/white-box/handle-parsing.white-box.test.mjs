// These are white box tests.
// These ones know a bit more about how the parsing code is writen.

import test from "node:test";
import assert from "node:assert/strict";
import {
  getLocalUsername,
  isRemoteHandle,
  parseHandle,
} from "../../dist/config/server-config.js";

function withServerEnv(env, run) {
  const oldBaseUrl = process.env.PUBLIC_BASE_URL;

  if (env.PUBLIC_BASE_URL === undefined) {
    delete process.env.PUBLIC_BASE_URL;
  } else {
    process.env.PUBLIC_BASE_URL = env.PUBLIC_BASE_URL;
  }

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

test("it trims spaces and the @ at the start", () => {
  const parsed = parseHandle("  @bob@example.com  ");

  assert.deepEqual(parsed, {
    username: "bob",
    domain: "example.com",
    handle: "bob@example.com",
  });
});

test("it uses the last @ if the name is a bit weird", () => {
  const parsed = parseHandle("team@chat@example.com");

  assert.deepEqual(parsed, {
    username: "team@chat",
    domain: "example.com",
    handle: "team@chat@example.com",
  });
});

test("it gives back null for bad handle inputs", () => {
  assert.equal(parseHandle("bob"), null);
  assert.equal(parseHandle("bob@"), null);
  assert.equal(parseHandle("@example.com"), null);
});

test("it tells local and remote names apart", () => {
  withServerEnv(
    {
      PUBLIC_BASE_URL: "http://127.0.0.1:5009",
    },
    () => {
      assert.equal(isRemoteHandle("bob@server-b.com"), true);
      assert.equal(isRemoteHandle("bob@127.0.0.1:5009"), false);
      assert.equal(getLocalUsername("bob"), "bob");
      assert.equal(getLocalUsername("@bob"), "bob");
      assert.equal(getLocalUsername("bob@127.0.0.1:5009"), "bob");
      assert.equal(getLocalUsername("bob@server-b.com"), null);
    },
  );
});
