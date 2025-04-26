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

function cleanSocket(socket){
    for(let i = 0; i < users.length; i++){
        if(users[i].socket == socket)
            users.splice(i)
    }
}

function socketToName(socket){
    for(let i = 0; i < users.length; i++){
        if(users[i].socket == socket)
            return users[i].name;
    }
    return false;
}

function nameToSocket(name){
    for(let i = 0; i < users.length; i++)
        if(users[i].name == name)
            return users[i].socket;
    return false;
}

Io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on("authentication", name => {
        cleanSocket(socket.id);
        users.push({socket: socket.id, name: name});
        console.log(users);
    })

    socket.on('message', data => {
        console.log(data);
        let socketID = nameToSocket(data.sendTo);
        console.log(socketID);
        if(socketID){
            Io.to(socketID).emit('message', {name: socketToName(socket.id), message: data.message});
            console.log({name: socketToName(socket.id), message: data.message});
        }
    })

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});



App.get("/", function(req, res) {
    res.render("index");
});

server.listen(3000, function () {
    console.log("http://localhost:3000")
})
