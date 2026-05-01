import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createChatService } from "./chat/chat-service.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged;
let chatService;
const serverUrlsByWindow = new Map();

// Main Electron file.
// This sits in the middle between the React app and the local chat code.

function shortenText(value, maxLength = 48) {
  if (!value) {
    return "";
  }

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}...`;
}

function getArgValue(flagName) {
  const index = process.argv.indexOf(flagName);

  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

function getPartitionName() {
  return getArgValue("--partition") ?? "messenger-default";
}

function getWindowTitle() {
  return (
    getArgValue("--title") ?? `Encrypted Messenger (${getPartitionName()})`
  );
}

function getRendererPort() {
  return getArgValue("--renderer-port") ?? "5173";
}

function getRendererUrl() {
  return `http://127.0.0.1:${getRendererPort()}`;
}

function getServerBaseUrl() {
  return (
    getArgValue("--server-url") ??
    process.env.SERVER_BASE_URL ??
    "http://127.0.0.1:5001"
  );
}

function cleanServerUrl(value) {
  return value.trim().replace(/\/+$/, "");
}

function getWindowServerUrl(sender) {
  return serverUrlsByWindow.get(sender.id) ?? getServerBaseUrl();
}

async function readJson(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  return JSON.parse(text);
}

// We use each window's own cookies so logins stay seperate from each other.
async function fetchFromServer(sender, pathName, options = {}) {
  const serverBaseUrl = getWindowServerUrl(sender);
  const cookies = await sender.session.cookies.get({ url: serverBaseUrl });
  const cookieHeader = cookies
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
  const headers = new Headers(options.headers ?? {});

  if (cookieHeader) {
    headers.set("Cookie", cookieHeader);
  }

  const response = await sender.session.fetch(`${serverBaseUrl}${pathName}`, {
    ...options,
    headers,
  });
  const data = await readJson(response);

  if (!response.ok) {
    const error = new Error(
      data?.error ?? `HTTP ${response.status} ${response.statusText}`,
    );

    error.status = response.status;
    throw error;
  }

  return data;
}

function getSenderWindowTitle(event) {
  const mainWindow = BrowserWindow.fromWebContents(event.sender);
  return mainWindow?.getTitle() ?? "Encrypted Messenger";
}

async function logOutWindow(mainWindow) {
  if (mainWindow.isDestroyed()) {
    return;
  }

  const serverBaseUrl =
    serverUrlsByWindow.get(mainWindow.webContents.id) ?? getServerBaseUrl();
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
  } catch {
    // If the logout call misses during shutdown, clearing cookies still helps.
  }

  try {
    await mainWindow.webContents.session.clearStorageData({
      storages: ["cookies"],
    });
  } catch {
    // Best effort is enough here.
  }
}

function sendDebugLog(sender, event) {
  if (!isDev) {
    return;
  }

  sender.send("crypto:debug", {
    timestamp: new Date().toISOString(),
    ...event,
  });
}

