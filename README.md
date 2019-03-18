# Snake
Very basic multiplayer online snake game made with Phaser, Node.js and Socket.io.

## Installing and running the game

Clone the repository. Inside the newly created directory, run `npm install` to install the Node.js packages listed in `package.json`. Then run `node server.js` to start the server. The server will listen to connections on port `8000`; you can change that behaviour by editing the code. You can access the app by navigating to http://localhost:8000/index.html/ on a web browser.

## Dev

Use the 'watchify index.js -o bundle.js' so that changes to the index.js file get added to the bundled bundle.js file.
