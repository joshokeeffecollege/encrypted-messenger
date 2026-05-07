// These are white box tests.
// These know about the different branches in the server url cleanup code.

import { describe, expect, test } from "vitest";
import { cleanServerUrl } from "../../src/api/http";

describe("white box tests", () => {
  test("it trims spaces and removes the slash at the end", () => {
    expect(cleanServerUrl("  http://127.0.0.1:5001/  ")).toBe(
      "http://127.0.0.1:5001",
    );
  });

  test("it keeps the url if there is no slash at the end", () => {
    expect(cleanServerUrl("http://127.0.0.1:5001")).toBe(
      "http://127.0.0.1:5001",
    );
  });

  test("it turns blank input into a blank string", () => {
    expect(cleanServerUrl("   ")).toBe("");
  });
});
