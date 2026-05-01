export const DEFAULT_DEVICE_ID = 1;

export function cleanId(value) {
  return encodeURIComponent(value);
}

export function bytesToBase64(bytes) {
  return Buffer.from(bytes).toString("base64");
}

export function base64ToBytes(text) {
  return new Uint8Array(Buffer.from(text, "base64"));
}

export function textToBytes(text) {
  return new TextEncoder().encode(text);
}

export function bytesToText(bytes) {
  return new TextDecoder().decode(bytes);
}

export function makeAddressKey(address) {
  return `${address.name()}:${address.deviceId()}`;
}
