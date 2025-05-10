const socket = io();
const form = document.getElementById('form');
const input = document.getElementById('input');
const messages = document.getElementById('messages');
const id = document.getElementById('id');
const sendTo = document.getElementById('sendTo');

//create account secret
if (!localStorage.getItem('account_secret')){
    const s = async () => {
        let account_secret = await window.crypto.subtle.generateKey(
            {
                name: "HMAC",
                hash: {name: "SHA-512"},
            },
            true,
            ["sign", "verify"],
        );
        let exported = await crypto.subtle.exportKey("jwk", account_secret);
        localStorage.setItem('account_secret', JSON.stringify(exported.k));
        console.log(exported);
    }
    s();
}

form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input.value) {
        socket.emit('message', {
            sendTo: sendTo.value,
            message: input.value
        });
        input.value = '';
    }
});

socket.on('message', data => {
    const item = document.createElement('li');
    item.textContent = data.name + " " + data.message;
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
});


