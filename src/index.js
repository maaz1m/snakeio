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
 
function preload() {
    this.load.image('ball', 'assets/ball.png');
}

function addPlayer(self, playerInfo) {
    self.snake = self.physics.add.image(playerInfo.x, playerInfo.y, 'ball').setOrigin(0.5, 0.5);
}

function addOther(self, playerInfo) {
    const otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, 'ball').setOrigin(0.5, 0.5);
    otherPlayer.playerId = playerInfo.playerId;
    self.otherPlayers.add(otherPlayer);
}
 
function create() {

    //Enable cursor
    this.cursors = this.input.keyboard.createCursorKeys();

    var self = this;
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


    this.socket.on('playerMoved', function (playerInfo) {
        console.log('movement recieved')
        self.otherPlayers.getChildren().forEach(function (otherPlayer) {
            if (playerInfo.playerId === otherPlayer.playerId) {
                otherPlayer.setRotation(playerInfo.rotation);
                otherPlayer.setPosition(playerInfo.x, playerInfo.y);
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
}
 
function update() {
    if(this.snake){

        if (this.cursors.left.isDown) {
            this.snake.setAngularVelocity(-150);
        } else if (this.cursors.right.isDown) {
            this.snake.setAngularVelocity(150);
        } else{
            this.snake.setAngularVelocity(0);
        }

        if (this.cursors.up.isDown) {
            this.physics.velocityFromRotation(this.snake.rotation, 100, this.snake.body.velocity)
        } else {
            this.snake.body.velocity.setTo(0,0);
        }
    
        this.physics.world.wrap(this.snake, 5);

        var x = this.snake.x;
        var y = this.snake.y;
        var r = this.snake.rotation;

        if (this.snake.oldPosition && (x !== this.snake.oldPosition.x || y !== this.snake.oldPosition.y || r !== this.snake.oldPosition.rotation)) {
            console.log('movement emitted')
            this.socket.emit('playerMovement', { x: this.snake.x, y: this.snake.y, rotation: this.snake.rotation });
        }
        // save old position data
        this.snake.oldPosition = {
            x: this.snake.x,
            y: this.snake.y,
            rotation: this.snake.rotation
        };            
    }

  

    
}