import { useEffect, useState } from "react";
import type { AuthUser } from "../auth/user.ts";
import { desktopChat } from "../chat/desktop-chat.ts";
import { api, cleanServerUrl, getServerUrl, setServerUrl } from "./server.ts";

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
  // tell electron what server we are using then set up keys
  await dependencies.desktopChat.setServerUrl(serverUrl);
  // this makes sure the local device keys are ready too
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
  // these are the main session actions
  return {
    async restore(serverUrl: string) {
      // this tries to bring back the old login
      if (!serverUrl) {
        return null;
      }

      // set the server first so electron talks to the right place
      await dependencies.desktopChat.setServerUrl(serverUrl);

      try {
        // ask the server if this browser already has a login
        const authUser = await dependencies.api.get<AuthUser>("/auth/me");
        await setUpLoggedInUser(dependencies, serverUrl, authUser);
        return authUser;
      } catch {
        // no saved login is fine so just return nothing
        return null;
      }
    },

    async completeLogin(serverUrl: string, authUser: AuthUser) {
      // login on server is already done so now we finish local setup
      try {
        await setUpLoggedInUser(dependencies, serverUrl, authUser);
        return authUser;
      } catch (error) {
        try {
          // undo the server login if local setup breaks
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
      // server clears the login and ui clears itself after
      await dependencies.api.post("/auth/logout");
    },
  };
}

const sessionTools = makeSessionTools();

export function useSession() {
  // this keeps the top level auth state
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  // this keeps the text box value for the server input
  const [serverUrlInput, setServerUrlInput] = useState(() => getServerUrl());

  const serverUrl = cleanServerUrl(serverUrlInput);

  useEffect(() => {
    let isActive = true;

    if (!serverUrl) {
      // no server means no active login to restore
      setUser(null);
      setLoading(false);
      return () => {
        isActive = false;
      };
    }

    setLoading(true);

    // ask the server who is logged in and sync electron too
    void sessionTools
      .restore(serverUrl)
      .then((authUser) => {
        if (isActive) {
          // authUser can be a real user or null
          setUser(authUser);
        }
      })
      .finally(() => {
        if (isActive) {
          // stop the loading spinner when restore is done
          setLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [serverUrl]);

  function handleServerUrlChange(value: string) {
    // update the box and also save it locally
    setServerUrlInput(value);
    setServerUrl(value);
  }

  async function handleLoginSuccess(authUser: AuthUser) {
    // after auth works finish the local desktop setup
    const loggedInUser = await sessionTools.completeLogin(serverUrl, authUser);
    setUser(loggedInUser);
  }

  async function handleLogout() {
    try {
      // try server logout first but still clear ui if it fails
      await sessionTools.logout();
    } catch (error) {
      console.log("Logout error: ", error);
    } finally {
      setUser(null);
    }
  }

  return {
    user,
    loading,
    serverUrl,
    serverUrlInput,
    setServerUrl: handleServerUrlChange,
    onLoginSuccess: handleLoginSuccess,
    onLogout: handleLogout,
  };
}
