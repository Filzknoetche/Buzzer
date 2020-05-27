$(function () {
  let socket = io();
  let $window = $(window);
  let useronline = $("#user-online span");
  let usersonline = $("#users-online");
  let $usernameInput = $(".usernameInput"); // Input for username
  let $currentInput = $usernameInput.focus();
  let $loginPage = $(".login.page");
  let $roomlist = $(".roomlist");
  let $createroom = $(".createroom");
  let $roomNameAndId = $("#room");
  let $game = $('.game');
  let $lobby = $('.lobby');
  let $lobbylist = $('.lobby-list');
  let connected = false;
  let username;
  let userid;
  let id;
  let player;
  let game;

  class Player {
    constructor(name, id) {
      this.name = name;
      this.id = id;
    }

    getPlayerName() {
      return this.name;
    }
    getPlayerId() {
      return this.id;
    }
  }

  class Game {
    constructor(roomId, roomName) {
      this.roomId = roomId;
      this.roomName = roomName;
    }
  }

  socket.on("userconnected", (data) => {
    addParticipantsMessage(data);
    addRooms(data);

    for (let roomid in data.rooms) {
      let pw = !data.rooms[roomid].password ? "Nein" : "Ja";
      let players = data.rooms[roomid].opponent == null ? "1" : "2";
      $("#rooms").append(
        "<tr><td data-room=" +
          data.rooms[roomid].roomid +
          ' style="display: none">' +
          data.rooms[roomid].roomid +
          "</td><td>" +
          data.rooms[roomid].roomname +
          "</td><td id='players-" +
          data.rooms[roomid].roomid +
          "'>" +
          players +
          "/2</td><td>" +
          pw +
          "</td><td>" +
          data.rooms[roomid].owner +
          "</td></tr>"
      );
    }
  });

  const addParticipantsMessage = (data) => {
    useronline.html(data.numUsers);
    usersonline.html(data.numUsers);
  };

  const addRooms = (data) => {
    $("#rooms-online").html(data.numRooms);
  };

  $window.keydown((event) => {
    // Auto-focus the current input when a key is typed
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $currentInput.focus();
    }
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      if (event.target.className === "usernameInput") {
        setUsername();
      }
    }
  });

  const setUsername = () => {
    username = cleanInput($usernameInput.val().trim());
    // If the username is valid
    if (username && username.length >= 1 && username.length < 15) {
      // Tell the server your username
      socket.emit("add user", username);
      $loginPage.fadeOut();
      $roomlist.fadeIn();
      $loginPage.off("click");
    } else {
      console.log("Inkorrekter Benutzername");
    }
  };

  // Prevents input from having injected markup
  const cleanInput = (input) => {
    return $("<div/>").text(input).html();
  };

  // Whenever the server emits 'login', log the login message
  socket.on("login", (data) => {
    connected = true;
    userid = data.id;
    id = data.sockid;
    username = data.username;
    addParticipantsMessage(data);
    player = new Player(data.username, userid);
  });

  // Whenever the server emits 'user joined', log it in the chat body
  socket.on("user joined", (data) => {
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'user left', log it in the chat body
  socket.on("user left", (data) => {
    addParticipantsMessage(data);
    addRooms(data);
    if (data.room != null) {
      $("#rooms tr").remove(":contains(" + data.room.roomid + ")");
    }
  });

  $("#btnCreateRoom").on("click", function () {
    console.log("Create");
    $roomlist.fadeOut();
    $createroom.fadeIn();

    $("#btnCreateGame").on("click", function () {
      let roomname = cleanInput($("#roomname").val().trim());
      let roommaxplayer = $("#roommaxplayer").val();
      let roompassword = cleanInput($("#roompassword").val().trim());
      console.log(roomname + " " + roommaxplayer + " " + roompassword);

      if (roomname.length >= 1) {
        var data = {
          username: player.getPlayerName(),
          roomname: roomname,
          roompassword: roompassword,
          roommaxplayer: roommaxplayer,
          id: player.getPlayerId(),
          game,
        };
        socket.emit("hostCreateNewGame", data);
      } else {
        console.log("Raumname zu kurz");
      }
    });
  });

  $("#btnJoinRoom").click(function() {
    $roomlist.hide();
    $lobbylist.show();
  });

  $("#btnJoin").click(function() {
    const name = username;
    const roomID = $("#inputGameId").val();
    if (!name || !roomID) {
      alert("Please enter your name and game ID.");
      return;
    }
    
    socket.emit("playerJoinGame", { name, room: roomID });
    $lobbylist.hide();
  });

  socket.on("newGameCreated", data => {
    game = new Game(data.gameId, data.roomname);
    $createroom.hide();
    $lobby.show();
    $roomNameAndId.html(data.roomname + "/" + data.gameId);
  });

  $("#userTable").on("dblclick", "tbody tr", function(event) {
    const name = username;
    const roomID = $(this)
      .children()
      .data("room");

    socket.emit("playerWantToJoin", { name, room: roomID });
  });

  socket.on("playerJoined", data => {

    
    
    for (let index in data.room.players) {
      let username = data.room.players[index].player;
      let admin = data.room.players[index].admin;
      console.log(data.room.players[index].player);
      
      $("#playerlist").append(
        "<div>" + username + "</div>"
      );
      
    }
    
  });

});
