import { prisma } from "../app/database.js";

export interface PublicKeyBundleInput {
  registrationId: number;
  identityKey: string;
  signedPreKey: {
    id: number;
    publicKey: string;
    signature: string;
  };
  kyberPreKey: {
    id: number;
    publicKey: string;
    signature: string;
  };
  preKeys: {
    id: number;
    publicKey: string;
  }[];
}

export interface PublicKeyBundleResponse extends PublicKeyBundleInput {
  username: string;
}

// only public keys go in the server db
export async function savePublicKeys(
  userId: string,
  keyBundle: PublicKeyBundleInput,
): Promise<void> {
  await prisma.userKeyBundle.upsert({
    where: { userId },
    update: {
      registrationId: keyBundle.registrationId,
      identityKey: keyBundle.identityKey,
      signedPreKeyId: keyBundle.signedPreKey.id,
      signedPreKeyPublic: keyBundle.signedPreKey.publicKey,
      signedPreKeySignature: keyBundle.signedPreKey.signature,
      kyberPreKeyId: keyBundle.kyberPreKey.id,
      kyberPreKeyPublic: keyBundle.kyberPreKey.publicKey,
      kyberPreKeySignature: keyBundle.kyberPreKey.signature,
      preKeysJson: JSON.stringify(keyBundle.preKeys),
    },
    create: {
      userId,
      registrationId: keyBundle.registrationId,
      identityKey: keyBundle.identityKey,
      signedPreKeyId: keyBundle.signedPreKey.id,
      signedPreKeyPublic: keyBundle.signedPreKey.publicKey,
      signedPreKeySignature: keyBundle.signedPreKey.signature,
      kyberPreKeyId: keyBundle.kyberPreKey.id,
      kyberPreKeyPublic: keyBundle.kyberPreKey.publicKey,
      kyberPreKeySignature: keyBundle.kyberPreKey.signature,
      preKeysJson: JSON.stringify(keyBundle.preKeys),
    },
  });
}

export async function getPublicKeys(
  username: string,
): Promise<PublicKeyBundleResponse | null> {
  // load saved public keys for one user
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
    kyberPreKey: {
      id: user.keyBundle.kyberPreKeyId,
      publicKey: user.keyBundle.kyberPreKeyPublic,
      signature: user.keyBundle.kyberPreKeySignature,
    },
    preKeys: JSON.parse(user.keyBundle.preKeysJson) as {
      id: number;
      publicKey: string;
    }[],
  };
}
