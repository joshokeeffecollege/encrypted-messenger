import { describe, expect, test } from "vitest";
import { makeUserHandle } from "../../src/shared/user-handle";

describe("black box tests", () => {
  test("normal local names come back as user@server", () => {
    expect(makeUserHandle("charlie", "https://chat.example.com")).toBe(
      "charlie@chat.example.com",
    );
  });

  test("a remote name stays the same", () => {
    expect(makeUserHandle("dana@other.example.com", "https://chat.example.com")).toBe(
      "dana@other.example.com",
    );
  });
});
