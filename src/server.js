import http from 'http'
import { Server } from 'socket.io'
import { instrument } from '@socket.io/admin-ui'
import express from 'express'

const app = express()

app.set('view engine', 'pug')
app.set('views', __dirname + '/views')
app.use('/public', express.static(__dirname + '/public'))
app.get('/', (_, res) => res.render('home'))
app.get('/*', (_, res) => res.redirect('/')) //  다른 주소로 접속시 redirect

const httpServer = http.createServer(app)
const wsServer = new Server(httpServer, {
	cors: {
		origin: ['http://admin.socket.io'],
		credentials: true,
	},
})
instrument(wsServer, {
	auth: false,
})

// 방 목록
let roomObjArr = [
	// {
	// 	roomName,
	// 	currentNum,
	// 	users: [
	// 		{
	// 			socketId,
	// 			nickname,
	// 		},
	// 	],
	// },
]
const MAXIMUM = 5

wsServer.on('connection', (socket) => {
	let myRoomName = null
	let myNickname = null

	socket.on('join_room', (roomName, nickname) => {
		myRoomName = roomName
		myNickname = nickname

		let isRoomExist = false
		let targetRoomObj = null

		for (let i = 0; i < roomObjArr.length; i++) {
			// 같은 이름의 방 만들 수 없음
			if (roomObjArr[i].roomName === roomName) {
				// 정원 초과
				// if (roomObjArr[i].currentNum >= MAXIMUM) {
				// 	socket.emit('reject_join')
				// 	return
				// }
				// 방이 존재하면 그 방으로 들어감
				isRoomExist = true
				targetRoomObj = roomObjArr[i]
				break
			}
		}

		// 방이 존재하지 않는다면 방을 생성
		if (!isRoomExist) {
			targetRoomObj = {
				roomName,
				currentNum: 0,
				users: [],
			}
			roomObjArr.push(targetRoomObj)
		}

		// 어떠한 경우든 방에 참여
		targetRoomObj.users.push({
			socketId: socket.id,
			nickname,
		})
		targetRoomObj.currentNum++

		socket.join(roomName)
		socket.emit('accept_join', targetRoomObj.users)
	})

	socket.on('ice', (ice, remoteSocketId) => {
		socket.to(remoteSocketId).emit('ice', ice, socket.id)
	})
})

const handleListen = () => console.log('Listening on http://localhost:3000')
httpServer.listen(3000, handleListen)
