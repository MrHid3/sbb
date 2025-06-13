
# What if Signal was bad?

In time, this will hopefully become a clone of Signal.

## Table of contents
1. [⬇️Installation](#Installation)
2. [🏗️Structure](#How-ts-works-structure)
3. [🔧Functionality deep dive](#Actual-functionality)
4. [🚀Further Development](#TO-DO)
6. [📝Additional Notes](#Notes)

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
    - identityPublicKey - user's public key, used to create verify his identity to the server and other users,
    - identityX22519 - a main key in the X22519, which is neccesary for derivying keys,
    - identityx25519signature - a signature of X22519, used to verify the owner,
    - signedprekey - main prekey, used to derive keys,
    - prekeySignature - signature of the main prekey,
    - authtoken - user's cookie, verified on connection,
- live - table containing live connection information:
    - userid - id of the connected user,
    - socket - the socket the user is connected to
- prekey - table containing users' prekeys:
    - id - unique prekey identifier number,
    - userid - id of the creator of the prekey,
    - keyno - prekey number used to differentiate between them by the owner
    - prekey - the prekey
- message - table where messages are stored before they are sent to a user:
    - id - unique message identifying number,
    - senderID - id of the sender,
    - receiverID - id of the receiver,
    - type - type of message ("first" for establishing the secret, "normal" for communication)
    - message - the message
  
The user has access to 3 screens:
- /register - allows the user to create an account
- /login - allows the user to log in with their username and private key (TBI)
- / - allows users to add friends and send them messages (TBI)

## Actual functionality

When a user registers on /register, they create three pairs of keys: identity, identityX22519[*](#Notes), and prekey. The identityX22519 and prekey public keys are signed with the identiy private key, and then the identity public key, identiyX22519 public key, identiyX22519 signature, prekey public key and prekey signature get sent to the server. If everything goes trough on the server side (unique username, valid signatures) In return, the user gets an authToken cookie, which lets them authorize without putting in their private key every time.

Login (TBI)

When a user gets on / and connects to a socket, a multitude of checks are run:
    - **does the user have an Authtoken**
	    *if not, disconnect the socket and redirect user to /register (TBI)*
    - **is the Authtoken valid**
	    *if not, disconnect the socket and redirect user to /register (TBI)*
	    *otherwise, add user to live table, so the socket can be easily linked back to a user*
    - **does the user have enough  prekeys in the database**
	    *if not, request prekeys from the user*
    - **does the user have any pending messages**
	    *if so, send them to the user*

### TO-DO
- [x] user creation
- [ ] implement Diffie-Helman
- [ ] adding friends
- [ ] implement Double Ratchet
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

### MAYBE ONE DAY
- [ ] voice calls

#### Notes
> This technically isn't the Signal Protocol. In the actual Signal, the identity is an XEd25519 curve (so one that can be used as X22519 and Ed25519 simultanously). This ensures the identities of both parties while generating the key. Here, I am yet to find a way do that in JS, so right now the user just sends an identiy key (identityPublicKey in users) and a separate X25519ke (identityX22519 in users), which they sign (identityX2259signature in users).
