import { beforeEach, describe, expect, test, vi } from "vitest";

describe("grey box tests", () => {
  beforeEach(() => {
    // reset module state before each test
    vi.resetModules();
    vi.restoreAllMocks();

    // make a small fake local storage for these tests
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
    // load the module after stubbing local storage
    const { setServerUrl, getServerUrl } = await import("../../src/app/server");

    // try saving a messy server url
    setServerUrl("  http://127.0.0.1:5001/  ");

    // this test knows about storage but still checks the final saved value
    expect(getServerUrl()).toBe("http://127.0.0.1:5001");
    expect(localStorage.getItem("chat-server-url")).toBe(
      "http://127.0.0.1:5001",
    );
  });

  test("it removes the saved server if the box is blank", async () => {
    // load the server helpers again for this test
    const { setServerUrl, getServerUrl } = await import("../../src/app/server");

    // save one value first then clear it out
    setServerUrl("http://127.0.0.1:5001");
    setServerUrl("   ");

    // both the current value and storage should be blank now
    expect(getServerUrl()).toBe("");
    expect(localStorage.getItem("chat-server-url")).toBeNull();
  });
});
