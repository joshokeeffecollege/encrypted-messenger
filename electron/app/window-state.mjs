import { cleanServerUrl } from "../server/server-url.mjs";

export function createWindowState(defaultServerUrl) {
  const serverUrlsByWindow = new Map();

  return {
    getWindowServerUrl(sender) {
      return serverUrlsByWindow.get(sender.id) ?? defaultServerUrl;
    },

    getWindowServerUrlById(id) {
      return serverUrlsByWindow.get(id) ?? defaultServerUrl;
    },

    syncSenderServerUrl(sender, serverUrl) {
      serverUrlsByWindow.set(sender.id, cleanServerUrl(serverUrl));
    },

    forgetWindow(id) {
      serverUrlsByWindow.delete(id);
    },
  };
}
