function userExists() {
    console.log('Username is already taken');
}

function wrongSignature() {
    console.log("Don't even try it");
}

//generate ECDSA keys, save them to locastorage
const createKeys = async () => {
    const identityKeyPair = await crypto.subtle.generateKey(
        {
            name: "ECDSA",
            namedCurve: "P-384",
        },
        true,
        ["sign", "verify"],
    );
    console.log(identityKeyPair);
    const identityPrivateKey = await crypto.subtle.exportKey("jwk", identityKeyPair.privateKey);
    const identityPublicKey = await crypto.subtle.exportKey("jwk", identityKeyPair.publicKey);
    const encodedIdentityPublicKey = new TextEncoder().encode(JSON.stringify(identityPublicKey));
    const identitySignedKey = await crypto.subtle.sign(
        {
        name: "ECDSA",
        hash: "SHA-256"
        },
        identityKeyPair.privateKey,
        encodedIdentityPublicKey
    );
    const identitySignedKeyArray = Array.from(new Uint8Array(identitySignedKey))
    const identitySignedKeyString = btoa(String.fromCharCode.apply(null, identitySignedKeyArray));
    localStorage.setItem('identityPrivateKey', JSON.stringify(identityPrivateKey));
    localStorage.setItem('identityPublicKey', JSON.stringify(identityPublicKey));
    localStorage.setItem('identitySignedKey', JSON.stringify(identitySignedKeyString));
}

document.querySelector('form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.querySelector('input[name="username"]').value;
    await createKeys();
    const res = await fetch('/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: username,
            identityPublicKey: JSON.stringify(localStorage.getItem('identityPublicKey')),
            identitySignedKey: JSON.stringify(localStorage.getItem('identitySignedKey')),
        })
    })
    if (res == "USEREXISTS")
        userExists();
    else if (res == "WRONGSIGNATURE")
        wrongSignature();
    // else
        // window.location.href = "/";
})