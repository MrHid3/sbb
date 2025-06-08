class algs{
    //generate ECDSA keys, save them to locastorage, leave textToSign emtpy no sign the public key
    static async generateECDSAKeypair(provideSignature = false, textToSign = ""){
        //generate keypair
        const identityKeyPair = await crypto.subtle.generateKey(
            {
                name: "Ed25519"
            },
            true,
            ["sign", "verify", "deriveKey", "deriveBits"],
        );
        //export private and public keys
        const identityPrivateKey = await crypto.subtle.exportKey("jwk", identityKeyPair.privateKey);
        const identityPublicKey = await crypto.subtle.exportKey("jwk", identityKeyPair.publicKey);
        //create signed key and
        let thingToSign;
        let signedText;
        let identitySignedKeyString;
        if(provideSignature) {
            if (textToSign == ""){
                thingToSign = new TextEncoder().encode(JSON.stringify(identityPublicKey));
            }else {
                thingToSign = new TextEncoder().encode(JSON.stringify(textToSign));
            }
            signedText = await crypto.subtle.sign(
                {
                    name: "Ed25519"
                },
                identityKeyPair.privateKey,
            )
            const identitySignedKeyArray = Array.from(new Uint8Array(signedText))
            identitySignedKeyString = btoa(String.fromCharCode.apply(null, identitySignedKeyArray));
        }
        //return the keys
        return [identityPublicKey, identityPrivateKey, identitySignedKeyString]
    }

//convert sendable/storable signature to one that can be verified
    static base64ToArrayBuffer(string) {
        const binaryString = atob(string);
        const uint8Array = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            uint8Array[i] = binaryString.charCodeAt(i);
        }
        return uint8Array.buffer;
    }

    static async verifySignature(key, signature, signedText) {
        //import the public key so it can be used to verify
        const keyImported = await crypto.subtle.importKey(
            "jwk",
            key,
            {
                name: "Ed25519"
            },
            true,
            ["verify"]
        );
        //verify user's signature
        const textEncoded = new TextEncoder().encode(JSON.stringify(signedText));
        return await crypto.subtle.verify(
            {
                name: "Ed25519"
            },
            keyImported,
            algs.base64ToArrayBuffer(signature),
            textEncoded
        )
    }
}

module.exports = algs;