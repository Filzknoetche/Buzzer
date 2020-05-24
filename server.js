// Setup basic express server
let express = require('express');
let app = express();
let path = require('path');
let server = require('http').createServer(app);
let io = require('socket.io')(server);
let port = process.env.PORT || 3003;

server.listen(port, () => {
    console.log('Server listening at port %d', port);
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/p/:tagId', function(req, res) {
    res.send("tagId is set to " + req.params.tagId);
});

let userid;
let numUsers = 0;
let numRooms = 0;
let id = 1;
let users = {};
let rooms = {};
let roompasswords = {};


io.on('connection', (socket) => {
  let addedUser = false;
    socket.emit('userconnected', {numUsers: numUsers, rooms: rooms, numRooms: numRooms});

    socket.on('add user', (username) => {
        //console.log(username);
        
        if (addedUser) return;
        userid = id;
        id++;
        users[socket.id] = {id:userid, sockid:socket.id, username:username, inGame: false};
        // we store the username in the socket session for this client
        socket.username = username;
        socket.userid = userid;
        ++numUsers;
        addedUser = true;
        socket.emit('login', {
            username: username,
            id:userid,
            sockid:socket.id,
            numUsers: numUsers,
            user: users
        });
        // echo globally (all clients) that a person has connected
        socket.broadcast.emit('user joined', {
            username: socket.username,
            userid: socket.userid,
            numUsers: numUsers,
        });
        io.emit('update-players', users);
    });
    // when the user disconnects.. perform this
    socket.on('disconnect', () => {
        if (addedUser) {
            let userroom;
            --numUsers;
            if (users[socket.id].inGame) {                
                for (let roomid in rooms) {
                    if (rooms[roomid].id == socket.id) {
                        userroom = rooms[roomid];
                        delete rooms[roomid];
                        --numRooms;
                        
                    }else if(rooms[roomid].opponent == socket.username){
                        console.log("lul");
                        delete rooms[roomid].opponent;
                        console.log(rooms);
                        socket.broadcast.to(roomid).emit('opponentLeft', {});
                        
                        //TODO
                        //Sende an Host nachricht das Spieler verlassen hat und setzte so den Raum zurück
                        //Aktuallisiere lobby liste

                        //opponent vom raum zurücksetzten
                        //An host schicken das benutzer weg ist
                        
                    }
                }
            }
            delete users[socket.id];
            
            // echo globally that this client has left
            socket.broadcast.emit('user left', {
                username: socket.username,
                numUsers: numUsers,
                numRooms: numRooms,
                room: userroom
            });
        }
    });
});
