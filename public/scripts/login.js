function wrongCredentials() {
    console.log('Wrong credentials');
}

document.querySelector('form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.querySelector('input[name="username"]').value;
    const password = document.querySelector('input[name="password"]').value;
    const res = await fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: username,
            password: password
        })
    })
    if (res == "WRONGCREDENTIALS")
        wrongCredentials();
    else
        window.location.reload();
})