import { useEffect, useState } from "react";
import {
  cleanServerUrl,
  getServerUrl,
  setServerUrl as saveServerUrl,
} from "../api/http.ts";
import type { AuthUser } from "../auth/userTypes.ts";
import { sessionTools } from "./sessionTools.ts";

export function useSession() {
  // This hook keeps all top-level auth and server selection state in one place.
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [serverUrlInput, setServerUrlInput] = useState(() => getServerUrl());

  const serverUrl = cleanServerUrl(serverUrlInput);

  useEffect(() => {
    let isActive = true;

    // If there is no server yet, we stop early and show the auth screen.
    if (!serverUrl) {
      setUser(null);
      setLoading(false);
      return () => {
        isActive = false;
      };
    }

    setLoading(true);

    // This asks the server who is logged in and then restores local desktop setup.
    void sessionTools
      .restore(serverUrl)
      .then((authUser) => {
        if (isActive) {
          setUser(authUser);
        }
      })
      .finally(() => {
        if (isActive) {
          setLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [serverUrl]);

  function handleServerUrlChange(value: string) {
    // We save the typed server so the app remembers it after restart.
    setServerUrlInput(value);
    saveServerUrl(value);
  }

  async function handleLoginSuccess(authUser: AuthUser) {
    // Login form calls this after the server accepts the username/password.
    const loggedInUser = await sessionTools.completeLogin(serverUrl, authUser);
    setUser(loggedInUser);
  }

  async function handleLogout() {
    // Even if the network logout fails, we still clear the local UI state.
    try {
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
