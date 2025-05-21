//generate ECDSA keys, save them to locastorage
async function generateECDSAKeypair(provideSignature){
    //generate keypair
    const identityKeyPair = await crypto.subtle.generateKey(
        {
            name: "ECDSA",
            namedCurve: "P-384",
        },
        true,
        ["sign", "verify"],
    );
    //export private and public keys
    const identityPrivateKey = await crypto.subtle.exportKey("jwk", identityKeyPair.privateKey);
    const identityPublicKey = await crypto.subtle.exportKey("jwk", identityKeyPair.publicKey);
    //create signed key and
    const identityPublicKeyEncoded = new TextEncoder().encode(JSON.stringify(identityPublicKey));
    let identitySignedKey;
    if(provideSignature) {
        identitySignedKey = await crypto.subtle.sign(
            {
                name: "ECDSA",
                namedCurve: "P-384",
                hash: "SHA-256"
            },
            identityKeyPair.privateKey,
            identityPublicKeyEncoded
        );
        const identitySignedKeyArray = Array.from(new Uint8Array(identitySignedKey))
        const identitySignedKeyString = btoa(String.fromCharCode.apply(null, identitySignedKeyArray));
    }
    //return the keys
    return [identityPublicKey, identityPrivateKey, identitySignedKey]
}

//convert sendable/storable signature to one that can be verified
function base64ToArrayBuffer(string) {
    const binaryString = atob(string);
    const uint8Array = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
    }
    return uint8Array.buffer;
}

async function verifySignature(publicKey, signature) {
    //import the public key so it can be used to verify
    const publicKeyParsed = JSON.parse(publicKey);
    const publicKeyEncoded = new TextEncoder().encode(publicKey);
    const publicKeyImported = await crypto.subtle.importKey(
        "jwk",
        publicKeyParsed,
        {
            name: "ECDSA",
            namedCurve: "P-384",
            hash: "SHA-256"
        },
        true,
        ["verify"]
    );
    //verify user's signature
    return await crypto.subtle.verify(
        {
            name: "ECDSA",
            namedCurve: "P-384",
            hash: "SHA-256"
        },
        publicKeyImported,
        base64ToArrayBuffer(signature),
        publicKeyEncoded
    )
}