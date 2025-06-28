const algs = require("./server_scripts/algs.js")
const pool = require("./server_scripts/db")
const express = require('express');
const path = require("path");
const { createServer } = require("http")
const hbs = require('express-handlebars');
const formidable = require('formidable');
const { Server } = require('socket.io');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const app = express();
const server = createServer(app);
const io = new Server(server)
app.use(cookieParser());
app.use(express.json());
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.engine('hbs', hbs.engine({ defaultLayout: 'layout.hbs' }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
// app.use(cors({
//     credentials: true //allow cookies
// }))

//for debugging
// pool.query('truncate users; truncate prekey; truncate message')

//prepare databases
pool.query('CREATE table IF NOT EXISTS users(' +
    'id serial,' +
    'username varchar unique,' +
    'secret varchar,' +
    'identitypublickey varchar,' +
    'identityx25519 varchar,' +
    'identityx25519signature varchar,' +
    'signedprekey varchar,' +
    'prekeySignature varchar,' +
    'authtoken varchar)')
pool.query('CREATE table IF NOT EXISTS prekey(' +
    'id serial,' +
    'userid integer,' +
    'keyno integer,' +
    'onetimeprekey varchar)')
pool.query('CREATE table IF NOT EXISTS live(' +
    'userid integer,' +
    'socket varchar)')
pool.query('CREATE table IF NOT EXISTS message(' +
    'id serial,' +
    'senderid integer,' +
    'receiverid integer,' +
    'type varchar,' +
    'message varchar)')
pool.query('truncate live')


io.on('connection', async (socket) => {
    //verify user's authtoken
    const cookies = socket.handshake.headers.cookie;
    const parsedCookies = cookie.parse(cookies || ''); // Parse cookie string
    const authToken = parsedCookies.authToken;
    const verifyAuthTokenQuery = await pool.query('SELECT id FROM users WHERE authtoken = $1', [authToken]);
    if(verifyAuthTokenQuery.rows.length == 0) {
        socket.disconnect();
    }else{
        //add user to live table
        await pool.query('INSERT into live(userid, socket) values($1, $2)', [verifyAuthTokenQuery.rows[0].id, socket.id])
    }
    //check if user has pending messages
    const checkForMessagesQuery = await pool.query("SELECT message.senderID, message.type, message.message, message.id FROM message JOIN live ON live.userid = message.receiverID WHERE live.socket = $1", [socket.id]);
    if(checkForMessagesQuery.rows.length > 0) {
        checkForMessagesQuery.rows.forEach(async(row) => {
            io.to(socket.id).volatile.emit("message", {sender: row.senderid, type: row.type, message: row.message});
            await pool.query("DELETE FROM message WHERE id = $1", [row.id]);
        })
    }

    //check if user has 4 prekeys on the server
    const enoughPreKeysQuery = await pool.query('SELECT COUNT(1) amount FROM prekey JOIN live ON live.userid = prekey.userid WHERE live.socket = $1', [socket.id])
    //if not, ask for the missing prekeys
    if(enoughPreKeysQuery.rows[0].amount < 4){
        io.to(socket.id).emit('askForPreKeys', {amount: 4 - enoughPreKeysQuery.rows[0].amount});
    }

    socket.on('providePreKeys', async(data) => {
        const userIdQuery = await pool.query('select userid from live where socket = $1', [socket.id]);
        const userId = userIdQuery.rows[0].userid;
        data.prekeys.forEach(async (prekey) => {
            await pool.query('INSERT INTO prekey(userid, keyno, oneTimePreKey) values($1, $2, $3)',
                [userId, prekey.keyno, JSON.stringify(prekey.prekey)])
        })
    })

    socket.on('message', async(data) => {
        //check if user is online
        const senderQuery = await pool.query("SELECT users.id, users.username FROM live join users on users.id = live.userid WHERE socket = $1", [socket.id])
        const isReceiverOnlineQuery = await pool.query("SELECT socket FROM live WHERE userid = $1", [data.sendTo]);
        //check user isn't sending to himself
        if(senderQuery.rows[0].userid == data.sendTo)
            return;
        //if online, send straight to him
        if(isReceiverOnlineQuery.rows[0] != null){
            io.to(isReceiverOnlineQuery.rows[0].socket).emit("message", {sender: senderQuery.rows[0], type: data.type, message: JSON.stringify(data.message)});
        }else{
            //if not, store in database
            await pool.query("INSERT INTO message(senderID, receiverID, type, message) values($1, $2, $3, $4)", [senderQuery.rows[0].userid, data.sendTo, data.type, JSON.stringify(data.message)])
        }
    })

    socket.on('disconnect', async () => {
        await pool.query("DELETE FROM live WHERE socket = $1", [socket.id]);
    });
});

app.get("/", async function(req, res) {
    res.render("index");
});

app.get("/login", function(req, res) {
    res.render("login");
})

//TODO: login

// app.post("/login", async function(req, res) {
//     const user = await pool.query("SELECT * FROM users where username = $1", [req.body.username]);
//     if(user.rows.length != 1 || user.rows[0].password != req.body.password){
//         res.send("WRONGCREDENTIALS");
//         return;
//     }
//     res.cookie("id", user.rows[0].id);
//     res.send("USERREGISTERED");
// })

app.get("/register", function(req, res) {
    // if(req.cookies.id){
    //     res.redirect("/");
    //     return
    // }
    res.render("register");
})

app.post("/register", async function(req, res) {
    //username must be unique
    const users = await pool.query("SELECT count(*) FROM users WHERE username = $1", [req.body.username]);
    if(users.rows[0].count > 0){
        res.status(400).send("USERNAMETAKEN");
        return;
    }
    const checkSignature = await algs.verifySignature(JSON.parse(req.body.identityPublicKey), JSON.parse(req.body.prekeySignature), JSON.parse(req.body.publicPrekey));
    const check2Signature = await algs.verifySignature(JSON.parse(req.body.identityPublicKey), JSON.parse(req.body.identityX25519signature), JSON.parse(req.body.identityX25519Public));
    //if signature is valid register the user
    if(!checkSignature || !check2Signature){
        res.status(400).send("WRONGSIGNATURE")
        return;
    }
    const authToken = jwt.sign({ username: req.body.username }, 'r$%Es^$F89h)hb(Y*fR^S4#%W4R68g(Oig');
    await pool.query("INSERT INTO users(username, identityPublicKey, signedprekey, prekeySignature, authToken, identityx25519, identityx25519signature) values($1, $2, $3, $4, $5, $6, $7)",
        [req.body.username, req.body.identityPublicKey, req.body.publicPrekey, req.body.prekeySignature, authToken, req.body.identityX25519Public, req.body.identityX25519signature]);
    res.cookie('authToken', authToken,{
        httpOnly: true,
        secure: true,
        expires: new Date('2077-01-01T00:00:00Z')
    });
    res.send("USERREGISTERED");
})

app.get("/logout", function(req, res) {
    res.redirect("/");
})

app.post("/searchuser", async function(req, res) {
    const usersLikeQuery = await pool.query("SELECT id, username FROM users WHERE username like $1", [`%${req.body.query}%`]);
    res.send(usersLikeQuery.rows);
})

app.post("/fetchbundle", async function(req, res) {
    //verify request is from a user
    const authToken = req.cookies.authToken;
    const verifyAuthTokenQuery = await pool.query('SELECT 1 FROM users WHERE authtoken = $1', [authToken]);
    if(verifyAuthTokenQuery.rows.length == 0){
        res.status(403).send("NOCOOKIE")
        return;
    }
    const bundleQuery = await pool.query("SELECT users.id, users.identityPublicKey, users.username, users.signedprekey, users.prekeysignature, users.identityx25519, users.identityx25519signature, prekey.onetimeprekey, prekey.keyno, prekey.id as prekeyid from users left join prekey on prekey.userid = users.id where users.username = $1 limit 1", [req.body.username]);
    //delete prekey from database, off for testing
    if(bundleQuery.rows[0].onetimeprekey){
        await pool.query("DELETE FROM prekey WHERE id = $1", [bundleQuery.rows[0].prekeyid])
    }
    res.send(JSON.stringify(bundleQuery.rows[0]));
})

app.use(express.static('./public'));

server.listen(3000, function () {
    console.log("http://localhost:3000")
})
