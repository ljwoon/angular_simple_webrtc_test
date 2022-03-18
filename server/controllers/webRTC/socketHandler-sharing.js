const kurento = require("kurento-client");
const kurentoClient = null;
const Register = require('./register.js');
const Session = require('./session.js');
const minimst = require("minimist");
const url = require('url');
let userRegister = new Register;

const argv = minimst(process.argv.slice(2), {
  default: {
      as_uri: 'http://15.165.65.162:3000',
      ws_uri: 'ws://15.165.65.162:8888/kurento'
  }
});


var participant_name;
var room_name;
var bandwidth;

let meeting_disconnect = null;


let asUrl = url.parse(argv.as_uri);
//let port = asUrl.port;
let wsUrl = url.parse(argv.ws_uri).href;


module.exports = function (wsServer, socket, app) {

  

  const socketWebRTC = wsServer.of('/socketWebRTC');
  // 룸에 참가.
  socket.on('userInfo', (data) => {
    console.log('[data]', data)
    room_name = data.room_name;
    participant_name = data.participant_name;
    data = {
      room_name,
      participant_name
    }
    console.log('room_name : ' + room_name)
    console.log('participant_name : ' + participant_name)
    bandwidth = 100;
    console.log('bandwidth : ' + bandwidth)
    // 소켓 룸 설정
    socket.join(room_name);
    // socket.변수는 소켓에 같이 보내고 싶은 변수(정보)를 담을 수 있다.
    socket.participant_name = participant_name;

    
    // 룸 참가 함수 실행 
    joinRoom(socket, room_name, err => {
      if (err) {
        console.error('join Room error ' + err);
      }
    });

    socketWebRTC.to(socket.id).emit('myUserInfo', data)
    socketWebRTC.emit("roomList_change", Rooms);

  });

  socket.on('changeBitrate', (data) => {
    this.bandwidth = data
    
    let userSession = userRegister.getById(socket.id);
    userSession.setBandWidth(this.bandwidth);
    renegotiation(socket);
    console.log('[ this.bandwidth ]', this.bandwidth)
  })


  socket.on("receiveVideoFrom", (data) => {
    console.log('data.sender---------------------------------')
    console.log(data.sender)
    receiveVideoFrom(socket, data.sender, data.sdpOffer, (error) => {
      if (error) {
        console.error(error);
      }
    });
  });

  socket.on("onIceCandidate", (data) => {
    addIceCandidate(socket, data, (error) => {
      if (error) {
        console.error(error);
      }
    });
  });

  socket.on("Screen_Sharing", async () => {
    console.log('Screen_SharingScreen_Sharing')
    renegotiation(socket);
  });

  socket.on("leaveRoom", (data) => {
    socket.leave(data.room_name);
    leaveRoom(socket, data, err => {
      if (err) {
        console.error('leave Room error ' + err);
      }
    });

  });
  socket.on("change bitrate", (room) => {
    room_name = room.room_name;
    participant_name = socket.participant_name;
    bandwidth = room.bitrate;

    let userSession = userRegister.getById(socket.id);
    userSession.setBandWidth(bandwidth);
    renegotiation(socket);
  });


  socket.on("disconnecting", () => {
    let userSession = userRegister.getById(socket.id);
    if (userSession != undefined) {
      if (userSession.room_name != undefined) {
        meeting_disconnect = "disconnect during a meeting";
        room_name = userSession.room_name;
        participant_name = socket.participant_name;
      }
    }
  });
  socket.on("disconnect", () => {
    if (meeting_disconnect != null) {
      var data = {
        participant_name: participant_name,
        room_name: room_name,
      }
      leaveRoom(socket, data, err => {
        if (err) {
          console.error('leave Room error ' + err);
        }
      });
      meeting_disconnect = null;
    }
  });
}



let rooms = {};

function renegotiation(socket) {
  let userSession = userRegister.getById(socket.id);

  var room = rooms[userSession.room_name];

  var usersInRoom = room.participants;

  //화면 공유하는 클라의 나가는 끝점 해제 
  userSession.outgoingMedia.release();

  //화면 공유하는 클라의 영상을 받는 다른 클라들의 들어오는 끝점 해제
  for (var i in usersInRoom) {
    var user = usersInRoom[i];
    if (user.id === userSession.id) {
      continue;
    }
    user.incomingMedia[userSession.name].release();
    delete user.incomingMedia[userSession.name];
    usersInRoom[i].sendMessage({
      id: 'updateremoteVideo',
      name: userSession.name
    });



  }


  room.pipeline.create('WebRtcEndpoint', (error, outgoingMedia) => {
    if (error) {
      if (Object.keys(room.participants).length === 0) {
        room.pipeline.release();
      }
      return callback(error);
    }
    //userSession.setBandWidth(bandwidth);
    bandwidth = userSession.bandwidth;
    outgoingMedia.setMaxVideoRecvBandwidth(bandwidth);
    outgoingMedia.setMinVideoRecvBandwidth(bandwidth);
    userSession.setOutgoingMedia(outgoingMedia);

    console.log(' [ webRtc bandwidth ]', bandwidth)

    let iceCandidateQueue = userSession.iceCandidateQueue[userSession.name];
    if (iceCandidateQueue) {
      while (iceCandidateQueue.length) {
        let message = iceCandidateQueue.shift();
        console.error('user: ' + userSession.id + ' collect candidate for outgoing media');
        userSession.outgoingMedia.addIceCandidate(message.candidate);
      }
    }

    userSession.outgoingMedia.on('OnIceCandidate', event => {
      let candidate = kurento.register.complexTypes.IceCandidate(event.candidate);
      userSession.sendMessage({
        id: 'iceCandidate',
        name: userSession.name,
        candidate: candidate
      });
    });

    let usersInRoom = room.participants;
    let existingUsers = [];
    for (let i in usersInRoom) {
      if (usersInRoom[i].name != userSession.name) {
        existingUsers.push(usersInRoom[i].name);
      }
    }
    
    socket.emit('Screen_Sharing', '');

    for (let i in usersInRoom) {
      if (usersInRoom[i].name != userSession.name) {
        usersInRoom[i].sendMessage({
          id: 'newParticipantArrived',
          name: userSession.name
        });
      }
    }

  });

}

