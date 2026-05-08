import { BrowserWindow, ipcMain } from "electron";

function shortenText(value, maxLength = 48) {
  if (!value) {
    return "";
  }

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}...`;
}

function sendAllDebugLogs(sender, events, sendDebugLog) {
  // send debug events one by one
  for (const event of events) {
    sendDebugLog(sender, event);
  }
}

function getSenderWindowTitle(event) {
  // used in debug logs so we know which window sent it
  const mainWindow = BrowserWindow.fromWebContents(event.sender);
  return mainWindow?.getTitle() ?? "Encrypted Messenger";
}

function isServerUnreachableError(error) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes("Failed to retrieve key bundle") ||
    message.includes("fetch failed") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ENOTFOUND")
  );
}

export function registerChatIpc({
  chatService,
  fetchForEvent,
  getPeerKeys,
  isNotFoundError,
  refreshKeyBundleInBackground,
  sendDebugLog,
  syncSenderServerUrl,
}) {
  // inbox list request
  ipcMain.handle("chat:loadInbox", async (event, data) => {
    // keep this window pointed at the chosen server
    syncSenderServerUrl(event.sender, data.serverUrl);
    // fetch encrypted inbox data from the server
    const inbox = await fetchForEvent(event, "/inbox");

    return chatService.loadInbox({
      serverUrl: data.serverUrl,
      userId: data.userId,
      messages: inbox,
    });
  });

  // one full chat request
  ipcMain.handle("chat:loadChat", async (event, data) => {
    // load all encrypted messages first then local code filters them
    syncSenderServerUrl(event.sender, data.serverUrl);
    const inbox = await fetchForEvent(event, "/inbox");
    // local chat code decrypts what belongs in this thread
    const result = await chatService.loadChat({
      serverUrl: data.serverUrl,
      userId: data.userId,
      username: data.username,
      peerUsername: data.peerUsername,
      messages: inbox,
    });

    if (
      result.debugEvents.some(
        (debugEvent) =>
          debugEvent.stage === "message" &&
          debugEvent.action === "decrypt" &&
          debugEvent.result === "success" &&
          debugEvent.messageType === "prekey",
      )
    ) {
      // prekey decrypt means our bundle might need upload again
      refreshKeyBundleInBackground(event, data);
    }

    sendAllDebugLogs(event.sender, result.debugEvents, sendDebugLog);
    // renderer only needs the final chat messages
    return result.messages;
  });

  // check if the other user exists and has keys
  ipcMain.handle("chat:checkPeer", async (event, data) => {
    syncSenderServerUrl(event.sender, data.serverUrl);

    try {
      // if keys exist we treat that user as ready to chat
      const peerBundle = await getPeerKeys(event, data.peerUsername);

      return {
        found: true,
        username: peerBundle.username ?? data.peerUsername,
      };
    } catch (error) {
      if (isNotFoundError(error)) {
        // make the missing user error nicer for the ui
        throw new Error(`Could not find ${data.peerUsername} on this server.`);
      }

      if (isServerUnreachableError(error)) {
        throw new Error("The requested server is currently unreachable.");
      }

      throw error;
    }
  });

  // send one message after local encrypt
  ipcMain.handle("chat:sendChat", async (event, data) => {
    syncSenderServerUrl(event.sender, data.serverUrl);
    // need the other users keys before we can encrypt
    let peerBundle;

    try {
      peerBundle = await getPeerKeys(event, data.peerUsername);
    } catch (error) {
      if (!isNotFoundError(error)) {
        if (isServerUnreachableError(error)) {
          throw new Error("The requested server is currently unreachable.");
        }

        throw error;
      }

      // first message cant happen if no bundle exists yet
      throw new Error(
        `No key bundle is available for @${data.peerUsername}. They need to sign in first.`,
      );
    }

    const result = await chatService.sendChat({
      // electron encrypts then server stores the encrypted message
      serverUrl: data.serverUrl,
      userId: data.userId,
      peerUsername: data.peerUsername,
      plaintext: data.plaintext,
      peerBundle,
      saveEncryptedMessage: (messageData) =>
        fetchForEvent(event, "/inbox/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(messageData),
        }),
    });

    sendDebugLog(event.sender, {
      // this is just for the debug console
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
