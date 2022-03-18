import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { MeetingService } from 'src/app/services/meeting.service';
import { SocketService } from 'src/app/services/socket.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  roomForm = new FormGroup({
    room_name: new FormControl(''),
    participant_name: new FormControl(''),
  });
  
  private socket;
  constructor(
    private router: Router,
    private meetingService : MeetingService,
    private socketService: SocketService,
  ) { 
    this.socket = this.socketService.socket;
  }
  

  ngOnInit(): void {
  }
  onSubmit(){
      // console.log(this.roomForm.value) // {roomName: 'asd', participantName: 'asd'}
      const data = this.roomForm.value;
      this.socket.emit('userInfo', data)
      this.router.navigate(['/' + data.room_name]);
  }
}
