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

const numSpacer = 12;

function preload() {
  this.load.image('ball', 'assets/ball.png');
  this.load.image('food', 'assets/food.png');
}

function addPlayer(self, playerInfo) {
  self.snakeLength = playerInfo.len
  self.snakeHead = self.physics.add.image(playerInfo.x, playerInfo.y, 'ball').setOrigin(0.5, 0.5).setTint(playerInfo.color);
  self.snakeBody = Array(playerInfo.len) //snakeBody.map(pos => { return self.physics.add.image(pos.x, pos.y, 'ball').setOrigin(0.5,0.5); })
  self.snakePath = Array(playerInfo.len*numSpacer)
  for(let i =1; i<=playerInfo.len-1; i++){

    self.snakeBody[i] = self.physics.add.image(playerInfo.x,playerInfo.y,'ball').setOrigin(0.5,0.5).setTint(playerInfo.color);

    if(i>2){
      self.ownBody.add(self.snakeBody[i])      
    }
  }

  for (var i = 0; i < self.snakeLength*numSpacer; i++) {

    self.snakePath[i] = {x: playerInfo.x, y: playerInfo.y}

  }
}

function addOther(self, playerInfo) {
  var otherPlayer = {}
  otherPlayer.head = self.add.sprite(playerInfo.x, playerInfo.y, 'ball').setTint(playerInfo.color)
  //otherPlayer.playerId = playerInfo.playerID
  self.otherHeads.add(otherPlayer.head)
  otherPlayer['body'] = new Array()
  otherPlayer['path'] = playerInfo['path']

  otherPlayer.head.setRotation(playerInfo.rotation)
  for(let i =1; i<=playerInfo.len-1; i++){
    otherPlayer['body'][i] = self.add.sprite(playerInfo['body'][i].x, playerInfo['body'][i].y,'ball').setOrigin(0.5,0.5).setTint(playerInfo.color);
    otherPlayer['body'][i].playerId = playerInfo.playerId;
    self.otherBodies.add(otherPlayer['body'][i])
  }

  self.otherPlayers[playerInfo.playerId] = otherPlayer

  // otherHead.playerId = playerInfo.playerId;
  // self.otherPlayers.add(otherHead);
}

function create() {

  //Enable cursor
  this.cursors = this.input.keyboard.createCursorKeys();

  var self = this;

  this.alive = true; //Player moves only till they are alive
  this.grace = true; // Initial Grace Period: Nobody dies until game officially starts
  this.socket = io();
  this.otherPlayers = {};
  this.otherHeads = this.physics.add.group();
  this.otherBodies = this.physics.add.group()
  this.ownBody = this.physics.add.group();

  this.socket.on('renderGame', function (players) {
    //iterate over the player info object from server
    Object.keys(players).forEach(function (id) {
      if (players[id].playerId === self.socket.id) {
        addPlayer(self, players[id]);
      } else {
        addOther(self, players[id])
      }
    });

    //Collision handlers
    self.physics.add.overlap(self.ownBody, self.snakeHead, ()=>{
      console.log('self collison')
    }) //add callback
    self.physics.add.overlap(self.otherBodies, self.snakeHead, ()=>{
      console.log('eating other snake') // If you collide with a snake from the side, you die
      self.alive = false;
      self.socket.emit('crash',{})
    }) //add callback
    self.physics.add.overlap(self.otherHeads, self.ownBody, ()=>{
      console.log('getting eaten') // Other player dies 
    }) //add callback

  });

  this.socket.on('newPlayer', function (playerInfo) {
    addOther(self, playerInfo);
  });

  this.socket.on('playerMoved', function (playerInfo) {
    var otherPlayer = self.otherPlayers[playerInfo.playerId]

    otherPlayer.head.setRotation(playerInfo.rotation);
    otherPlayer.head.setPosition(playerInfo.x, playerInfo.y);
    var segment = otherPlayer['path'].pop();
    segment = {x: otherPlayer.head.x, y: otherPlayer.head.y};

    otherPlayer['path'].unshift(segment);
    for (var i = 1; i<=playerInfo.len-1; i++)
    {
      otherPlayer['body'][i].x = (otherPlayer['path'][i * numSpacer]).x;
      otherPlayer['body'][i].y = (otherPlayer['path'][i * numSpacer]).y;
    }
  })


  this.socket.on('disconnect', function (playerId) {
  });

  this.socket.on('crash', function (playerId) {
    /*for(key in self.otherPlayers){
      console.log(`Recieved message to remove ${playerId}`)
      if (playerId === key) {
        console.log(`Removing ${playerId}`);
        delete self.otherPlayers[key];
      }
   }*/
    let key = playerId;
    delete self.otherPlayers[key];
    console.log(`Deleted dict entry for ${key}`);
    self.otherBodies.getChildren().forEach(ob => {
      if(ob.playerId === key){
        ob.destroy();
        console.log(`Found body match for ${key}`);
      }
    })
    console.log(`Body deleted for ${key}`);
    self.otherHeads.getChildren().forEach(ob => {
      if(ob.playerId === key){
        ob.destroy();
      }
    })
    console.log(`Head deleted for ${key}`);

  })


  // this.socket.on('grace', (_) => {
  //   self.grace = false;

  // });

  this.socket.on('foodLocation', function (foodLocation) {
    if (self.food) self.food.destroy();
    self.food = self.physics.add.image(foodLocation.x, foodLocation.y, 'food');
    self.physics.add.overlap(self.snakeHead, self.food, function () {
      this.socket.emit('foodCollected');
    }, null, self);
  });

  this.socket.on('grow', (playerInfo)=>{
    // if(self.otherPlayers[playerInfo.playerId]){
    //   ;
    // }else{
    //   self.snakeBody.push(sel)
    // }
  })


}

function update() {
  if(this.alive && this.snakeHead){

    if (this.cursors.left.isDown) {
      this.snakeHead.setAngularVelocity(-200);
      //console.log('Turning left');
    } else if (this.cursors.right.isDown) {
      this.snakeHead.setAngularVelocity(200);
      //console.log('Turning right');
    } else{
      this.snakeHead.setAngularVelocity(0);
    }
    this.physics.velocityFromRotation(this.snakeHead.rotation, 100, this.snakeHead.body.velocity);

    var segment = this.snakePath.pop();
    segment = {x: this.snakeHead.x, y: this.snakeHead.y};

    this.snakePath.unshift(segment);
    for (var i = 1; i<=this.snakeLength-1; i++)
    {
      this.snakeBody[i].x = (this.snakePath[i * numSpacer]).x;
      this.snakeBody[i].y = (this.snakePath[i * numSpacer]).y;
    }

    this.physics.world.wrap(this.snakeHead, 5);

    var x = this.snakeHead.x; 
    var y = this.snakeHead.y;
    var r = this.snakeHead.rotation;

    if (this.snakeHead.oldPosition && (x !== this.snakeHead.oldPosition.x || y !== this.snakeHead.oldPosition.y || r !== this.snakeHead.oldPosition.rotation)) {
      this.socket.emit('playerMovement', {x: this.snakeHead.x, y: this.snakeHead.y, rotation: this.snakeHead.rotation, body: this.snakeBody, path: this.snakePath});
    }

    // save old position data
    this.snakeHead.oldPosition = {
      x: this.snakeHead.x,
      y: this.snakeHead.y,
      rotation: this.snakeHead.rotation
    };            

  }
}
