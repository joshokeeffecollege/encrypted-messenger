// These are the small helper tests for the client.
// Just checking the handle text looks right.

import { describe, expect, test } from "vitest";
import { makeUserHandle } from "../../src/shared/user-handle";

describe("unit tests", () => {
  test("it adds the server name onto a local username", () => {
    expect(makeUserHandle("alice", "http://127.0.0.1:5001")).toBe(
      "alice@127.0.0.1:5001",
    );
  });

  test("it leaves remote handles alone", () => {
    expect(makeUserHandle("bob@example.com", "http://127.0.0.1:5001")).toBe(
      "bob@example.com",
    );
  });

  test("it gives back an empty string if there is no username", () => {
    expect(makeUserHandle("", "http://127.0.0.1:5001")).toBe("");
  });
});
