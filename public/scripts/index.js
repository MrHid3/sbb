const socket = io();
const form = document.getElementById('form');
const input = document.getElementById('input');
const messages = document.getElementById('messages');
const id = document.getElementById('id');
const sendTo = document.getElementById('sendTo');

//create account secret
if (localStorage.getItem('account_secret')){

}

const publickKey = JSON.parse(localStorage.getItem('publickKey'));
const privateKey = JSON.parse(localStorage.getItem('privateKey'));
const signedKey = JSON.parse(localStorage.getItem('signedKey'));

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

socket.on('providePreKey', async () => {
    let preKeys;
    //check if prekeys exist in localstorage
    if(localStorage.getItem('preKeys') == null){
        preKeys = [];
    }else{
        preKeys = JSON.parse(localStorage.getItem('preKeys'));
    };
    //generate pair
    const pair = await crypto.subtle.generateKey({
            name: "ECDSA",
            namedCurve: "P-384",
        },
        true,
        ["sign", "verify"],
    );
    //preprocess before sending and storing

})

socket.on('message', data => {
    const item = document.createElement('li');
    item.textContent = data.name + " " + data.message;
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
});