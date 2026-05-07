import { describe, expect, test, vi } from "vitest";
import { makeSessionTools } from "../../src/app/sessionTools";

describe("session controller", () => {
  test("it bootstraps the saved session when /auth/me works", async () => {
    const api = {
      get: vi.fn().mockResolvedValue({
        id: "u1",
        username: "alice",
        createdAt: "2026-05-03T00:00:00.000Z",
      }),
      post: vi.fn(),
    };
    const desktopChat = {
      setServerUrl: vi.fn().mockResolvedValue(undefined),
      setUpUser: vi.fn().mockResolvedValue(undefined),
    };
    const controller = makeSessionTools({ api, desktopChat });

    const user = await controller.restore("http://127.0.0.1:5001");

    expect(user?.username).toBe("alice");
    expect(desktopChat.setServerUrl).toHaveBeenCalledWith("http://127.0.0.1:5001");
    expect(desktopChat.setUpUser).toHaveBeenCalledWith({
      serverUrl: "http://127.0.0.1:5001",
      userId: "u1",
      username: "alice",
    });
  });

  test("it logs out again if login bootstrap fails", async () => {
    const api = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({}),
    };
    const desktopChat = {
      setServerUrl: vi.fn().mockResolvedValue(undefined),
      setUpUser: vi.fn().mockRejectedValue(new Error("bootstrap failed")),
    };
    const controller = makeSessionTools({ api, desktopChat });

    await expect(
      controller.completeLogin("http://127.0.0.1:5001", {
        id: "u1",
        username: "alice",
        createdAt: "2026-05-03T00:00:00.000Z",
      }),
    ).rejects.toThrow("bootstrap failed");

    expect(api.post).toHaveBeenCalledWith("/auth/logout");
  });
});
