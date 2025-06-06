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

//prepare databases
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
        const addToSocketListQuery = await pool.query('INSERT into live(userid, socket) values($1, $2)', [verifyAuthTokenQuery.rows[0].id, socket.id])
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
        let socketID = idToSocket(data.sendTo);
        if(socketID){
            const senderId= socketToId(socket.id);
            io.to(socketID).emit('message', {name: senderId, message: data.message});
            await pool.query("INSERT INTO MESSAGES(senderId, receiverId, message) values($1, $2, $3)", [senderId, data.sendTo, data.message])
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
    const checkSignature = await algs.verifySignature(JSON.parse(req.body.identityPublicKey), JSON.parse(req.body.prekeySignature), JSON.parse(req.body.publicPrekey))
    //if signature is valid register the user
    if(!checkSignature){
        res.status(400).send("WRONGSIGNATURE")
        return;
    }
    const authToken = jwt.sign({ username: req.body.username }, 'r$%Es^$F89h)hb(Y*fR^S4#%W4R68g(Oig');
    await pool.query("INSERT INTO users(username, identityPublicKey, prekey, signedprekey, authToken) values($1, $2, $3, $4, $5)",
        [req.body.username, req.body.identityPublicKey, req.body.publicPrekey, req.body.prekeySignature, authToken]);
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
    const bundleQuery = await pool.query("SELECT users.id, users.identityPublicKey, users.prekey, users.signedPrekey, prekey.onetimeprekey, prekey.keyno from users join prekey on prekey.userid = users.id where users.username = $1 limit 1", [req.body.username])
    res.send(JSON.stringify(bundleQuery.rows[0]));
})

app.use(express.static('./public'));

server.listen(3000, function () {
    console.log("http://localhost:3000")
})
