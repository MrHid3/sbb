function userExists() {
    console.log('Username is already taken');
}

document.querySelector('form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.querySelector('input[name="username"]').value;
    const res = await fetch('/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: username,
        })
    })
    if (res == "USEREXISTS")
        userExists();
    else
        window.location.reload();
})