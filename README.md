# What if Signal was bad?

In time, this will hopefully become a clone of Signal.

## How ts works (specification I guess)

On the server side, there are 4 tables, containing:
- users - table containing user information:
    - id - unique user identifier number,
    - username - unique user identifier,
    - secret - things the user needs to store on the server (TBI),
    - identityPublicKey - user's public key, used to create a shared secret (TBI),
    - identitySignedKey - used to verify the user is in posession of the private key,
    - authtoken - user's cookie, verified on connection,
- live - table containing live connection information:
    - userid - id of the connected user,
    - socket - the socket the user is connected to
- prekey - table containing users' prekeys (TBI):
    - id - unique prekey identifier number,
    - userid - id of the creator of the prekey,
    - prekey - the prekey
- messages - table where messages are stored before they are sent to a user (TBI)

The user has access to 3 screens:
- /register - allows the user to create an account
- /login - allows the user to log in with their username and private key (TBI)
- / - allows users to add friends (TBI) and send them messages

## Actual functionality

When a user registers on /register, they creates a pair of keys and a signature. The public key, signature gets sent to the server along with the username and a user account is created. In return, the user gets an authToken cookie, which lets them authorize without putting in their private key every time.

Login (TBI)

Prekeys (TBI)

### TO-DO
- [x] user creation
- [ ] implement Diffie-Helman
- [ ] adding friends
- [ ] implement Double Ratchet
- [ ] storing messages on device
- [ ] read markings

### SIDE-QUESTS
by how likely/easy they are to be implemented (more or less)
- [ ] profile pictures
- [ ] login - deriving public key from provided private
- [ ] sending images
- [ ] private conversations
- [ ] someone is writing bubbles
- [ ] group chats

### MAYBE ONE DAY
- [ ] voice calls
