import { apiGet, apiPost } from "../api/http";
import type { PublicKeyBundle } from "./keyManager";

// fetch and upload public key bundles to the server.
export interface PublicKeyBundleResponse extends PublicKeyBundle {
  username: string;
}

export async function uploadKeyBundle(bundle: PublicKeyBundle): Promise<void> {
  await apiPost("/keys/bundle", bundle);
}

export async function fetchKeyBundle(
  username: string,
): Promise<PublicKeyBundleResponse> {
  return apiGet<PublicKeyBundleResponse>(`/keys/${encodeURIComponent(username)}`);
}
