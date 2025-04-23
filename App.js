const express = require('express');
const path = require("path");
const { createServer } = require("http")
const hbs = require('express-handlebars');
const formidable = require('formidable');
const { Server } = require('socket.io');
const App = express();
const server = createServer(App)
const Io = new Server(server)
App.use(express.json());

App.set('views', path.join(__dirname, 'views'));
App.set('view engine', 'hbs');
App.engine('hbs', hbs.engine({ defaultLayout: 'layout.hbs' }));
App.use(express.json());
App.use(express.urlencoded({ extended: false }));
App.use(express.static(path.join(__dirname, 'public')));

let users = [];

Io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
    socket.on('message', (msg) => {
        Io.emit('message', msg);
    })
});

Io.on("authentication", name => {
    console.log(name);
    console.log("didi")
})

App.get("/", function(req, res) {
    res.render("index");
});

server.listen(3000, function () {
    console.log("http://localhost:3000")
})
