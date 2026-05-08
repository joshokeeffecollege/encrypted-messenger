import { BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function logOutWindow(mainWindow, serverBaseUrl) {
  // try to log out before the window fully closes
  if (mainWindow.isDestroyed()) {
    return;
  }

  const logoutScript = `
    fetch("${serverBaseUrl}/auth/logout", {
      method: "POST",
      credentials: "include",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: "{}"
    }).catch(() => null);
  `;

  try {
    if (!mainWindow.webContents.isLoadingMainFrame()) {
      await mainWindow.webContents.executeJavaScript(logoutScript, true);
    }
  } catch {}

  try {
    await mainWindow.webContents.session.clearStorageData({
      storages: ["cookies"],
    });
  } catch {}
}

export function createWindow({
  isDev,
  partitionName,
  title,
  rendererUrl,
  serverBaseUrl,
  sendDebugLog,
  windowState,
}) {
  // make one electron window
  let isCleaningUp = false;

  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 860,
    minWidth: 960,
    minHeight: 700,
    title,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      partition: `persist:${partitionName}`,
      additionalArguments: [`--server-url=${serverBaseUrl}`],
    },
  });

  mainWindow.on("close", (event) => {
    // only run cleanup once
    if (isCleaningUp) {
      return;
    }

    event.preventDefault();
    isCleaningUp = true;

    void logOutWindow(
      mainWindow,
      windowState.getWindowServerUrlById(mainWindow.webContents.id),
    ).finally(() => {
      windowState.forgetWindow(mainWindow.webContents.id);
      mainWindow.destroy();
    });
  });

  if (isDev) {
    // in dev load vite and open devtools
    mainWindow.loadURL(rendererUrl);
    mainWindow.webContents.openDevTools({ mode: "detach" });

    mainWindow.webContents.once("did-finish-load", () => {
      sendDebugLog(mainWindow.webContents, {
        stage: "app",
        action: "window-ready",
        partition: partitionName,
        title,
      });
    });

    return mainWindow;
  }

  // in prod load the built client
  mainWindow.loadFile(path.join(__dirname, "../../client/dist/index.html"));
  return mainWindow;
}
