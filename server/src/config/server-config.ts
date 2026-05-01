const DEFAULT_PORT = "5001";

function cleanBaseUrl(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function getServerBaseUrl() {
  const fromEnv = process.env.PUBLIC_BASE_URL;

  if (fromEnv) {
    return cleanBaseUrl(fromEnv);
  }

  const port = process.env.PORT || DEFAULT_PORT;
  return `http://127.0.0.1:${port}`;
}

export function getServerHost() {
  return new URL(getServerBaseUrl()).host;
}

export function getLocalHandle(username: string) {
  return `${username}@${getServerHost()}`;
}

export function parseHandle(handleText: string) {
  const trimmed = handleText.trim().replace(/^@/, "");
  const splitAt = trimmed.lastIndexOf("@");

  if (splitAt === -1) {
    return null;
  }

  const username = trimmed.slice(0, splitAt).trim();
  const domain = trimmed.slice(splitAt + 1).trim();

  if (!username || !domain) {
    return null;
  }

  return {
    username,
    domain,
    handle: `${username}@${domain}`,
  };
}

export function isRemoteHandle(handleText: string) {
  const parsed = parseHandle(handleText);

  if (!parsed) {
    return false;
  }

  return parsed.domain !== getServerHost();
}

export function getLocalUsername(nameOrHandle: string) {
  const parsed = parseHandle(nameOrHandle);

  if (!parsed) {
    return nameOrHandle.trim().replace(/^@/, "");
  }

  if (parsed.domain !== getServerHost()) {
    return null;
  }

  return parsed.username;
}

export function getActorUrl(username: string) {
  return `${getServerBaseUrl()}/federation/users/${encodeURIComponent(username)}`;
}

export function getInboxUrl(username: string) {
  return `${getActorUrl(username)}/inbox`;
}

export function getKeyBundleUrl(username: string) {
  return `${getActorUrl(username)}/keys`;
}

export function getMessageUrl(messageId: string) {
  return `${getServerBaseUrl()}/federation/messages/${encodeURIComponent(messageId)}`;
}

export function getActivityUrl(activityId: string) {
  return `${getServerBaseUrl()}/federation/activities/${encodeURIComponent(activityId)}`;
}
