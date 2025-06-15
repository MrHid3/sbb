

# What if Signal was bad?

In time, this will hopefully become a clone of Signal.

## Table of contents
1. [⬇️Installation](#Installation)
2. [🏗️Structure](#How-ts-works-structure)
3. [🔧Functionality deep dive](#Actual-functionality)
4. [🚀Further Development](#TO-DO)
5. [📝Additional Notes](#Notes)
6. [🔍Sources](#Sources)

## Installation
Requirements:
    - nodejs
    - postgresql

(with git installed)
```
git clone https:github.com/mrhid3/sbb
cd sbb
```
(or just clone the repo and enter the directory)
```
npm i
node app.js
```

## How ts works (structure)

On the server side, there are 4 tables, containing:
- users - table containing user information:
    - id - unique user identifier number,
    - username - unique user identifier,
    - secret - things the user needs to store on the server, encrypted (TBI),
    - <span id="IPK"> identityPublicKey - user's public key, used to create verify his identity to the server and other users, </span>
    - <span id="IX">identityX22519 - a main key in the X22519[*](#note1), which is neccesary for derivying keys, </span>
    - <span id="IXS">identityx25519signature - a signature of X22519, used to verify the owner, </span>
    - <span id="SPK"> signedprekey - main prekey, used to derive keys, </span>
    - <span id="SPKS">prekeySignature - signature of the main prekey, </span>
    - <span id="authtoken">authtoken - user's cookie, verified on connection, </span>
- <span id="liveTable">live - table containing live connection information:</span>
    - userid - id of the connected user,
    - socket - the socket the user is connected to
- prekey - table containing users' one-time-prekeys:
    - id - unique prekey identifier number,
    - userid - id of the creator of the prekey,
    - keyno - prekey number used to differentiate between them by the owner
    <span id="prekey">- prekey - a one time key used to astablish a shared secret, discared after use</span>
  <span id="messageTable">
- message - table where messages are stored before they are sent to a user:
    - id - unique message identifying number,
    - senderID - id of the sender,
    - receiverID - id of the receiver,
    - type - type of message ("first" for establishing the secret, "normal" for communication)
    - message - the message
  </span>
The user has access to 3 screens:
- /register - allows the user to create an account
- /login - allows the user to log in with their username and private key (TBI)
- / - allows users to add friends and send them messages (TBI)

## Actual functionality

When a user registers on /register, they create three pairs of keys: [identity](#IPK), [identityX22519](#IX), and [prekey](#SPK). The identityX22519 and prekey public keys are signed with the identiy private key, and then the identity public key, identityX22519 public key, [identityX22519 signature](#IXS), prekey public key and [prekey signature](#SPKS) get sent to the server. If everything goes trough on the server side (unique username, valid signatures) In return, the user gets an [authToken](#authtoken) cookie, which lets them authorize without putting in their private key every time.

Login (TBI)

When a user gets on / and connects to a socket, a multitude of checks are run:
- **does the user have an Authtoken** - *if not, disconnect the socket and redirect user to /register (TBI)*
- **is the Authtoken valid** - *if not, disconnect the socket and redirect user to /register (TBI); otherwise, add user to live table, so the socket can be easily linked back to a user*
- **does the user have enough  prekeys in the database** - *if not, request prekeys from the user*
- **does the user have any pending messages** - *if so, send them to the user*

On /, the user can also add a friend (like specified [in the Signal documentation](#signal)[*](#note1)). They fetch a bundle from /fetchbundle ([Authtoken](#authtoken) is checked here, and if authorized the [one-time-prekey]("prekey") is deleted from the server) and based on it they perform triple Diffie-Hellman. They keep the secret and send  to the other user their ephemeral public key, their AD, their iv and their [identityX22519 key](#IX) (this is stored in table [message](#messageTable) as type "first"). When the user logs on, they get the option to accept the request (TBI), and if they do they perform a triple Diffie-Hellman on the provided values, and then tries to decode the first message. If everything goes well, a shared secret is established between the two.

---

### TO-DO
- [x] user creation
- [x] implement Diffie-Helman
- [ ] adding friends
- [ ] implement Double Ratchet
- [ ] key rotation for prekeys
- [ ] storing messages on device
- [ ] read markings

### Side-Quests
by how likely/easy they are to be implemented (more or less)
- [ ] profile pictures
- [ ] login - deriving public key from provided private
- [ ] sending images
- [ ] private conversations
- [ ] someone is writing bubbles
- [ ] group chats

### Maybe One Day
- [ ] voice calls

---

#### Notes

<span id="note1">*This technically isn't the [Signal Protocol](#signal). In the actual Signal, the identity is an XEd25519 curve (so one that can be used as X22519 and Ed25519 simultanously). This ensures the identities of both parties while generating the key. Here, I am yet to find a way do that in JS, so right now the user just sends an identity key ([identityPublicKey](#IPK) in users) and a separate X25519 key [identityX22519](#IX) in users), which they sign ([identityX2259signature](#IXS) in users).*
</span>

---

#### Sources

<span id="signal">[The Signal Documentation](https://signal.org/docs/specifications):
- [X3DH (triple Diffie-Hellman)](https://signal.org/docs/specifications/x3dh)[*](#note1)
- [Double Rachet](https://signal.org/docs/specifications/doubleratchet/)
- [Algorythm Standards](https://signal.org/docs/specifications/xeddsa/)
</span>
