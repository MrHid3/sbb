class algs{
    //generate ECDSA keys, save them to locastorage, leave textToSign emtpy no sign the public key
    static async generateECDSAKeypair(provideSignature = false, textToSign = ""){
        //generate keypair
        const identityKeyPair = await crypto.subtle.generateKey(
            {
                name: "ECDSA",
                namedCurve: "P-384",
            },
            true,
            ["sign", "verify", "deriveKey", "deriveBits"],
        );
        //export private and public keys
        const identityPrivateKey = await crypto.subtle.exportKey("jwk", identityKeyPair.privateKey);
        const identityPublicKey = await crypto.subtle.exportKey("jwk", identityKeyPair.publicKey);
        //create signed key and
        let signedText;
        const identityPublicKeyEncoded = new TextEncoder().encode(JSON.stringify(identityPublicKey));
        if(provideSignature) {
            if (textToSign == ""){
                signedText = await crypto.subtle.sign(
                    {
                        name: "ECDSA",
                        namedCurve: "P-384",
                        hash: "SHA-256"
                    },
                    identityKeyPair.privateKey,
                    identityPublicKeyEncoded
                );
            }else{
                const textToSignEncoded = new TextEncoder().encode(JSON.stringify(textToSign));
                signedText = await crypto.subtle.sign(
                    {
                        name: "ECDSA",
                        namedCurve: "P-384",
                        hash: "SHA-256"
                    },
                    identityKeyPair.privateKey,
                    textToSignEncoded
                );
            }
            const identitySignedKeyArray = Array.from(new Uint8Array(signedText))
            const identitySignedKeyString = btoa(String.fromCharCode.apply(null, identitySignedKeyArray));
        }
        //return the keys
        return [identityPublicKey, identityPrivateKey, signedText]
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

    static async verifySignature(publicKey, signature, signedText = "") {
        //import the public key so it can be used to verify
        const publicKeyParsed = publicKey;
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
        if(signedText == ""){
            const publicKeyEncoded = new TextEncoder().encode(JSON.stringify(publicKey));
            return await crypto.subtle.verify(
                {
                    name: "ECDSA",
                    namedCurve: "P-384",
                    hash: "SHA-256"
                },
                publicKeyImported,
                algs.base64ToArrayBuffer(signature),
                publicKeyEncoded
            )
        }else{
            const textEncoded = new TextEncoder().encode(JSON.stringify(signedText));
            return await crypto.subtle.verify(
                {
                    name: "ECDSA",
                    namedCurve: "P-384",
                    hash: "SHA-256"
                },
                publicKeyImported,
                algs.base64ToArrayBuffer(signature),
                textEncoded
            )
        }
    }
}

module.exports = algs;