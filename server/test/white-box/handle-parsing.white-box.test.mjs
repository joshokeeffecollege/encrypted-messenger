// these are white box tests
// these know a bit more about the parser branches

import test from "node:test";
import assert from "node:assert/strict";
import {
  getLocalUsername,
  isRemoteChatHandle,
  parseHandle,
} from "../../dist/app/config.js";

function withServerEnv(env, run) {
  // keep the old env so this test file does not leak changes
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
  // this should clean the text before splitting the handle
  const parsed = parseHandle("  @bob@example.com  ");

  assert.deepEqual(parsed, {
    username: "bob",
    domain: "example.com",
    handle: "bob@example.com",
  });
});

test("it uses the last @ if the name is a bit weird", () => {
  // this checks the branch that uses the last @ sign
  const parsed = parseHandle("team@chat@example.com");

  assert.deepEqual(parsed, {
    username: "team@chat",
    domain: "example.com",
    handle: "team@chat@example.com",
  });
});

test("it gives back null for bad handle inputs", () => {
  // these are bad shapes so the parser should stop
  assert.equal(parseHandle("bob"), null);
  assert.equal(parseHandle("bob@"), null);
  assert.equal(parseHandle("@example.com"), null);
});

test("it tells local and remote names apart", () => {
  // this branch needs the current server host to compare against
  withServerEnv(
    {
      PUBLIC_BASE_URL: "http://127.0.0.1:5009",
    },
    () => {
      // remote names stay remote and local names stay local
      assert.equal(isRemoteChatHandle("bob@server-b.com"), true);
      assert.equal(isRemoteChatHandle("bob@127.0.0.1:5009"), false);
      assert.equal(getLocalUsername("bob"), "bob");
      assert.equal(getLocalUsername("@bob"), "bob");
      assert.equal(getLocalUsername("bob@127.0.0.1:5009"), "bob");
      assert.equal(getLocalUsername("bob@server-b.com"), null);
    },
  );
});
