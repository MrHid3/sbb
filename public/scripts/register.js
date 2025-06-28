import algs from './algs.js'
//register user
document.querySelector('form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.querySelector('input[name="username"]').value;
    //create public and private keys and prekeys, sign the public prekey
    const [publicPrekey, privatePrekey] = await algs.generateX25519Keypair();
    const [identityPublicKey, identityPrivateKey] = await algs.generateEd25519Keypair();
    const [identityX25519Public, identityX25519Private] = await algs.generateX25519Keypair();
    const signedPrekey = await algs.sign(publicPrekey, identityPrivateKey);
    const signedX25519 = await algs.sign(identityX25519Public, identityPrivateKey);
    const res = await fetch('register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: username,
            identityPublicKey: JSON.stringify(identityPublicKey),
            publicPrekey: JSON.stringify(publicPrekey),
            prekeySignature: JSON.stringify(signedPrekey),
            identityX25519Public: JSON.stringify(identityX25519Public),
            identityX25519signature: JSON.stringify(signedX25519)
        })
    })
    const text = await res.text()
    if (text == "USERNAMETAKEN")
        userExists();
    else if (await text == "WRONGSIGNATURE")
        wrongSignature();
    else if(res.status == 200){
        //save the fuckers to localstorage
        localStorage.setItem('username', JSON.stringify(username));
        localStorage.setItem('publicKey', JSON.stringify(identityPublicKey));
        localStorage.setItem('privateKey', JSON.stringify(identityPrivateKey));
        localStorage.setItem('privatePrekey', JSON.stringify(privatePrekey));
        localStorage.setItem('publicPrekey', JSON.stringify(publicPrekey));
        localStorage.setItem('identityX25519Private', JSON.stringify(identityX25519Private));
        localStorage.setItem('identityX25519Public', JSON.stringify(identityX25519Public));
        localStorage.setItem('preKeys', JSON.stringify([]));
        localStorage.setItem('friends', JSON.stringify([]));
        window.location.href = "/";
    }
})

//execute when USERNAMETAKEN is returned
function userExists() {
    console.log('Username is already taken');
}
//execute when WRONGSIGNATURE is returned
function wrongSignature() {
    console.log("Don't even try it");
}