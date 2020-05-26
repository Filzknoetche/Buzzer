// Setup basic express server
let express = require("express");
let app = express();
let path = require("path");
let server = require("http").createServer(app);
let io = require("socket.io")(server);
let port = process.env.PORT || 3003;

server.listen(port, () => {
  console.log("Server listening at port %d", port);
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/:roomid", function (req, res) {
  res.send("roomid is " + req.params.roomid);
});

let userid;
let numUsers = 0;
let numRooms = 0;
let id = 1;
let users = {};
let rooms = {};
let roompasswords = {};

io.on("connection", (socket) => {
  let addedUser = false;
  socket.emit("userconnected", {
    numUsers: numUsers,
    rooms: rooms,
    numRooms: numRooms,
  });

  socket.on("add user", (username) => {
    if (addedUser) return;
    userid = id;
    id++;
    users[socket.id] = {
      id: userid,
      sockid: socket.id,
      username: username,
      inGame: false,
    };
    socket.username = username;
    socket.userid = userid;
    ++numUsers;
    addedUser = true;
    socket.emit("login", {
      username: username,
      id: userid,
      sockid: socket.id,
      numUsers: numUsers,
      user: users,
    });
    socket.broadcast.emit("user joined", {
      username: socket.username,
      userid: socket.userid,
      numUsers: numUsers,
    });
    io.emit("update-players", users);
  });
  socket.on("disconnect", () => {
    if (addedUser) {
      let userroom;
      --numUsers;
      if (users[socket.id].inGame) {
        for (let roomid in rooms) {
          if (rooms[roomid].id == socket.id) {
            userroom = rooms[roomid];
            delete rooms[roomid];
            --numRooms;
          } else if (rooms[roomid].opponent == socket.username) {
            console.log("lul");
            delete rooms[roomid].opponent;
            console.log(rooms);
            socket.broadcast.to(roomid).emit("opponentLeft", {});
          }
        }
      }
      delete users[socket.id];

      socket.broadcast.emit("user left", {
        username: socket.username,
        numUsers: numUsers,
        numRooms: numRooms,
        room: userroom,
      });
    }
  });

  socket.on("hostCreateNewGame", hostCreateNewGame);
  socket.on("playerJoinGame", playerJoinGame);

  function hostCreateNewGame(data) {
    // Create a unique Socket.IO Room
    let thisGameId = (Math.random() * 100000) | 0;
    let players = [];
    let element = {};
    element.player = data.username;
    element.admin = true;
    players.push(element);
    rooms[thisGameId] = {
      id: data.id,
      roomid: thisGameId,
      roomname: data.roomname,
      maxplayer: data.roommaxplayer,
      owner: data.username,
      players: players,
      password: data.roompassword == "" ? false : true,
    };
    roompasswords[thisGameId] = {
      id: data.id,
      roomid: thisGameId,
      password: data.roompassword,
    };
    ++numRooms;
    let user = users[socket.id];
    user.inGame = true;
    // Return the Room ID (gameId) and the socket ID (mySocketId) to the browser client
    socket.emit("newGameCreated", {
      gameId: thisGameId,
      mySocketId: data.id,
      roomname: data.roomname,
    });
    io.emit("update-lobbylist", {
      rooms: rooms[thisGameId],
      numRooms: numRooms,
    });
    // Join the Room and wait for the players
    socket.join(thisGameId.toString());
  }

  function playerJoinGame(data) {
    var room = io.nsps["/"].adapter.rooms[data.room];
    if (room) {
      let room = rooms[data.room];
      if (room.players.length < room.maxplayer) {
        console.log("join");

        let user = users[socket.id];
        user.inGame = true;
        let players = room.players;
        let element = {};
        element.player = data.name;
        element.admin = false;
        players.push(element);
        Object.assign(room, { players: players });
        socket.join(data.room);
        socket.broadcast
          .to(data.room)
          .emit("player1", { name: data.name, room: room });
        //socket.emit('player2', { name: data.name, id: data.room, room: room});
        io.emit("update-lobbylist", { rooms: rooms[data.room] });
      } else {
        console.log("voll");
        socket.emit("err", { message: "Sorry, der Raum ist voll!" });
      }
    }
  }
});
