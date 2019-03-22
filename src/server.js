const fs = require('fs')
const http = require('http')
const socketio = require('socket.io')

var PORT = 8000

const snakeSegments = 12;

const server = http.createServer(async(req,resp) =>{
  resp.end(await readFile(req.url.substr(1)))
})

const readFile = f => new Promise((resolve,reject) =>
  fs.readFile(f, (e,d) => e?reject(e):resolve(d)))

const io = socketio(server)

var players = {}

const chunks = 10; // seperation between initial snake locations

let currentPlayers = 0;
let numPlayers = 2;

io.on('connection', socket =>{
  console.log('A player connected')
  currentPlayers++;


  // create a new player and add it to our players object
  players[socket.id] = {
    rotation: 0,
    x: Math.floor(Math.random() * 700) + 50,
    y: Math.floor(Math.random() * 550) + 50,
    playerId: socket.id,
  };

  players[socket.id]["body"] = Array(snakeSegments*snakeSegments).fill(0).map((_,index) => {
    return { "x": (-5*chunks*(index+1) + players[socket.id].x)  , "y": players[socket.id].y };
  })





  // send the info of players already playing to the new player
  socket.emit('renderGame', players);


  // update all other players of the new player
  socket.broadcast.emit('newPlayer', players[socket.id]);

  if(numPlayers == currentPlayers){
    io.emit('start', {})
    setTimeout(() => { 
      io.emit('grace',{}); 
      console.log('Grace-Period ended ...');
    }, 5000);

  }

  socket.on('playerMovement', function (movementData) {
    //console.log(`movement recieved from ${socket.id}`)
    players[socket.id].x = movementData.x;
    players[socket.id].y = movementData.y;
    players[socket.id].rotation = movementData.rotation;
    players[socket.id].body = movementData.body;
    // emit a message to all OTHER players about the player that moved
    socket.broadcast.emit('playerMoved', players[socket.id]);
  });

  socket.on('crash', (data) => {
    console.log(`${socket.id} crashed`);
    socket.broadcast.emit('crash',socket.id);
  })


  // when a player disconnects, remove them from our players object
  socket.on('disconnect', function () {
    console.log('user disconnected');
    // remove this player from our players object
    delete players[socket.id];
    // emit a message to all players to remove this player
    io.emit('disconnect', socket.id);
    currentPlayers--;
  })
})


server.listen(PORT, () => console.log('Listening on port', PORT))