const Rooms = [];
const RoomNumClient = [];

function RoomList(data) {
    const meeting_info = {
        meeting_master : data.meeting_master,
        meeting_name : data.meeting_name,
        meeting_date : data.meeting_date,
        meeting_time : data.meeting_time,
        meeting_num :  RoomNumClient[data.meeting_name],
    }
    Rooms.push(meeting_info);
    return Rooms;
}

function leaveRoom(socket, data, callback) {
  isHangup = true;
  HangUp_user = data.participant_name;
  room_name = data.room_name;
  // RoomNumClient[room_name] -= 1;

  // const index = Rooms.findIndex(obj => obj.meeting_name == room_name);
  // Rooms[index].meeting_num = RoomNumClient[room_name];

  // wsServer.emit("roomList_change", Rooms);

  // let meeting_num = Rooms[index].meeting_num;

  // wsServer.to(room_name).emit("meeting_num", meeting_num);


  let userSession = userRegister.getById(socket.id);

  if (!userSession) {
    return;
  }

  var room = rooms[userSession.room_name];

  if (!room) {
    return;
  }

  console.log('notify all user that ' + userSession.name + ' is leaving the room ' + room_name);

  var usersInRoom = room.participants;
  delete usersInRoom[userSession.name];
  userSession.outgoingMedia.release();

  for (var i in userSession.incomingMedia) {
    userSession.incomingMedia[i].release();
    delete userSession.incomingMedia[i];
  }

  var data = {
    id: 'participantLeft',
    name: userSession.name
  };
  for (var i in usersInRoom) {
    var user = usersInRoom[i];
    // release viewer from this
    user.incomingMedia[userSession.name]?.release();
    delete user.incomingMedia[userSession.name];
    // notify all user in the room
    user.sendMessage(data);
  }

  // Release pipeline and delete room when room is empty
  if (Object.keys(room.participants).length == 0) {
    room.pipeline.release();
    delete rooms[userSession.room_name];
  }
  delete userSession.room_name;
}

// 룸 참가
function joinRoom(socket, room_name, callback) {
  // get room 룸정보 가져오기 
  getRoom(room_name, (error, room) => {
    if (error) {
      console.log('error');
      callback(error);
      return;
    }
    // join user to room 
    join(socket, room, (err, user) => {
      console.log('join success : ' + socket.participant_name);
      if (err) {
        callback(err);
        return;
      }
      callback();
    });
  });
}

function getRoom(room_name, callback) {
  let room = rooms[room_name];
  if (room == null) {
    console.log('create new room : ' + room_name);
    getKurentoClient((error, kurentoClient) => {
      if (error) {
        return callback(error);
      }
      kurentoClient.create('MediaPipeline', (error, pipeline) => {
        if (error) {
          return callback(error);
        }
        room = {
          name: room_name,
          pipeline: pipeline,
          participants: {},
          kurentoClient: kurentoClient
        };

        rooms[room_name] = room;
        callback(null, room);
      });
    });

  } else {
    console.log('get existing room : ' + room_name);
    callback(null, room);
  }
}

