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
        client.join(gameId, () => {
            console.log("A user has joined game: " + gameId);

            if (!games[gameId]) {
                games[gameId] = {
                    id: gameId, 
                    text: "",
                    players: [],
                    started: false,
                    completed: 0
                }
            }

            if (username === null || username === "") {
                username = randomName.getRandomName(games[gameId].players.map(player => player.username));
            }
            games[gameId].players.push({username, progress: 0, socketId: client.id});

            client.emit('init', {...games[gameId], socketId: client.id});
            client.to(gameId).emit('message', games[gameId]);
        }).on('update', (message) => {
            let idx = games[gameId].players.findIndex(player => player.socketId === client.id);
            games[gameId].players[idx].progress = message.progress;
            if (message.progress === 1) {
                games[gameId].players[idx].position = games[gameId].completed++;
            }

            if (games[gameId].text.length > 0) {
                io.to(gameId).emit("message", games[gameId]);
            }
        }).on('start', (message) => {
            games[gameId].started = true;
            randomText.getRandomTextWeb(2).then(text => {
                games[gameId].text = text;
                io.to(gameId).emit('start', games[gameId]);
                // console.log(games[gameId]);
            }).catch(err => {
                games[gameId].text = randomText.getRandomText(2);
                console.log("API failed, using local generator");
                io.to(gameId).emit('start', games[gameId]);
            });
        }).on('disconnect', () => {
            games[gameId].players = games[gameId].players.filter(player => player.socketId !== client.id);
            if (games[gameId].players.length <= 0) {
                games[gameId] = null;
            }
            client.to(gameId).emit("message", games[gameId]);
        });
    });
});

http.listen(PORT, () => {
    console.log('App Listening on Port: ', PORT);
})