import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { MeetingService } from 'src/app/services/meeting.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  roomForm = new FormGroup({
    roomName: new FormControl(''),
    participantName: new FormControl(''),
  });

  constructor(
    private router: Router,
    private meetingService : MeetingService,
  ) {  }

  ngOnInit(): void {
  }
  onSubmit(){
      // console.log(this.roomForm.value) // {roomName: 'asd', participantName: 'asd'}
      const data = this.roomForm.value;
      this.meetingService.join(data).subscribe((res)=>{
        this.router.navigate(['/' + data.roomName]);
      })
     
  }
}
