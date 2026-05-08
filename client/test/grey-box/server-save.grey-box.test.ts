import { beforeEach, describe, expect, test, vi } from "vitest";

describe("grey box tests", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();

    const savedValues = new Map<string, string>();

    vi.stubGlobal("localStorage", {
      getItem(key: string) {
        return savedValues.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        savedValues.set(key, value);
      },
      removeItem(key: string) {
        savedValues.delete(key);
      },
    });
  });

  test("it saves the cleaned server address", async () => {
    const { setServerUrl, getServerUrl } = await import("../../src/app/server");

    setServerUrl("  http://127.0.0.1:5001/  ");

    expect(getServerUrl()).toBe("http://127.0.0.1:5001");
    expect(localStorage.getItem("chat-server-url")).toBe(
      "http://127.0.0.1:5001",
    );
  });

  test("it removes the saved server if the box is blank", async () => {
    const { setServerUrl, getServerUrl } = await import("../../src/app/server");

    setServerUrl("http://127.0.0.1:5001");
    setServerUrl("   ");

    expect(getServerUrl()).toBe("");
    expect(localStorage.getItem("chat-server-url")).toBeNull();
  });
});
