const io = require('socket.io-client')
const Phaser = require('phaser')

var config = {
  type: Phaser.AUTO,
  parent: 'phaser-example',
  width: 800,
  height: 600,
  physics: {
    default: 'arcade'
    // arcade: {
    //   debug: false,
    //   gravity: { y: 0 }
    // }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  } 
};

var game = new Phaser.Game(config);
const snakeSegments = 12;

function preload() {
  this.load.image('ball', 'assets/ball.png');
}

function addPlayer(self, playerInfo) {
  self.snake = self.physics.add.image(playerInfo.x, playerInfo.y, 'ball').setOrigin(0.5, 0.5);
  var snakeBody = playerInfo["body"];
  self.body = playerInfo["body"];
  self.snakeBody = Array(snakeSegments) //snakeBody.map(pos => { return self.physics.add.image(pos.x, pos.y, 'ball').setOrigin(0.5,0.5); })

  for(let i =0; i<snakeSegments; i++){
    self.snakeBody[i] = self.physics.add.image(playerInfo["body"][i*snakeSegments].x, playerInfo["body"][i*snakeSegments].y,'ball').setOrigin(0.5,0.5);
  }

}

function addOther(self, playerInfo) {
  let otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, 'ball').setOrigin(0.5, 0.5); //{"body": new Array(snakeSegments)}   
  otherPlayer.playerId = playerInfo.playerId;
  self.otherPlayers.add(otherPlayer);
}

function create() {

  //Enable cursor
  this.cursors = this.input.keyboard.createCursorKeys();

  var self = this;

  this.alive = true; //Player moves only till they are alive
  this.grace = true; // Initial Grace Period: Nobody dies until game officially starts
  this.socket = io();
  this.otherPlayers = this.physics.add.group();
  this.socket.on('renderGame', function (players) {
    //iterate over the player info object from server
    Object.keys(players).forEach(function (id) {
      if (players[id].playerId === self.socket.id) {
        addPlayer(self, players[id]);
      } else {
        addOther(self, players[id])
      }
    });
  });

  this.socket.on('newPlayer', function (playerInfo) {
    addOther(self, playerInfo);
  });

  this.socket.on('start', (_) => {
    console.log('Game started!');
    self.alive = true;
  })


  this.socket.on('playerMoved', function (playerInfo) {
    //console.log('movement recieved')

    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerInfo.playerId === otherPlayer.playerId) {
        //console.log(`Updating position for ${otherPlayer.snake.playerId}`);

        otherPlayer.setRotation(playerInfo.rotation);
        otherPlayer.setPosition(playerInfo.x, playerInfo.y);
        /*for(let i =0;i<playerInfo["body"].length;i++){
          otherPlayer.body[i].setPosition(playerInfo["body"].x, playerInfo["body"].y);
        }*/
        for(let i =0;i<snakeSegments;i++){
          //otherPlayer.body[i] = self.add.sprite(playerInfo["body"][i].x , playerInfo["body"][i].y,'ball').setOrigin(0.5,0.5);
          if(!self.grace && self.snake && (self.snake.x > playerInfo.body[i].x && self.snake.x < playerInfo.body[i].x +50) // Collision with other snake
            && (self.snake.y > playerInfo.body[i].y && self.snake.y < playerInfo.body[i].y +50)) {
            console.log('Crashed into opponent');
            self.socket.emit('crash', {});
            self.socket.disconnect();
            self.alive = false;
            break;
          }
        }
      }
    });
  });

  this.socket.on('disconnect', function (playerId) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerId === otherPlayer.playerId) {
        otherPlayer.destroy();
      }
    });
  });
  this.socket.on('crash', function (playerId) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerId === otherPlayer.playerId) {
        otherPlayer.destroy();
      }
    });
  });

  this.socket.on('grace', (_) => {
    self.grace = false;

  });
}

function update() {
  if(this.alive && this.snake){

    if (this.cursors.left.isDown) {
      this.snake.setAngularVelocity(-200);
      //console.log('Turning left');
    } else if (this.cursors.right.isDown) {
      this.snake.setAngularVelocity(200);
      //console.log('Turning right');
    } else{
      this.snake.setAngularVelocity(0);
    }

    this.physics.velocityFromRotation(this.snake.rotation,100, this.snake.body.velocity);

    let sendPos = []


    for(let i = 0; i < snakeSegments; i++){
      this.snakeBody[i].x = this.body[i*snakeSegments].x ;
      this.snakeBody[i].y = this.body[i*snakeSegments].y ;
      this.snakeBody[i].rotation = this.body[i*snakeSegments].rotation;
      sendPos.push({"x":this.snakeBody[i].x , "y": this.snakeBody[i].y, "rotation": this.snakeBody[i].rotation});
    }

    /* Values very close but different hence set doesnt reduce length
    if([... new Set(sendPos)].length != sendPos.length){
      console.log('Self Collision');
    }*/

    //Shittier check for self collision
    for(let i = 0; i< sendPos.length; i++){
      for(let j = 0; j< sendPos.length; j++){
        
        if(!this.grace && i!=j && (sendPos[i].x > sendPos[j].x && sendPos[i].x < sendPos[j].x+5) && (sendPos[i].y > sendPos[j].y && sendPos[i].y < sendPos[j].y+5))
        {
          console.log('Self Collision');
          this.alive = false;
          this.socket.emit('crash',{});
          this.socket.disconnect();
        }
      }
    }

    


    this.physics.world.wrap(this.snake, 5);

    var x = this.snake.x; 
    var y = this.snake.y;
    var r = this.snake.rotation;



    if (this.snake.oldPosition && (x !== this.snake.oldPosition.x || y !== this.snake.oldPosition.y || r !== this.snake.oldPosition.rotation)) {
      //console.log('movement emitted')
      this.socket.emit('playerMovement', { x: this.snake.x, y: this.snake.y, rotation: this.snake.rotation, body: sendPos});
    }
    // save old position data
    this.snake.oldPosition = {
      x: this.snake.x,
      y: this.snake.y,
      rotation: this.snake.rotation
    };            


    this.body.pop();
    this.body.unshift({"x": this.snake.oldPosition.x , "y": this.snake.oldPosition.y, "rotation": this.snake.oldPosition.rotation});
  }
}
