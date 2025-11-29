// import * as libsignal from "@signalapp/libsignal-client";

export interface Signal {
    // public key to be pushed to server/users
    publicKey: Uint8Array;

    // private key to be kept locally
    privateKey: Uint8Array;
}

export async function generateIdentity(): Promise<Signal> {
    console.log("Generating Identity...");

    return {
        publicKey: new Uint8Array(),
        privateKey: new Uint8Array(),
    }
}