function readServerName(serverUrl: string): string {
  try {
    return new URL(serverUrl).host;
  } catch {
    return serverUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
}

export function makeUserHandle(username: string, serverUrl: string): string {
  if (!username) {
    return "";
  }

  // Remote users already come in as user@server, so we leave them alone.
  if (username.includes("@")) {
    return username;
  }

  const serverName = readServerName(serverUrl);

  if (!serverName) {
    return username;
  }

  return `${username}@${serverName}`;
}
