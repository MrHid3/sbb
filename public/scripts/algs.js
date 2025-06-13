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
            alert("Browser not supported! Try firefox or chromium")
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

    static async X3DH(myIdentityPrivate, myEphemeralPrivate, theirIdentityPublic, theirPrekeyPublic, theirOneTimePublic){
        const mIPK = await crypto.subtle.importKey(
            "jwk",
            myIdentityPrivate,
            {name: "X25519"},
            true,
            ["deriveBits"]
        )
        const mEK = await crypto.subtle.importKey(
            "jwk",
            myEphemeralPrivate,
            { name: "X25519" },
            true,
            ["deriveBits"]
        );
        const tIPK = await crypto.subtle.importKey(
            "jwk",
            theirIdentityPublic,
            { name: "X25519" },
            true,
            [] //this must be empty (cryptography bullshit)
        );
        const tSPK = await crypto.subtle.importKey(
            "jwk",
            theirPrekeyPublic,
            { name: "X25519" },
            true,
            [] //this must be empty (cryptography bullshit)
        )
        let tOTK
        if(theirOneTimePublic != null){
            tOTK = await crypto.subtle.importKey(
                "jwk",
                theirOneTimePublic,
                { name: "X25519" },
                true,
                []
            )
        }
        const DH1 = await crypto.subtle.deriveBits(
            {
                name: "X25519",
                public: tSPK
            },
            mIPK,
            256
        );
        const DH2 = await crypto.subtle.deriveBits(
            {
                name: "X25519",
                public: tIPK
            },
            mEK,
            256
        );
        const DH3 = await crypto.subtle.deriveBits(
            {
                name: "X25519",
                public: tSPK
            },
            mEK,
            256
        );
        let DH4 = null;
        if(theirOneTimePublic){
            DH4 = await crypto.subtle.deriveBits(
                {
                    name: "X25519",
                    public: tOTK
                },
                mEK,
                256
            );
        }
        //combine the fuckers
        let combinedSecrets
        if(theirOneTimePublic != null){
            combinedSecrets = new Uint8Array([
                ...new Uint8Array(DH1),
                ...new Uint8Array(DH2),
                ...new Uint8Array(DH3),
                ...new Uint8Array(DH4)
            ]);
        }else{
            combinedSecrets = new Uint8Array([
                ...new Uint8Array(DH1),
                ...new Uint8Array(DH2),
                ...new Uint8Array(DH3)
            ]);
        }

        //some cryptography magic
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            combinedSecrets,
            { name: 'HKDF' },
            false,
            ['deriveBits']
        );

        return await crypto.subtle.deriveBits(
            {
                name: 'HKDF',
                salt: new Uint8Array(0),
                info: new Uint8Array(0),
                hash: 'SHA-256'
            },
            keyMaterial,
            256
        );
    }

    static async X3DH2theX3DHing(myIdentityPrivate, myPrekeyPrivate, myOneTimePrivate, theirEphemeralPublic, theirIdentityPublic) {
        console.log(0)
        const mIPK = await crypto.subtle.importKey(
            "jwk",
            myIdentityPrivate,
            {name: "X25519"},
            true,
            ["deriveBits"]
        );
        console.log("a")
        const mSPK = await crypto.subtle.importKey(
            "jwk",
            myPrekeyPrivate,
            {name: "X25519"},
            true,
            ["deriveBits"]
        );
        console.log("b")
        const tEP = await crypto.subtle.importKey(
            "jwk",
            theirEphemeralPublic,
            {name: "X25519"},
            true,
            []
        );
        console.log("c")
        const tIPK = await crypto.subtle.importKey(
            "jwk",
            theirIdentityPublic,
            {name: "X25519"},
            true,
            []
        );
        let mOTK;
        console.log(1)
        if (myOneTimePrivate != null) {
            mOTK = await crypto.subtle.importKey(
                "jwk",
                myOneTimePrivate,
                {name: "X25519"},
                true,
                ["deriveBits"]
            );
        }
        console.log(2)
        const DH1 = await crypto.subtle.deriveBits(
            {
                name: "X25519",
                public: tIPK
            },
            mSPK,
            256
        );
        console.log(3)
        const DH2 = await crypto.subtle.deriveBits(
            {
                name: "X25519",
                public: tEP
            },
            mIPK,
            256
        );
        console.log(4)
        const DH3 = await crypto.subtle.deriveBits(
            {
                name: "X25519",
                public: tEP
            },
            mSPK,
            256
        );
        console.log(5)
        let DH4 = null;
        if (myOneTimePrivate != null) {
            DH4 = await crypto.subtle.deriveBits(
                {
                    name: "X25519",
                    public: tEP
                },
                mOTK,
                256
            );
        }
        console.log(6)
        let combinedSecrets;
        if (myOneTimePrivate != null) {
            combinedSecrets = new Uint8Array([
                ...new Uint8Array(DH1),
                ...new Uint8Array(DH2),
                ...new Uint8Array(DH3),
                ...new Uint8Array(DH4)
            ]);
        } else {
            combinedSecrets = new Uint8Array([
                ...new Uint8Array(DH1),
                ...new Uint8Array(DH2),
                ...new Uint8Array(DH3)
            ]);
        }

        //some cryptography magic
        console.log(7)
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            combinedSecrets,
            {name: 'HKDF'},
            false,
            ['deriveBits']
        );

        return await crypto.subtle.deriveBits(
            {
                name: 'HKDF',
                salt: new Uint8Array(0),
                info: new Uint8Array(0),
                hash: 'SHA-256'
            },
            keyMaterial,
            256
        );
    }
}

export default algs;