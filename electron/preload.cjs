const { contextBridge, ipcRenderer } = require("electron");

function getArgValue(flagName) {
  const match = process.argv.find((value) => value.startsWith(`${flagName}=`));
  return match ? match.slice(flagName.length + 1) : null;
}

function shortenEncryptedText(value, maxLength = 80) {
  if (!value) {
    return "";
  }

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}...`;
}

function showDebugLog(event) {
  const time = event.timestamp ? `[${event.timestamp}]` : "";

  if (event.stage === "app" && event.action === "window-ready") {
    console.log(
      `${time} Crypto console ready for ${event.title} (${event.partition})`,
    );
    return;
  }

  if (event.stage === "keys" && event.action === "setUpUser") {
    console.log(`${time} Key bundle ready for user ${event.userId}`);
    console.log(`Identity key: ${event.identityKeyPreview ?? "(hidden)"}`);
    console.log(`Signed pre-key id: ${event.signedPreKeyId}`);
    console.log(`Kyber pre-key id: ${event.kyberPreKeyId}`);
    console.log(`One-time pre-keys: ${event.preKeyCount}`);
    return;
  }

  if (event.stage === "keys" && event.action === "saveBundleToServer") {
    console.log(
      `${time} Public key bundle uploaded for ${event.username} (${event.userId})`,
    );
    return;
  }

  if (event.stage === "message" && event.action === "encrypt") {
    console.log(`${time} Message encrypted for ${event.peerUsername}`);
    console.log(
      `Encrypted message sent: ${shortenEncryptedText(event.ciphertextPreview)}`,
    );
    console.log(`Ciphertext length: ${event.ciphertextLength}`);
    console.log(`Message type: ${event.messageType}`);
    return;
  }

  if (
    event.stage === "message" &&
    event.action === "decrypt" &&
    event.result === "success"
  ) {
    console.log(
      `${time} Encrypted message received: ${shortenEncryptedText(
        event.ciphertextPreview,
      )}`,
    );
    console.log(`Message decrypted: ${event.plaintextPreview}`);
    console.log(`Sender: ${event.senderUsername}`);
    console.log(`Message type: ${event.messageType}`);
    return;
  }

  if (
    event.stage === "message" &&
    event.action === "decrypt" &&
    event.result === "duplicate"
  ) {
    console.warn(
      `${time} Duplicate encrypted message ignored from ${event.senderUsername}`,
    );
    return;
  }

  if (
    event.stage === "message" &&
    event.action === "decrypt" &&
    event.result === "error"
  ) {
    console.error(
      `${time} Failed to decrypt encrypted message from ${event.senderUsername}: ${event.error}`,
    );
    return;
  }

  console.log("[crypto]", event);
}

ipcRenderer.on("crypto:debug", (_event, payload) => {
  showDebugLog(payload);
});

contextBridge.exposeInMainWorld("desktop", {
  isElectron: true,
  serverUrl: getArgValue("--server-url") ?? "",
  pingCryptoDebug() {
    console.log("[crypto] preload bridge is alive");
  },
});

// The renderer only gets a few simple chat functions.
contextBridge.exposeInMainWorld("desktopChat", {
  setServerUrl(serverUrl) {
    return ipcRenderer.invoke("chat:setServerUrl", serverUrl);
  },
  setUpUser(data) {
    return ipcRenderer.invoke("chat:setUpUser", data);
  },
  loadInbox(data) {
    return ipcRenderer.invoke("chat:loadInbox", data);
  },
  checkPeer(data) {
    return ipcRenderer.invoke("chat:checkPeer", data);
  },
  loadChat(data) {
    return ipcRenderer.invoke("chat:loadChat", data);
  },
  sendChat(data) {
    return ipcRenderer.invoke("chat:sendChat", data);
  },
});
