console.log($);

const pathname = window.location.pathname;

if (pathname.length === 7 ) {
    console.log('Valid Pathname');
    const socket=io();
    socket.emit('join', {gameId: pathname, username: "hello"});

    socket.on("init", (message) => {
        console.log(message);
    });

    socket.on("message", (message) => {
        console.log(message);
    });

    socket.emit("update", {message: "helloworld"});
} else {
    console.log('Invalid Pathname');
}