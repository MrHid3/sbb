import algs from "./algs.js"

//for debugg
// localStorage.setItem("friends", JSON.stringify([]))
document.querySelector("#hiam").innerText = JSON.parse(localStorage.getItem('username'));

const socket = io({
    withCredentials: true //send cookies
});

//show message to user
function createMessageElement(sender, text){
    const messages = document.getElementById('messages');
    const li = document.createElement('li');
    li.innerHTML = `<b>${sender}</b> ${text}`;
    messages.appendChild(li);
}

//TODO: logout if any of these is missing
const publicKey = JSON.parse(localStorage.getItem('publicKey'));
const privateKey = JSON.parse(localStorage.getItem('privateKey'));
const publicPrekey = JSON.parse(localStorage.getItem('publicPrekey'));
const privatePrekey = JSON.parse(localStorage.getItem('privatePrekey'));
const username = JSON.parse(localStorage.getItem('username'));
const myX25519 = JSON.parse(localStorage.getItem('identityX25519Private'));
const myX25519Public = JSON.parse(localStorage.getItem('identityX25519Public'));

//select chat - first friend by default
//TODO: open on newest message
const friendsList = document.getElementById('friends-list');
const friends = JSON.parse(localStorage.getItem('friends'));
let currentFriend = friends[0];
let currentKey = await crypto.subtle.importKey(
    'jwk',
    currentFriend.secret.sharedSecret,
    { name: 'AES-GCM' },
    true,
    ['decrypt', 'encrypt']
);

friends.forEach(async (friend) => {
    const div = document.createElement('div');
    div.classList.add('friend-element');
    div.innerText = friend.username;
    div.addEventListener('click', async (e) => {
        currentFriend = friend;
        currentKey = await crypto.subtle.importKey(
            'jwk',
            currentFriend.secret.sharedSecret,
            { name: 'AES-GCM' },
            true,
            ['decrypt', 'encrypt']
        );
    })
    friendsList.appendChild(div);
})


//actually sending the message
const messageForm = document.getElementById('form');
const input = document.getElementById('input');

messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (input.value) {
        socket.emit('message', {
            type: 'regular',
            sendTo: currentFriend.id,
            message: await algs.encrypt(Uint8Array.from(Object.values(currentFriend.secret.iv)), currentKey, input.value)
        });
        createMessageElement(username, input.value);
        input.value = '';
    }
});

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
                let friends = [];
                if(localStorage.getItem("friends")){
                    friends = JSON.parse(localStorage.getItem("friends"));
                }
                let check = true;
                for(let i = 0; i < friends.length; i++){
                    if(friends[i].username == suggestion.username){
                        check = false;
                        break;
                    }
                }
                const me = JSON.parse(localStorage.getItem("username"));
                if(suggestion.username == me){
                    check = false;
                }
                if(check){
                    const option = document.createElement('option');
                    option.classList.add('suggestion');
                    option.textContent = suggestion.username;
                    option.value = suggestion.username;
                    userSuggestions.appendChild(option);
                }
            })
        }
    }
})

//add a friend - diffie-hellman x3d
searchUserForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const friend = e.target.user.value;
    let friends = [];
    if(localStorage.getItem("friends")){
        friends = JSON.parse(localStorage.getItem("friends"));
    }
    for(let i = 0; i < friends.length; i++)
        if(friends[i].username == friend)
            return
    //get prekey bundle from server
    const awaitBundle = await fetch("/fetchbundle", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: friend
        })
    })
    const bundle = await awaitBundle.json();
    const identityPublicKey = JSON.parse(bundle.identitypublickey);
    const signedPrekey = JSON.parse(bundle.signedprekey);
    const signature = JSON.parse(bundle.prekeysignature);
    const X22519key = JSON.parse(bundle.identityx25519);
    const X22519signature = JSON.parse(bundle.identityx25519signature);
    const oneTimePrekey = JSON.parse(bundle.onetimeprekey)
    const keyno = JSON.parse(bundle.keyno);
    const verifyIdentity = await algs.verifySignature(identityPublicKey, signature, signedPrekey);
    const verifyX25519 = await algs.verifySignature(identityPublicKey, X22519signature, X22519key);
    let sharedSecret;
    const [publicEphemeralKey, privateEphemeralKey] = await algs.generateX25519Keypair();
    if(!verifyIdentity || !verifyX25519){
        console.log("Wrong signature");
        return;
    }
    sharedSecret = await algs.X3DH(myX25519, privateEphemeralKey, X22519key, signedPrekey, oneTimePrekey);
    const AD = new Uint8Array([...new TextEncoder().encode(myX25519), ...new TextEncoder().encode(X22519key)]);
    const keyData = new TextEncoder().encode(sharedSecret);
    // Import the key
    const key = await crypto.subtle.importKey(
        'raw',
        sharedSecret,
        { name: 'AES-GCM' },
        true,
        ['decrypt', 'encrypt']
    );
    //cryptography bullshit
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await algs.encrypt(iv, key, 'MESSAGE', AD);
    // const result = new Uint8Array(iv.length + ciphertext.byteLength);
    //save important stuff to localstorage, send information to server so we can get friends
    const exportedSecret = await crypto.subtle.exportKey("jwk", key);
    friends.push({
        id: bundle.id,
        username: bundle.username,
        secret: {
            sharedSecret: exportedSecret,
            iv: iv
        },
        messages: []
    });
    localStorage.setItem("friends", JSON.stringify(friends));
    socket.emit("message", {
        type: "first",
        sendTo: bundle.id,
        message: {
            IKa: myX25519Public,
            EKa: publicEphemeralKey,
            keyno: keyno,
            initial: ciphertext,
            iv: iv,
            AD: AD
        }})
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
        const [publicPreKey, privatePreKey] = await algs.generateX25519Keypair();
        preKeys.push({prekey: privatePreKey, keyno: keyno + i});
        publicPreKeys.push({prekey: publicPreKey, keyno: keyno + i});
    }
    localStorage.setItem('preKeys', JSON.stringify(preKeys));
    socket.emit('providePreKeys', {prekeys: publicPreKeys});
})

