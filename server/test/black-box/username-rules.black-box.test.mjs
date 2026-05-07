import test from "node:test";
import assert from "node:assert/strict";
import { isValidLocalUsername } from "../../dist/auth/auth-routes.js";

test("normal usernames are fine", () => {
  assert.equal(isValidLocalUsername("alice"), true);
  assert.equal(isValidLocalUsername("bob123"), true);
});

test("user@server names are not allowed as local usernames", () => {
  assert.equal(isValidLocalUsername("alice@example.com"), false);
  assert.equal(isValidLocalUsername("bob@127.0.0.1:5001"), false);
});
