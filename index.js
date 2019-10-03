const express = require("express");
const app = express();
const http = require('http').Server(app);
const path = require('path');
const io = require('socket.io')(http);
const randomText = require('./randomText');
const randomName = require('./randomName');

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
            games[gameId].players.push(
                {
                    username,
                    progress: 0,
                    socketId: client.id,
                    ready: false
                }
            );

            client.emit('init', {...games[gameId], socketId: client.id});
            client.to(gameId).emit('message', games[gameId]);
        }).on('update', (message) => {
            let idx = games[gameId].players.findIndex(player => player.socketId === client.id);
            games[gameId].players[idx].progress = message.progress;

            if (message.progress === 1) {
                games[gameId].players[idx].position = games[gameId].completed++;

                const numWinners = Math.min(3, games[gameId].players.length);

                if (games[gameId].completed >= numWinners) {
                    console.log(`Game ${gameId} Complete`);
                    io.to(gameId).emit("end", {ended: true});
                    setTimeout(() => {
                        games[gameId].started = false;
                        games[gameId].text = "";
                        games[gameId].completed = 0;
                        games[gameId].players.forEach(player => {player.progress = 0; player.ready = false});
                        io.to(gameId).emit("message", games[gameId]);
                    }, 5000); 
                }
            }

            if (games[gameId].text.length > 0) {
                io.to(gameId).emit("message", games[gameId]);
            }
        }).on('ready', (message) => {
            let idx = games[gameId].players.findIndex(player => player.socketId === client.id);
            games[gameId].players[idx].ready = message.ready;
            io.to(gameId).emit("message", games[gameId]);

            if (games[gameId].players.filter(player => !player.ready).length <= 0) {
                games[gameId].started = true;
                games[gameId].completed = 0;
                randomText.getRandomTextWeb(2).then(text => {
                    games[gameId].text = text;
                    io.to(gameId).emit('start', games[gameId]);
                    // console.log(games[gameId]);
                }).catch(err => {
                    games[gameId].text = randomText.getRandomText(2);
                    console.log("API failed, using local generator");
                    io.to(gameId).emit('start', games[gameId]);
                });
            }            
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