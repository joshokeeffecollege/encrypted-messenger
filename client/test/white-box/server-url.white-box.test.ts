// these are white box tests
// these know about the cleanup branches in the url helper

import { describe, expect, test } from "vitest";
import { cleanServerUrl } from "../../src/app/server";

describe("white box tests", () => {
  test("it trims spaces and removes the slash at the end", () => {
    // this one hits the trim and slash cleanup path
    expect(cleanServerUrl("  http://127.0.0.1:5001/  ")).toBe(
      "http://127.0.0.1:5001",
    );
  });

  test("it keeps the url if there is no slash at the end", () => {
    // this one should mostly pass through as it is
    expect(cleanServerUrl("http://127.0.0.1:5001")).toBe(
      "http://127.0.0.1:5001",
    );
  });

  test("it turns blank input into a blank string", () => {
    // blank text should stay blank after cleanup
    expect(cleanServerUrl("   ")).toBe("");
  });
});
