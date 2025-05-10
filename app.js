const express = require('express');
const path = require("path");
const { createServer } = require("http")
const hbs = require('express-handlebars');
const formidable = require('formidable');
const { Server } = require('socket.io');
const cookieParser = require('cookie-parser');
const app = express();
const server = createServer(app)
const io = new Server(server)
const pool = require("./db")

app.use(cookieParser());
app.use(express.json());

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.engine('hbs', hbs.engine({ defaultLayout: 'layout.hbs' }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

let users = [];

function cleanSocket(socket){  //if a socket was previously assigned to a user, remove it
    for(let i = 0; i < users.length; i++){
        if(users[i].socket == socket)
            users.splice(i)
    }
}

function socketToId(socket){
    for(let i = 0; i < users.length; i++){
        if(users[i].socket == socket)
            return users[i].id;
    }
    return false;
}

function idToSocket(id){
    for(let i = 0; i < users.length; i++)
        if(users[i].id == id)
            return users[i].socket;
    return false;
}

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on("authentication", id => {
        cleanSocket(socket.id);
        users.push({socket: socket.id, id: id});
        console.log(users);
    })

    socket.on('message', async(data) => {
        let socketID = idToSocket(data.sendTo);
        if(socketID){
            const senderId= socketToId(socket.id);
            io.to(socketID).emit('message', {name: senderId, message: data.message});
            await pool.query("INSERT INTO MESSAGES(senderId, receiverId, message) values($1, $2, $3)", [senderId, data.sendTo, data.message])
        }
    })

    socket.on('disconnect', () => {
        users.filter(user => user.socket == socket.id)
        console.log('user disconnected');
    });
});

app.get("/", async function(req, res) {
    if(!req.cookies.id)
        res.redirect(`/login`);
    res.render("index");
});

app.get("/login", function(req, res) {
    if(req.cookies.id)
        res.redirect("/");
    res.render("login");
})

app.post("/login", async function(req, res) {
    const user = await pool.query("SELECT * FROM users where username = $1", [req.body.username]);
    if(user.rows.length != 1){
        res.send("WRONGCREDENTIALS");
        return;
    }
    res.cookie("id", user.rows[0].id);
    res.send("USERREGISTERED");
})

app.get("/register", function(req, res) {
    if(req.cookies.id){
        res.redirect("/");
        return
    }
    res.render("register");
})

app.post("/register", async function(req, res) {
    const users = await pool.query("SELECT * FROM users where username = $1", [req.body.username]);
    if(users.rows.length > 0){
        res.send("USEREXISTS");
        return;
    }
    await pool.query("INSERT INTO users(username, password) values($1, $2)", [req.body.username, req.body.password]);
    const user = await pool.query("SELECT id FROM users WHERE username = $1", [req.body.username]);
    res.cookie("id", user.rows[0].id);
    res.send("USERREGISTERED");
})

app.get("/logout", function(req, res) {
    res.clearCookie("id");
    res.redirect("/");
})

server.listen(3000, function () {
    console.log("http://localhost:3000")
})
