import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class MeetingService {

	constructor(
		private http: HttpClient,

	) { }

	join(data:any) {
		return this.http.post('https://localhost:3300/api/v1/joinMeeting', data);
	}

	
}
