import { ipcMain } from "electron";

function shortenText(value, maxLength = 48) {
  if (!value) {
    return "";
  }

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}...`;
}

export function registerSessionIpc({
  chatService,
  fetchForEvent,
  sendDebugLog,
  syncSenderServerUrl,
}) {
  // this uploads the current public keys
  async function uploadCurrentKeyBundle(event, data) {
    const bundle = await chatService.setUpUser({
      userId: data.userId,
      username: data.username,
    });

    await fetchForEvent(event, "/keys/bundle", {
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
  }

  ipcMain.handle("chat:setServerUrl", async (event, serverUrl) => {
    // remember the server for this window
    syncSenderServerUrl(event.sender, serverUrl);
  });

  // this sets up local keys for the user
  ipcMain.handle("chat:setUpUser", async (event, data) => {
    syncSenderServerUrl(event.sender, data.serverUrl);

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

    await fetchForEvent(event, "/keys/bundle", {
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

  return {
    refreshKeyBundleInBackground(event, data) {
      void uploadCurrentKeyBundle(event, data).catch((error) => {
        console.error(
          "Failed to refresh uploaded key bundle after decrypt",
          error,
        );
      });
    },
  };
}
