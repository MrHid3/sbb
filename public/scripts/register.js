//register user
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
            identityPublicKey: localStorage.getItem('identityPublicKey'),
            identitySignedKey: localStorage.getItem('identitySignedKey'),
        })
    })
    if (res == "USERNAMETAKEN")
        userExists();
    else if (res == "WRONGSIGNATURE")
        wrongSignature();
    else
        window.location.href = "/";
})

//generate ECDSA keys, save them to locastorage
const createKeys = async () => {
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
    //create signed key and prepare it for storage
    const identityPublicKeyEncoded = new TextEncoder().encode(JSON.stringify(identityPublicKey));
    const identitySignedKey = await crypto.subtle.sign(
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
    //save them all to localstorage
    localStorage.setItem('identityPrivateKey', JSON.stringify(identityPrivateKey));
    localStorage.setItem('identityPublicKey', JSON.stringify(identityPublicKey));
    localStorage.setItem('identitySignedKey', identitySignedKeyString);
}

//need to do this to make the signature usable after retrieving it from localstorage
function base64ToArrayBuffer(string) {
    const binaryString = atob(string);
    const uint8Array = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
    }
    return uint8Array.buffer;
}
//execute when USERNAMETAKEN is returned
function userExists() {
    console.log('Username is already taken');
}
//execute when WRONGSIGNATURE is returned
function wrongSignature() {
    console.log("Don't even try it");
}