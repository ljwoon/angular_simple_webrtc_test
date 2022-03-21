import { Injectable } from '@angular/core';
import {io, Socket} from 'socket.io-client';
import { environment } from 'src/environments/environment';
@Injectable({
  providedIn: 'root'
})
export class SocketService {

  // private url = 'http://localhost:8081'; // whiteBoard 통합전 서버주소
  // private url = 'http://localhost:3000/socketWebRTC';
  private url = environment.socketUrl;
  private _socket: Socket;

  constructor() {
    console.log(this.url)
    this._socket = io(this.url+'/socketWebRTCTest', { transports: ['websocket'], path:'/socketWebRTCTest' });
		// console.log(this._socket);
  }

  get socket() {
		return this._socket;
	}
}
