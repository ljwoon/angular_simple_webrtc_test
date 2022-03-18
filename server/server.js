require('dotenv').config();

const SocketIO = require("socket.io");
const path = require('path')
const express = require('express');
const https = require('https');
const cors = require('cors');
const app = express();

var port = normalizePort(process.env.port || '3300');
app.set('port', port);

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json())

const fs = require("fs");


const options = {
    key: fs.readFileSync(__dirname + '/private.pem'),
    cert: fs.readFileSync(__dirname + '/public.pem')
};



// [API] Routers
app.use('/api/v1', require('./routes/api/v1'));



/*
  angular 빌드 한 후 나온 dist 파일을 여기로 옮긴다.
  그리고 dist 파일에 index.html 파일이 angular 파일이 된다.
  그리고 app.use('/', express.static(path.join(__dirname, '/client'))); 바라보면
  angnular 페이지가 작동된다. 
*/
// static
// app.use('/', express.static(path.join(__dirname, '/client')));


process.env.NODE_TLS_REJECT_UNAUTHORIZED = "1";

app.post('/api/v1/joinMeeting', (req, res) => {
    console.log('[ joinMeeting ]', req.body)

    
    // res.send('api/v1/whiteBoard/meetingInfo')
})





const httpsServer = https.createServer(options, app).listen(app.get('port'), () => {
    console.log(` 
    +---------------------------------------------+
    |                                                 
    |      [Coop Server]
    |
    |      - Version:`, process.env.version, `        
    |
    |      - Mode: ${app.get('env')}
    |                                      
    |      - Server is running on port ${app.get('port')}
    |
    +---------------------------------------------+
    `);

    /*----------------------------------
        CONNECT TO MONGODB SERVER
    ------------------------------------*/
    // mongApp.appSetObjectId(app);
});

const wsServer = SocketIO(httpsServer);


function normalizePort(val) {
    var port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
}


/*
 * Management of WebSocket messages
 */

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


/*---------------------------
	Namespace
----------------------------*/
const socketWebRTC = wsServer.of('/socketWebRTC');



/*-----------------------------------------------
    webRTC Socket event handler
-----------------------------------------------*/
const sharing = require('./controllers/webRTC/socketHandler-sharing.js')
// const drawing = require('./controllers/whiteBoard/socketHandler-drawing.js')

socketWebRTC.on('connection', (socket) => {
    sharing(wsServer, socket, app )
    drawing(wsServer, socket, app)
});


/*
  localhost:3000/meeting/meetingId
  와 같이
  app.use('/', 와 다른 경로 일 경우
  여기로 받은 후 angular로 보낸다.  
*/
/*---------------------------------------------------------
    서버상에 존재하지 않는 주소를 넣는 경우에 대한 처리
        - angular route의 path로 바로 이동하는 경우
   여기를 통해서 진입.
  --> 나중에 처리. : nginx 등을 이용하는 경우 다르게 처리...
-------------------------------------------------------------*/
// app.use(function(req, res) {
//     console.log(`
//     ============================================
//       >>>>>> Invalid Request! <<<<<<
    
//       Req: "${req.url}"
//         => Redirect to 'index.html'
//     ============================================`)
//      res.sendFile(__dirname+'/client/index.html');
//     });