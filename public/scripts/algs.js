import { ed25519 } from 'https://esm.sh/@noble/curves@1.2.0/ed25519';
class algs{
    //generate ECDSA keys, save them to locastorage, leave textToSign emtpy no sign the public key
    static async generateEd25519Keypair(){
        //generate keypair
        const keyPair = await crypto.subtle.generateKey(
            {
                name: "Ed25519"
            },
            true,
            ["sign", "verify"],
        );
        //export private and public keys
        const privateKey = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
        const publicKey = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
        //return the keys
        return [publicKey, privateKey]
    }

    static async generateX25519Keypair(){
        try{
            //generate keypair
            const keyPair = await crypto.subtle.generateKey(
                {
                    name: "X25519",
                },
                true,
                ["deriveBits"],
            );
            //export the keys and return to user
            const privateKey = await  crypto.subtle.exportKey("jwk", keyPair.privateKey);
            const publicKey = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
            return [publicKey, privateKey];
        }catch(err){
            alert("Browser unsupported! Try firefox or chromium")
        }
    }

    static async sign(textToSign, key){
        //import the public key so it can be used to sign
        const keyImported = await crypto.subtle.importKey(
            "jwk",
            key,
            {
                name: "Ed25519"
            },
            true,
            ["sign"]
        );
        const thingToSign = new TextEncoder().encode(JSON.stringify(textToSign));
        const signedText = await crypto.subtle.sign(
            {
                name: "Ed25519"
            },
            keyImported,
            thingToSign
        )
        const signatureArray = Array.from(new Uint8Array(signedText))
        return btoa(String.fromCharCode.apply(null, signatureArray));
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

export default algs;