// 가져온 룸에 참가
function join(socket, room, callback) {
  let participant_name = socket.participant_name;
  console.log(participant_name)
  console.log(room.name)
  let userSession = new Session(socket, participant_name, room.name);
  userRegister.register(userSession);


  room.pipeline.create('WebRtcEndpoint', (error, outgoingMedia) => {
    if (error) {
      console.error('no participant in room');
      if (Object.keys(room.participants).length === 0) {
        room.pipeline.release();
      }
      return callback(error);
    }
    userSession.setBandWidth(bandwidth);

    outgoingMedia.setMaxVideoRecvBandwidth(bandwidth);
    outgoingMedia.setMinVideoRecvBandwidth(bandwidth);
    userSession.setOutgoingMedia(outgoingMedia);

    let iceCandidateQueue = userSession.iceCandidateQueue[userSession.name];

    if (iceCandidateQueue) {
      while (iceCandidateQueue.length) {
        let message = iceCandidateQueue.shift();
        console.error('user: ' + userSession.id + ' collect candidate for outgoing media');
        userSession.outgoingMedia.addIceCandidate(message.candidate);
      }
    }

    userSession.outgoingMedia.on('OnIceCandidate', event => {

      let candidate = kurento.register.complexTypes.IceCandidate(event.candidate);
      userSession.sendMessage({
        id: 'iceCandidate',
        name: userSession.name,
        candidate: candidate
      });
    });
    let usersInRoom = room.participants;
    for (let i in usersInRoom) {
      if (usersInRoom[i].name != userSession.name) {
        usersInRoom[i].sendMessage({
          id: 'newParticipantArrived',
          name: userSession.name
        });
      }
    }

    let existingUsers = [];
    for (let i in usersInRoom) {
      if (usersInRoom[i].name != userSession.name) {
        existingUsers.push(usersInRoom[i].name);
      }
    }
    console.log('existingUsers-----------------------------')
    console.log(existingUsers)
    userSession.sendMessage({
      id: 'existingParticipants',
      data: existingUsers,
      room_name: room.name
    });

    room.participants[userSession.name] = userSession;

    callback(null, userSession);
  });
}

function receiveVideoFrom(socket, senderName, sdpOffer, callback) {

  let userSession = userRegister.getById(socket.id);
  let sender = userRegister.getByName(senderName);
  console.log('sender : ' + sender)
  getEndpointForUser(userSession, sender, (error, endpoint) => {
    if (error) {
      console.error(error);
      callback(error);
    }

    endpoint.processOffer(sdpOffer, (error, sdpAnswer) => {
      console.log(`process offer from ${sender.name} to ${userSession.name}`);
      if (error) {
        return callback(error);
      }
      let data = {
        id: 'receiveVideoAnswer',
        name: sender.name,
        sdpAnswer: sdpAnswer
      };
      userSession.sendMessage(data);

      endpoint.gatherCandidates(error => {
        if (error) {
          return callback(error);
        }
      });

      return callback(null, sdpAnswer);
    });
  });
}


function getKurentoClient(callback) {
  kurento(wsUrl, (error, kurentoClient) => {
    if (error) {
      let message = 'Could not find media server at address ${wsUrl}';
      return callback(message + 'Exiting with error ' + error);
    }
    callback(null, kurentoClient);
  });
}

function addIceCandidate(socket, message, callback) {
  let user = userRegister.getById(socket.id);
  if (user != null) {
    // assign type to IceCandidate
    let candidate = kurento.register.complexTypes.IceCandidate(message.candidate);
    user.addIceCandidate(message, candidate);
    callback();
  } else {
    console.error(`ice candidate with no user receive : ${message.sender}`);
    callback(new Error("addIceCandidate failed"));
  }
}
function getEndpointForUser(userSession, sender, callback) {

  if (userSession.name === sender.name) {
    return callback(null, userSession.outgoingMedia);
  }

  let incoming = userSession.incomingMedia[sender.name];
  console.log(userSession.name + "    " + sender.name);
  if (incoming == null) {
    console.log(`user : ${userSession.id} create endpoint to receive video from : ${sender.id}`);
    getRoom(userSession.room_name, (error, room) => {
      if (error) {
        console.error(error);
        callback(error);
        return;
      }
      room.pipeline.create('WebRtcEndpoint', (error, incoming) => {
        if (error) {
          if (Object.keys(room.participants).length === 0) {
            room.pipeline.release();
          }
          console.error('error: ' + error);
          callback(error);
          return;
        }

        console.log(`user: ${userSession.name} successfully create pipeline`);
        incoming.setMaxVideoRecvBandwidth(bandwidth);
        incoming.setMinVideoRecvBandwidth(bandwidth);
        userSession.incomingMedia[sender.name] = incoming;


        // add ice candidate the get sent before endpoints is establlished
        let iceCandidateQueue = userSession.iceCandidateQueue[sender.name];
        if (iceCandidateQueue) {
          while (iceCandidateQueue.length) {
            let message = iceCandidateQueue.shift();
            console.log(`user: ${userSession.name} collect candidate for ${message.data.sender}`);
            incoming.addIceCandidate(message.candidate);
          }
        }

        incoming.on('OnIceCandidate', event => {

          let candidate = kurento.register.complexTypes.IceCandidate(event.candidate);
          userSession.sendMessage({
            id: 'iceCandidate',
            name: sender.name,
            candidate: candidate
          });
        });

        sender.outgoingMedia.connect(incoming, error => {
          if (error) {
            console.log(error);
            callback(error);
            return;
          }
          callback(null, incoming);
        });
      });
    })
  } else {
    console.log(`user: ${userSession.name} get existing endpoint to receive video from: ${sender.name}`);
    sender.outgoingMedia.connect(incoming, error => {
      if (error) {
        callback(error);
      }
      callback(null, incoming);
    });
  }
}


