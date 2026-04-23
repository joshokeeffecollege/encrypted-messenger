import { apiGet, apiPost } from "../api/http";
import type { PublicKeyBundle } from "./keyManager";

export interface PublicKeyBundleResponse {
  username: string;
  registrationId: number;
  identityKey: string;
  signedPreKey: {
    id: number;
    publicKey: string;
    signature: string;
  };
  preKeys: Array<{
    id: number;
    publicKey: string;
  }>;
  kyberPreKey?: {
    id: number;
    publicKey: string;
    signature: string;
  };
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
