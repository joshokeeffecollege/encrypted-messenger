import { prisma } from "../db/prisma.js";
export async function saveUserKeyBundle(userId, keyBundle) {
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
export async function getUserKeyBundleByUsername(username) {
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
        preKeys: JSON.parse(user.keyBundle.preKeysJson),
    };
}
