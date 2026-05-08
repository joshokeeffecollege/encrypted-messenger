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

  // remote names already have the server bit
  if (username.includes("@")) {
    return username;
  }

  const serverName = readServerName(serverUrl);

  if (!serverName) {
    return username;
  }

  return `${username}@${serverName}`;
}