socket.on('message', async(data) => {
    // const item = document.createElement('li');
    // item.textContent = data.name + " " + data.message;
    // messages.appendChild(item);
    // window.scrollTo(0, document.body.scrollHeight);
    //now we gotta make friends
    //TODO: ogarnąć co jeśli nie ma prekey
    if(data.type == "first"){
        // try{
            const message = JSON.parse(data.message);
            let mOTK = null;
            let friends;
            try {
                friends = JSON.parse(localStorage.getItem('friends')) || [];
            } catch (e) {
                friends = [];
            }
            if(friends.find(e => e.id == data.sender.id) !== undefined){
                console.log("We've known eachother for so long");
                return;
            }
            if(message.keyno != null){
                let OTKs = JSON.parse(localStorage.getItem("preKeys"))
                mOTK = OTKs.find(e => e.keyno == message.keyno);
                localStorage.setItem('preKeys', JSON.stringify(OTKs.filter(prekey => prekey.keyno != message.keyno)));
            }
            const sharedSecret = await algs.X3DH2theX3DHing(myX25519, privatePrekey, mOTK == null ? null : mOTK.prekey, message.EKa, message.IKa);
            const key = await crypto.subtle.importKey(
                'raw',
                sharedSecret,
                { name: 'AES-GCM' },
                true,
                ['decrypt', 'encrypt']
            );
            const clearText = await algs.decrypt(
                new Uint8Array(message.iv.data),
                key,
                new Uint8Array(message.initial.data),
                new Uint8Array(message.AD.data)
            );
            const exportedSecret = await crypto.subtle.exportKey("jwk", key);
            friends.push({
                id: data.sender.id,
                username: data.sender.username,
                secret: {sharedSecret: exportedSecret, iv: new Uint8Array(message.iv.data)},
                messages: []
            });
            localStorage.setItem('friends', JSON.stringify(friends));
            const reply = await algs.encrypt(
                new Uint8Array(message.iv.data),
                key,
                'itworks'
            );
            //if succesful, send confirmation
            socket.emit("message", {
                type: "firstreply",
                sendTo: data.sender.id,
                message: reply
            })
        // }catch(e){
        //     //otherwise, send a negation (?)
        //     socket.emit("message", {type: "firstreply", sendTo: data.sender.id, message: ''})
        // }

    }else if(data.type == "firstreply"){
        if(JSON.parse(data.message) == ''){
            console.log("No friends for you")
            return;
        }
        const friend = friends.find(f => f.id == data.sender.id);
        try{
            const key = await crypto.subtle.importKey(
                'jwk',
                friend.secret.sharedSecret,
                { name: 'AES-GCM' },
                true,
                ['decrypt', 'encrypt']
            );
            const clearReply = await algs.decrypt(
                Uint8Array.from(Object.values(friend.secret.iv)),
                key,
                Uint8Array.from(Object.values(JSON.parse(data.message).data))
            );
        }catch(e){
            console.log("Kaine friende fur dich");
            localStorage.setItem('friends', JSON.stringify(friends.filter(f => f.id == data.sender.id)));
        }
    }else if(data.type == "regular"){
        const friend = friends.find(f => f.id == data.sender.id);
        const key = await crypto.subtle.importKey(
            'jwk',
            friend.secret.sharedSecret,
            { name: 'AES-GCM' },
            true,
            ['decrypt', 'encrypt']
        );
        const clearMessage = await algs.decrypt(
            Uint8Array.from(Object.values(friend.secret.iv)),
            key,
            Uint8Array.from(Object.values(JSON.parse(data.message).data))
        );
        createMessageElement(friend.username, clearMessage)
    }
});