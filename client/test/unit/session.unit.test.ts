import { describe, expect, test, vi } from "vitest";
import { makeSessionTools } from "../../src/app/session";

describe("session controller", () => {
  test("it bootstraps the saved session when /auth/me works", async () => {
    // set up a fake api and fake desktop chat
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

    // try the restore now
    const user = await controller.restore("http://127.0.0.1:5001");

    // make sure the user came back and local setup happened
    expect(user?.username).toBe("alice");
    expect(desktopChat.setServerUrl).toHaveBeenCalledWith("http://127.0.0.1:5001");
    expect(desktopChat.setUpUser).toHaveBeenCalledWith({
      serverUrl: "http://127.0.0.1:5001",
      userId: "u1",
      username: "alice",
    });
  });

  test("it logs out again if login bootstrap fails", async () => {
    // this time the local setup will fail on purpose
    const api = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({}),
    };
    const desktopChat = {
      setServerUrl: vi.fn().mockResolvedValue(undefined),
      setUpUser: vi.fn().mockRejectedValue(new Error("bootstrap failed")),
    };
    const controller = makeSessionTools({ api, desktopChat });

    // the login finish step should throw here
    await expect(
      controller.completeLogin("http://127.0.0.1:5001", {
        id: "u1",
        username: "alice",
        createdAt: "2026-05-03T00:00:00.000Z",
      }),
    ).rejects.toThrow("bootstrap failed");

    // after that it should try to log out again
    expect(api.post).toHaveBeenCalledWith("/auth/logout");
  });
});