function registerIpcHandlers() {
  ipcMain.handle("chat:setServerUrl", async (event, serverUrl) => {
    serverUrlsByWindow.set(event.sender.id, cleanServerUrl(serverUrl));
  });

  ipcMain.handle("chat:setUpUser", async (event, data) => {
    serverUrlsByWindow.set(event.sender.id, cleanServerUrl(data.serverUrl));
    const bundle = await chatService.setUpUser(data);

    sendDebugLog(event.sender, {
      stage: "keys",
      action: "setUpUser",
      userId: data.userId,
      username: data.username,
      registrationId: bundle.registrationId,
      identityKeyPreview: shortenText(bundle.identityKey),
      signedPreKeyId: bundle.signedPreKey.id,
      kyberPreKeyId: bundle.kyberPreKey.id,
      preKeyCount: bundle.preKeys.length,
    });

    await fetchFromServer(event.sender, "/keys/bundle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bundle),
    });

    sendDebugLog(event.sender, {
      stage: "keys",
      action: "saveBundleToServer",
      userId: data.userId,
      username: data.username,
      registrationId: bundle.registrationId,
    });
  });

  ipcMain.handle("chat:loadInbox", async (event, data) => {
    serverUrlsByWindow.set(event.sender.id, cleanServerUrl(data.serverUrl));
    const inbox = await fetchFromServer(event.sender, "/inbox");

    return chatService.loadInbox({
      userId: data.userId,
      messages: inbox,
    });
  });

  ipcMain.handle("chat:loadChat", async (event, data) => {
    serverUrlsByWindow.set(event.sender.id, cleanServerUrl(data.serverUrl));
    const inbox = await fetchFromServer(event.sender, "/inbox");
    const result = await chatService.loadChat({
      userId: data.userId,
      peerUsername: data.peerUsername,
      messages: inbox,
    });

    for (const debugEvent of result.debugEvents) {
      sendDebugLog(event.sender, debugEvent);
    }

    return result.messages;
  });

  ipcMain.handle("chat:checkPeer", async (event, data) => {
    serverUrlsByWindow.set(event.sender.id, cleanServerUrl(data.serverUrl));

    try {
      const peerBundle = await fetchFromServer(
        event.sender,
        `/keys/${encodeURIComponent(data.peerUsername)}`,
      );

      return {
        found: true,
        username: peerBundle.username ?? data.peerUsername,
      };
    } catch (error) {
      if (error instanceof Error && "status" in error && error.status === 404) {
        throw new Error(`Could not find ${data.peerUsername} on this server.`);
      }

      throw error;
    }
  });

  ipcMain.handle("chat:sendChat", async (event, data) => {
    serverUrlsByWindow.set(event.sender.id, cleanServerUrl(data.serverUrl));
    let peerBundle;

    try {
      peerBundle = await fetchFromServer(
        event.sender,
        `/keys/${encodeURIComponent(data.peerUsername)}`,
      );
    } catch (error) {
      if (error.status !== 404) {
        throw error;
      }

      throw new Error(
        `No key bundle is available for @${data.peerUsername}. They need to sign in first.`,
      );
    }

    const result = await chatService.sendChat({
      userId: data.userId,
      peerUsername: data.peerUsername,
      plaintext: data.plaintext,
      peerBundle,
      saveEncryptedMessage: (messageData) =>
        fetchFromServer(event.sender, "/inbox/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(messageData),
        }),
    });

    sendDebugLog(event.sender, {
      stage: "message",
      action: "encrypt",
      userId: data.userId,
      windowTitle: getSenderWindowTitle(event),
      peerUsername: data.peerUsername,
      sessionBootstrap: result.debug.sessionBootstrap,
      messageType: result.debug.messageType,
      plaintextPreview: shortenText(result.debug.plaintext),
      plaintextLength: result.debug.plaintextLength,
      ciphertextPreview: result.debug.ciphertext,
      ciphertextLength: result.debug.ciphertextLength,
      senderRegistrationId: result.debug.senderRegistrationId,
    });

    return result.message;
  });
}

function createWindow() {
  const partitionName = getPartitionName();
  const title = getWindowTitle();
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
      additionalArguments: [`--server-url=${getServerBaseUrl()}`],
    },
  });

  mainWindow.on("close", (event) => {
    if (isCleaningUp) {
      return;
    }

    event.preventDefault();
    isCleaningUp = true;

    void logOutWindow(mainWindow).finally(() => {
      serverUrlsByWindow.delete(mainWindow.webContents.id);
      mainWindow.destroy();
    });
  });

  if (isDev) {
    mainWindow.loadURL(getRendererUrl());
    mainWindow.webContents.openDevTools({ mode: "detach" });

    mainWindow.webContents.once("did-finish-load", () => {
      sendDebugLog(mainWindow.webContents, {
        stage: "app",
        action: "window-ready",
        partition: partitionName,
        title,
      });
    });

    return;
  }

  mainWindow.loadFile(path.join(__dirname, "../client/dist/index.html"));
}

app.whenReady().then(() => {
  chatService = createChatService({
    dataDir: app.getPath("userData"),
  });

  registerIpcHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
