$(function () {
  let socket = io();
  let $window = $(window);
  let useronline = $("#user-online span");
  let usersonline = $("#users-online");
  let $usernameInput = $(".usernameInput"); // Input for username
  let $currentInput = $usernameInput.focus();
  let $loginPage = $(".login.page");
  let connected = false;
  let username;
  let userid;
  let id;
  let player;

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

  const log = (message, options) => {};

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
    console.log(data);

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
      //$roomlistview.fadeIn();
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
    log(data.username + " joined");
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'user left', log it in the chat body
  socket.on("user left", (data) => {
    log(data.username + " left");
    addParticipantsMessage(data);
    addRooms(data);
    if (data.room != null) {
      $("#rooms tr").remove(":contains(" + data.room.roomid + ")");
    }
  });
});
