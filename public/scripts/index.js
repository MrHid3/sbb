import algs from "./algs.js"

const socket = io({
    withCredentials: true //send cookies
});
const form = document.getElementById('form');
const input = document.getElementById('input');
const messages = document.getElementById('messages');
const id = document.getElementById('id');
const sendTo = document.getElementById('sendTo');

//TODO: logout if any of these is missing
const publicKey = JSON.parse(localStorage.getItem('publicKey'));
const privateKey = JSON.parse(localStorage.getItem('privateKey'));
const signedKey = JSON.parse(localStorage.getItem('signedKey'));
const username = JSON.parse(localStorage.getItem('username'));

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

//provide prekeys if requested by server
socket.on('providePreKey', async (preKeyNumber) => {
    let preKeys;
    //check if prekeys exist in localstorage
    if(localStorage.getItem('preKeys') == null){
        preKeys = [null, null, null, null];
    }else{
        preKeys = JSON.parse(localStorage.getItem('preKeys'));
    }
    const [publicPreKey, privatePreKey, _] = await algs.generateECDSAKeypair();
    preKeys[preKeyNumber] = privatePreKey;
    localStorage.setItem('preKeys', JSON.stringify(preKeys));

    socket.emit('providePreKey', publicPreKey);
})

socket.on('message', data => {
    const item = document.createElement('li');
    item.textContent = data.name + " " + data.message;
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
});