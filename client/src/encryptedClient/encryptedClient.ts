import { apiGet, apiPost } from "../api/http";
import type { PublicKeyBundle } from "./keyManager";

export interface PublicKeyBundleResponse extends PublicKeyBundle {
  username: string;
}

export async function uploadKeyBundle(bundle: PublicKeyBundle): Promise<void> {
  await apiPost("/keys/bundle", bundle);
}

export async function fetchKeyBundle(
  username: string,
): Promise<PublicKeyBundleResponse> {
  return apiGet<PublicKeyBundleResponse>(
    `/keys/${encodeURIComponent(username)}`,
  );
}
