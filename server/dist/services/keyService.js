import { prisma } from "../db/prisma.js";
export async function saveUserKeyBundle(userId, keyBundle) {
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
        preKeys: JSON.parse(user.keyBundle.preKeysJson),
    };
}
