const fs = require('fs')
const http = require('http')
const socketio = require('socket.io')

var PORT = 8000


const server = http.createServer(async(req,resp) =>{
	resp.end(await readFile(req.url.substr(1)))
})

const readFile = f => new Promise((resolve,reject) =>
  fs.readFile(f, (e,d) => e?reject(e):resolve(d)))

const io = socketio(server)

var players = {}

io.on('connection', socket =>{
	console.log('A player connected')
	
	// create a new player and add it to our players object
	players[socket.id] = {
		rotation: 0,
		x: Math.floor(Math.random() * 700) + 50,
		y: Math.floor(Math.random() * 500) + 50,
		playerId: socket.id,
	};
	
	// send the info of players already playing to the new player
	socket.emit('renderGame', players);
	
	// update all other players of the new player
	socket.broadcast.emit('newPlayer', players[socket.id]);

	socket.on('playerMovement', function (movementData) {
		console.log('movement recieved')
		players[socket.id].x = movementData.x;
		players[socket.id].y = movementData.y;
		players[socket.id].rotation = movementData.rotation;
		// emit a message to all OTHER players about the player that moved
		socket.broadcast.emit('playerMoved', players[socket.id]);
	});


	// when a player disconnects, remove them from our players object
	socket.on('disconnect', function () {
		console.log('user disconnected');
		// remove this player from our players object
		delete players[socket.id];
		// emit a message to all players to remove this player
		io.emit('disconnect', socket.id);
	})
})


server.listen(PORT, () => console.log('Listening on port', PORT))


