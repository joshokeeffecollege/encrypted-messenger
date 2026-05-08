// These are the small helper tests.
// Just checking the basic server url stuff works.

import test from "node:test";
import assert from "node:assert/strict";
import {
  getActivityUrl,
  getActorUrl,
  getInboxUrl,
  getKeyBundleUrl,
  getLocalHandle,
  getServerBaseUrl,
  getServerHost,
} from "../../dist/app/config.js";

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

test("uses the public base url if it is there", () => {
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

test("uses the port if there is no public base url", () => {
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

test("builds the federation urls from the current server url", () => {
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
