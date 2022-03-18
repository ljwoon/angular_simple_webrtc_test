import { Component, ElementRef, OnInit, QueryList, ViewChildren } from '@angular/core';
import { SocketService } from 'src/app/services/socket.service';
import { WebRtcPeer } from 'kurento-utils';

@Component({
  selector: 'app-meeting',
  templateUrl: './meeting.component.html',
  styleUrls: ['./meeting.component.scss']
})
export class MeetingComponent implements OnInit {

  private socket;
  localStream$: any;
  participants: any = {};
  myName: string;
  muted = false;
	cameraOff = false;
  participant_name: string;

  @ViewChildren('participants') public participantsRef: QueryList<ElementRef>;
	get participantsElement(): HTMLDivElement {
		return this.participantsRef.last.nativeElement;
	}

  constructor(
    private socketService: SocketService,
  ) {
    this.socket = socketService.socket;
  }

  ngOnInit(): void {

    this.socket.on('myUserInfo', (res:any) => {
      console.log('my Information')
      console.log(res)
      this.myName = res.participant_name
    })

    const options = {
      audio: true,
      video: true,
    }

    this.localStream$ = navigator.mediaDevices.getUserMedia(options)
    this.registerSocketListener();
  }
  /**
     * 1. Socket Listener 등록
     *  실제로는 listener 해제도 추가해야함.
     */
  private registerSocketListener() {

    // Socket Code
    this.socket.on("existingParticipants", (data) => {
      console.log(data)
      this.onExistingParticipants(data);
    });
    this.socket.on("newParticipantArrived", (data) => {
      this.onNewParticipant(data);
    });
    // // 나중에 구현
    // this.socket.on("participantLeft", (data) => {
    //   console.log("participantLeft---------------", data)
    //   this.onParticipantLeft(data);
    // });
    this.socket.on("receiveVideoAnswer", (data) => {
      console.log(data)
      this.receiveVideoResponse(data);
    });
    // this.socket.on("iceCandidate", (data) => {
    //   console.log(data)
    //   this.participants[data.userId].rtcPeer.addIceCandidate(data.candidate, function (error) {
    //     if (error) {
    //       console.error("Error adding candidate: " + error);
    //       return;
    //     }
    //   });
    // });

    this.socket.on("updateremoteVideo", (user) => {
      var participant = this.participants[user.part];
      participant.dispose();
      delete this.participants[user.userId];
    });
  }

  onNewParticipant(request) {
		this.receiveVideo(request);
  	}

  //https://github.com/peterkhang/ionic-demo/blob/a5dc3bef1067eb93c2070b4d8feb233ac6d3427a/src/app/pages/videoCall/video-call.page.ts#L169
  async onExistingParticipants(msg) {


    var participant = new Participant(this.socketService, this.myName, this.myName, this.myName, this.participantsElement);
    this.participants[this.myName] = participant;

    var video = participant.getVideoElement();
    console.log(video)

    const constraints = {
      audio: true,
      video: true,
    }
  
    const options = {
      videoStream: this.localStream$,
      localVideo: video,
      mediaConstraints: constraints,
      onicecandidate: participant.onIceCandidate.bind(participant)
    }
 
    participant.rtcPeer = WebRtcPeer.WebRtcPeerSendonly(options,
      function (error:any) {
        if (error) {
          return console.error(error);
        }
        this.generateOffer(participant.offerToReceiveVideo.bind(participant));
      });


    // /************************************************************************   
    // *  msg.data =>  ['user1', 'user2' ...]
    // *  늦게 room에 들어온 사람이 room에 이미 들어온 사람들의 데이터를 받는다.
    // ************************************************************************/
    // msg.data.forEach(this.receiveVideo);
    msg.data.forEach(existingUsers => {
      this.receiveVideo(existingUsers)

    });
    console.log(msg.data)
  }



  receiveVideo(sender) {
		console.log(sender)

		var participant = new Participant(this.socketService, this.myName, sender.name, sender.name, this.participantsElement);
		this.participants[sender.name] = participant;
		var video = participant.getVideoElement();
	

		var options = {
			remoteVideo: video,
			onicecandidate: participant.onIceCandidate.bind(participant)
		}

		participant.rtcPeer = WebRtcPeer.WebRtcPeerRecvonly(options,
			function (error) {
				if (error) {
					return console.error(error);
				}
				this.generateOffer(participant.offerToReceiveVideo.bind(participant));
			}
		);

	}

  receiveVideoResponse(result) {
		console.log(result.name)
		this.participants[result.name].rtcPeer.processAnswer(result.sdpAnswer, function (error) {
			if (error) return console.error(error);
		});
		if (this.muted) {
			this.participants[result.name].rtcPeer.audioEnabled = false;
		}
		if (this.cameraOff) {
			this.participants[result.name].rtcPeer.videoEnabled = false;
		}
	}

 
}



var participants_name = [];
function checkClass(names) {
	names.forEach(name => {
		var isExist = document.getElementById(name).className;

		if (isExist === "bigvideo") {
			document.getElementById(name).classList.remove("bigvideo");
			document.getElementById(name).className = "smallvideo";
		} 		
	});

}

function Participant(socketService, userId, receiveUserid, userName, participants) {
  console.log('userId = ', userId, 'receiveUserid = ', receiveUserid)
  const socket = socketService.socket;
  participants_name.push(receiveUserid);

  this.receiveUserid = receiveUserid;
  var container = document.createElement('div');

  container.id = receiveUserid;

  var p = document.createElement('p');
  var video = document.createElement('video');

  container.appendChild(video);
  container.appendChild(p);

  if (userId === receiveUserid) {
    container.className = "bigvideo";
    p.style.color = 'yellow'
  } else {
    container.className = "smallvideo";
  }

  participants.appendChild(container);
  document.getElementById('remote_video').appendChild(container);

  p.appendChild(document.createTextNode(userName));

  container.onclick = function () {
    checkClass(participants_name);
    container.classList.toggle("bigvideo");
    document.getElementById(receiveUserid).classList.remove("smallvideo");
  }


  video.id = 'video-' + receiveUserid;
  video.autoplay = true;
  video.controls = false;

  this.getElement = function () {
    return container;
  }

  this.getVideoElement = function () {
    return video;
  }

  this.getContainer = function (receiveUserid) {
    var isExist = document.getElementById(receiveUserid).className;
    // isExist = 'bigvideo'
    console.log(isExist)
    return isExist;
  }

  this.offerToReceiveVideo = function (error, offerSdp, wp) {
    if (error) return console.error("sdp offer error")
    console.log('Invoking SDP offer callback function');
    var msg = {
      id: "receiveVideoFrom",
      sender: receiveUserid,
      sdpOffer: offerSdp
    };
    sendMessage(msg);
  }


  this.onIceCandidate = function (candidate, wp) {
    console.log("Local candidate" + candidate);

    var message = {
      id: 'onIceCandidate',
      candidate: candidate,
      sender: receiveUserid
    };
    sendMessage(message);
  }

  Object.defineProperty(this, 'rtcPeer', { writable: true });

  this.dispose = function () {
    console.log('Disposing participant ' + this.receiveUserid);
    this.rtcPeer.dispose();
    // container.parentNode.removeChild(container);
    container.parentNode.removeChild(container);
  };

  function sendMessage(message) {
    console.log('Senging message: ' + message.id);
    socket.emit(message.id, message);
  }
}