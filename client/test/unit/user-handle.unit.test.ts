// these are small helper tests for the client
// just checking the handle text looks right

import { describe, expect, test } from "vitest";
import { makeUserHandle } from "../../src/shared/user-handle";

describe("unit tests", () => {
  test("it adds the server name onto a local username", () => {
    // try a normal local username here
    expect(makeUserHandle("alice", "http://127.0.0.1:5001")).toBe(
      "alice@127.0.0.1:5001",
    );
  });

  test("it leaves remote handles alone", () => {
    // this already has a server part so it should stay the same
    expect(makeUserHandle("bob@example.com", "http://127.0.0.1:5001")).toBe(
      "bob@example.com",
    );
  });

  test("it gives back an empty string if there is no username", () => {
    // blank input should stay blank
    expect(makeUserHandle("", "http://127.0.0.1:5001")).toBe("");
  });
});
