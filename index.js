const express = require("express");
const app = express();
const http = require('http').Server(app);
const path = require('path');
const io = require('socket.io')(http);
const randomText = require('./randomText');

const PORT = process.env.PORT || 8090;


let games = {};
// Enable CORS for dev
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Credentials', true);
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// Serve any static files
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on("connection", (client) => {
    client.on('join', ({gameId, username}) => {
        if (username === null || username === "") {
            username = "AnonymousMonkey" + (games[gameId]? games[gameId].players.length : 0);
        }
        client.join(gameId, () => {
            console.log("A user has joined game: " + gameId);

            let gameDetails;
            if (games[gameId]) {
                games[gameId].players.push({username, progress: 0, socketId: client.id});
            } else {
                gameDetails = {
                    id: gameId, 
                    text: "",
                    players: []
                }
                gameDetails.players.push({username, progress: 0, socketId: client.id});
                games[gameId] = gameDetails;
            }
            randomText.getRandomTextWeb(50).then(text => {
                games[gameId].text = text;
                io.to(gameId).emit('message', games[gameId]);
            }).catch(err => {
                games[gameId].text = randomText.getRandomText(50);
                console.log("API failed, using local generator");
                io.to(gameId).emit('message', games[gameId]);
            });
        }).on('update', (message) => {
            let idx = games[gameId].players.findIndex(player => player.socketId === client.id);
            games[gameId].players[idx].progress = message.progress;
            if (games[gameId].text.length > 0) {
                io.to(gameId).emit("message", games[gameId]);
            } 
        }).on('disconnect', () => {
            games[gameId].players = games[gameId].players.filter(player => player.socketId !== client.id);
            if (games[gameId].players.length <= 0) {
                games[gameId] = null;
            }
            io.to(gameId).emit("message", games[gameId]);
        });
    });
});

http.listen(PORT, () => {
    console.log('App Listening on Port: ', PORT);
})