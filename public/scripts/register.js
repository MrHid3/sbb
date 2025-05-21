import './algs'

//register user
document.querySelector('form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.querySelector('input[name="username"]').value;
    const [identityPublicKey, identityPrivateKey, identitySignedKey] = await generateECDSAKeypair(true);
    const res = await fetch('/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: username,
            identityPublicKey: identityPublicKey,
            identitySignedKey: identitySignedKey
        })
    })
    if (res == "USERNAMETAKEN")
        userExists();
    else if (res == "WRONGSIGNATURE")
        wrongSignature();
    else
        window.location.href = "/";
})

//execute when USERNAMETAKEN is returned
function userExists() {
    console.log('Username is already taken');
}
//execute when WRONGSIGNATURE is returned
function wrongSignature() {
    console.log("Don't even try it");
}