import { describe, expect, test } from "vitest";
import { makeUserHandle } from "../../src/shared/user-handle";

describe("black box tests", () => {
  test("normal local names come back as user@server", () => {
    // just check the text result a user would see
    expect(makeUserHandle("charlie", "https://chat.example.com")).toBe(
      "charlie@chat.example.com",
    );
  });

  test("a remote name stays the same", () => {
    // this should not get changed if it already looks complete
    expect(makeUserHandle("dana@other.example.com", "https://chat.example.com")).toBe(
      "dana@other.example.com",
    );
  });
});
