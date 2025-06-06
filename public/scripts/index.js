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


// form.addEventListener('submit', (e) => {
//     e.preventDefault();
//     if (input.value) {
//         socket.emit('message', {
//             sendTo: sendTo.value,
//             message: input.value
//         });
//         input.value = '';
//     }
// });

//search for users
const searchUserForm = document.querySelector('#search-user-form');
const searchUserInput = document.querySelector('#search-user-input');
const userSuggestions = document.querySelector('#user-suggestions');

searchUserInput.addEventListener('input', async (e) => {
    e.preventDefault();
    while(userSuggestions.hasChildNodes())
        userSuggestions.removeChild(userSuggestions.lastChild);
    if(searchUserInput.value !== '') {
        const awaitSuggestions = await fetch("/searchuser", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                query: searchUserInput.value,
            })
        })
        const suggestions = await awaitSuggestions.json()
        if(suggestions.length > 0){
            suggestions.forEach(suggestion => {
                const option = document.createElement('option');
                option.classList.add('suggestion');
                option.textContent = suggestion.username;
                option.value = suggestion.username;
                userSuggestions.appendChild(option);
            })
        }
    }
})

//diffie-hellman x3d
searchUserForm.addEventListener('submit', async (e) => {
    e.preventDefault();

})

//provide prekeys if requested by server
socket.on('askForPreKeys', async (data) => {
    let preKeys, keyno;
    let publicPreKeys = [];
    //check if prekeys exist in localstorage
    if(localStorage.getItem('preKeys') == null){
        preKeys = [];
        keyno = 0;
    }else{
        preKeys = JSON.parse(localStorage.getItem('preKeys'));
        keyno = preKeys.length;
    }
    for(let i = 0; i < data.amount; i++) {
        const [publicPreKey, privatePreKey, _] = await algs.generateECDSAKeypair();
        preKeys.push({prekey: privatePreKey, keyno: keyno + i});
        publicPreKeys.push({prekey: publicPreKey, keyno: keyno + i});
    }
    localStorage.setItem('preKeys', JSON.stringify(preKeys));
    socket.emit('providePreKeys', {prekeys: publicPreKeys});
})

socket.on('message', data => {
    const item = document.createElement('li');
    item.textContent = data.name + " " + data.message;
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
});