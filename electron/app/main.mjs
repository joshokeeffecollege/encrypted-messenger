import { app, BrowserWindow } from "electron";
import { createWindow } from "./create-window.mjs";
import { createWindowState } from "./window-state.mjs";
import { createServerFetch } from "../server/server-fetch.mjs";
import {
  getPartitionName,
  getRendererUrl,
  getServerBaseUrl,
  getWindowTitle,
} from "../server/server-url.mjs";
import { createChatService } from "../chat/chat-service.mjs";
import { registerSessionIpc } from "../ipc/session-ipc.mjs";
import { registerChatIpc } from "../ipc/chat-ipc.mjs";

// this is the main electron start file
const isDev = !app.isPackaged;

function sendDebugLog(sender, event) {
  // only show these in dev mode
  if (!isDev) {
    return;
  }

  sender.send("crypto:debug", {
    timestamp: new Date().toISOString(),
    ...event,
  });
}

app.whenReady().then(() => {
  // make the shared bits once when electron starts
  const serverBaseUrl = getServerBaseUrl();
  const chatService = createChatService({
    dataDir: app.getPath("userData"),
  });
  const windowState = createWindowState(serverBaseUrl);
  const serverFetch = createServerFetch(windowState);
  const { refreshKeyBundleInBackground } = registerSessionIpc({
    chatService,
    fetchForEvent: serverFetch.fetchForEvent,
    sendDebugLog,
    syncSenderServerUrl: windowState.syncSenderServerUrl,
  });

  registerChatIpc({
    chatService,
    fetchForEvent: serverFetch.fetchForEvent,
    getPeerKeys: serverFetch.getPeerKeys,
    isNotFoundError: serverFetch.isNotFoundError,
    refreshKeyBundleInBackground,
    sendDebugLog,
    syncSenderServerUrl: windowState.syncSenderServerUrl,
  });

  const openWindow = () =>
    // use the same shared services for each window
    createWindow({
      isDev,
      partitionName: getPartitionName(),
      title: getWindowTitle(),
      rendererUrl: getRendererUrl(),
      serverBaseUrl,
      sendDebugLog,
      windowState,
    });

  // open the first desktop window
  openWindow();

  app.on("activate", () => {
    // mac likes reopening an app when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      openWindow();
    }
  });
});

app.on("window-all-closed", () => {
  // on mac we keep app alive until quit by user
  if (process.platform !== "darwin") {
    app.quit();
  }
});
