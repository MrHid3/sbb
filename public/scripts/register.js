import algs from './algs.js'

//register user
document.querySelector('form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.querySelector('input[name="username"]').value;
    const [identityPublicKey, identityPrivateKey, identitySignedKey] = await algs.generateECDSAKeypair(true);
    const res = await fetch('register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: username,
            identityPublicKey: JSON.stringify(identityPublicKey),
            identitySignedKey: JSON.stringify(identitySignedKey),
        })
    })
    if (res == "USERNAMETAKEN")
        userExists();
    else if (res == "WRONGSIGNATURE")
        wrongSignature();
    else{
        //save the fuckers to localstorage
        localStorage.setItem('username', JSON.stringify(username));
        localStorage.setItem('publicKey', JSON.stringify(identityPublicKey));
        localStorage.setItem('privateKey', JSON.stringify(identityPrivateKey));
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