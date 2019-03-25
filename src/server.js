const fs = require('fs')
const http = require('http')
const socketio = require('socket.io')
const process = require('process')

var PORT = 8000


const server = http.createServer(async(req,resp) =>{
  resp.end(await readFile(req.url.substr(1)))
})

const readFile = f => new Promise((resolve,reject) =>
  fs.readFile(f, (e,d) => e?reject(e):resolve(d)))

const io = socketio(server)

var players = {}

var food = {
  x: Math.floor(Math.random() * 700) + 50,
  y: Math.floor(Math.random() * 500) + 50
};


const initNumSegments = 12;
const numSpacer = 10;

let currentPlayers = 0;
let numPlayers = Number(process.argv[2])
let deadPlayers = 0;

let dead = [];

console.log(`Starting a server for ${numPlayers} players`);


const createPlayer = (socket)=>{

  var randX = Math.floor(Math.random() * 700) + 50;
  var randY = Math.floor(Math.random() * 550) + 50;
  var randColor = Math.random() * 0xffffff
  return {
    rotation: 0,
    x: randX,
    y: randY,
    playerId: socket.id,
    color: randColor,
    score: 0,
    len: initNumSegments,
    path: new Array(numSpacer*initNumSegments).fill({x: randX, y: randY}),
    body: new Array(initNumSegments).fill({x: randX, y: randY})
  }

}

io.on('connection', socket =>{
  console.log('A player connected')
  currentPlayers++;

  players[socket.id] = createPlayer(socket)

  // send the info of players already playing to the new player
  socket.emit('renderGame', players);

  // update all other players of the new player
  socket.broadcast.emit('newPlayer', players[socket.id]);

  //Send location of new food
  socket.emit('foodLocation', food);

  if(numPlayers === currentPlayers){
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
    players[socket.id]['body'] = movementData['body'];
    players[socket.id]['path'] = movementData['path'];
    // emit a message to all OTHER players about the player that moved
    socket.broadcast.emit('playerMoved', players[socket.id]);
  });

  socket.on('crash', (_) => {
    //console.log(`${socket.id} crashed`);
    socket.broadcast.emit('crash',socket.id);
    
    if(!dead.includes(socket.id)){
      dead.push(socket.id);
      deadPlayers += 1;

      if(deadPlayers==numPlayers){
        console.log('Its a draw')
        Object.keys(players).forEach((id)=>{
          console.log('Kills:')
          console.log(id,'\t',players[id].score)
        })
      }


      if(deadPlayers == (numPlayers -1)){
        console.log('Only one player remaining, Winner!');
        Object.keys(players).forEach((id)=>{
          console.log('Kills:')
          console.log(id,'\t',players[id].score)
        })
      }
    }
  })

  socket.on('foodCollected', function () {
    food.x = Math.floor(Math.random() * 700) + 50;
    food.y = Math.floor(Math.random() * 500) + 50;
    io.emit('grow', players[socket.id])
    io.emit('foodLocation', food);
  });

  socket.on('score', ()=>{
    players[socket.id].score+=10;
  })



  // when a player disconnects, remove them from our players object
  socket.on('disconnect', function () {
    console.log('user disconnected');
    // remove this player from our players object
    delete players[socket.id];
    // emit a message to all players to remove this player
    io.emit('disconnect', socket.id);
    currentPlayers-=1;
  })
})


server.listen(PORT, () => console.log('Listening on port', PORT))


