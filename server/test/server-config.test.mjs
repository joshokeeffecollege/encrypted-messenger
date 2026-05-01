import test from "node:test";
import assert from "node:assert/strict";
import {
  getActivityUrl,
  getActorUrl,
  getInboxUrl,
  getKeyBundleUrl,
  getLocalHandle,
  getLocalUsername,
  getServerBaseUrl,
  getServerHost,
  isRemoteHandle,
  parseHandle,
} from "../dist/config/server-config.js";

function withServerEnv(env, run) {
  const oldPort = process.env.PORT;
  const oldBaseUrl = process.env.PUBLIC_BASE_URL;

  if (env.PORT === undefined) {
    delete process.env.PORT;
  } else {
    process.env.PORT = env.PORT;
  }

  if (env.PUBLIC_BASE_URL === undefined) {
    delete process.env.PUBLIC_BASE_URL;
  } else {
    process.env.PUBLIC_BASE_URL = env.PUBLIC_BASE_URL;
  }

  try {
    run();
  } finally {
    if (oldPort === undefined) {
      delete process.env.PORT;
    } else {
      process.env.PORT = oldPort;
    }

    if (oldBaseUrl === undefined) {
      delete process.env.PUBLIC_BASE_URL;
    } else {
      process.env.PUBLIC_BASE_URL = oldBaseUrl;
    }
  }
}

test("getServerBaseUrl uses PUBLIC_BASE_URL when it is set", () => {
  withServerEnv(
    {
      PUBLIC_BASE_URL: "http://127.0.0.1:6001/",
      PORT: "5001",
    },
    () => {
      assert.equal(getServerBaseUrl(), "http://127.0.0.1:6001");
      assert.equal(getServerHost(), "127.0.0.1:6001");
    },
  );
});

test("getServerBaseUrl falls back to PORT", () => {
  withServerEnv(
    {
      PORT: "5012",
      PUBLIC_BASE_URL: undefined,
    },
    () => {
      assert.equal(getServerBaseUrl(), "http://127.0.0.1:5012");
      assert.equal(getLocalHandle("alice"), "alice@127.0.0.1:5012");
    },
  );
});

test("parseHandle trims spaces and a leading @", () => {
  const parsed = parseHandle("  @bob@example.com  ");

  assert.deepEqual(parsed, {
    username: "bob",
    domain: "example.com",
    handle: "bob@example.com",
  });
});

test("parseHandle returns null for invalid handles", () => {
  assert.equal(parseHandle("bob"), null);
  assert.equal(parseHandle("bob@"), null);
  assert.equal(parseHandle("@example.com"), null);
});

test("isRemoteHandle and getLocalUsername tell local and remote users apart", () => {
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

test("federation urls are built from the current server base url", () => {
  withServerEnv(
    {
      PUBLIC_BASE_URL: "http://127.0.0.1:5007",
    },
    () => {
      assert.equal(
        getActorUrl("alice"),
        "http://127.0.0.1:5007/federation/users/alice",
      );
      assert.equal(
        getInboxUrl("alice"),
        "http://127.0.0.1:5007/federation/users/alice/inbox",
      );
      assert.equal(
        getKeyBundleUrl("alice"),
        "http://127.0.0.1:5007/federation/users/alice/keys",
      );
      assert.equal(
        getActivityUrl("msg-123"),
        "http://127.0.0.1:5007/federation/activities/msg-123",
      );
    },
  );
});
