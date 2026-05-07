import { api } from "../api/http.ts";
import { desktopChat } from "../bridge/desktopChat.ts";
import type { AuthUser } from "../auth/userTypes.ts";

export interface SessionDependencies {
  api: {
    get<T>(path: string): Promise<T>;
    post<T = unknown>(path: string, data?: unknown): Promise<T>;
  };
  desktopChat: {
    setServerUrl(serverUrl: string): Promise<void>;
    setUpUser(data: {
      serverUrl: string;
      userId: string;
      username: string;
    }): Promise<void>;
  };
}

async function setUpLoggedInUser(
  dependencies: SessionDependencies,
  serverUrl: string,
  authUser: AuthUser,
) {
  // This connects the renderer to the chosen server and prepares local keys.
  await dependencies.desktopChat.setServerUrl(serverUrl);
  await dependencies.desktopChat.setUpUser({
    serverUrl,
    userId: authUser.id,
    username: authUser.username,
  });
}

export function makeSessionTools(
  dependencies: SessionDependencies = {
    api,
    desktopChat,
  },
) {
  return {
    async restore(serverUrl: string) {
      // When the app opens, we try to restore the last logged-in user.
      if (!serverUrl) {
        return null;
      }

      await dependencies.desktopChat.setServerUrl(serverUrl);

      try {
        const authUser = await dependencies.api.get<AuthUser>("/auth/me");
        await setUpLoggedInUser(dependencies, serverUrl, authUser);
        return authUser;
      } catch {
        return null;
      }
    },

    async completeLogin(serverUrl: string, authUser: AuthUser) {
      // After login succeeds on the server, we finish the desktop bootstrap here.
      try {
        await setUpLoggedInUser(dependencies, serverUrl, authUser);
        return authUser;
      } catch (error) {
        try {
          await dependencies.api.post("/auth/logout");
        } catch (logoutError) {
          console.error(
            "Failed to roll back login after bootstrap error",
            logoutError,
          );
        }

        throw error;
      }
    },

    async logout() {
      // Logging out is just a server call because the UI clears local state separately.
      await dependencies.api.post("/auth/logout");
    },
  };
}

export const sessionTools = makeSessionTools();
