import { prisma } from "../db/prisma.js";

// storage and retrieval of users' public key bundles.
export interface PublicKeyBundleInput {
  registrationId: number;
  identityKey: string;
  signedPreKey: {
    id: number;
    publicKey: string;
    signature: string;
  };
  preKeys: {
    id: number;
    publicKey: string;
  }[];
}

// public bundle with the owner's username.
export interface PublicKeyBundleResponse extends PublicKeyBundleInput {
  username: string;
}

export async function saveUserKeyBundle(
  userId: string,
  keyBundle: PublicKeyBundleInput,
): Promise<void> {
  // The server stores only public keys.
  await prisma.userKeyBundle.upsert({
    where: { userId },
    update: {
      registrationId: keyBundle.registrationId,
      identityKey: keyBundle.identityKey,
      signedPreKeyId: keyBundle.signedPreKey.id,
      signedPreKeyPublic: keyBundle.signedPreKey.publicKey,
      signedPreKeySignature: keyBundle.signedPreKey.signature,
      preKeysJson: JSON.stringify(keyBundle.preKeys),
    },
    create: {
      userId,
      registrationId: keyBundle.registrationId,
      identityKey: keyBundle.identityKey,
      signedPreKeyId: keyBundle.signedPreKey.id,
      signedPreKeyPublic: keyBundle.signedPreKey.publicKey,
      signedPreKeySignature: keyBundle.signedPreKey.signature,
      preKeysJson: JSON.stringify(keyBundle.preKeys),
    },
  });
}

export async function getUserKeyBundleByUsername(
  username: string,
): Promise<PublicKeyBundleResponse | null> {
  const user = await prisma.user.findUnique({
    where: { username },
    include: { keyBundle: true },
  });

  if (!user || !user.keyBundle) {
    return null;
  }

  return {
    username: user.username,
    registrationId: user.keyBundle.registrationId,
    identityKey: user.keyBundle.identityKey,
    signedPreKey: {
      id: user.keyBundle.signedPreKeyId,
      publicKey: user.keyBundle.signedPreKeyPublic,
      signature: user.keyBundle.signedPreKeySignature,
    },
    preKeys: JSON.parse(user.keyBundle.preKeysJson) as {
      id: number;
      publicKey: string;
    }[],
  };
}
