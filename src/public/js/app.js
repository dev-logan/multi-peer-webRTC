const socket = io('https://test.kimjeongho-server.com', { cors: { origin: '*' } })
// const socket = io()

const welcome = document.querySelector('#welcome')
const welcomeForm = welcome.querySelector('form')
const call = document.querySelector('#call')
const myFace = document.querySelector('#myFace')
const camerasSelect = document.querySelector('#cameras')
const muteBtn = document.querySelector('#mute')
const cameraBtn = document.querySelector('#camera')
const leaveBtn = document.querySelector('#leave')
const emojiBtn = document.querySelector('#emoji')

call.hidden = true

let myStream
let roomName
let nickname
let pcObj = {}
let peopleInRoom = 1
let muted = false
let cameraOff = false

async function getCameras() {
	try {
		const devices = await navigator.mediaDevices.enumerateDevices()
		const cameras = devices.filter((device) => device.kind === 'videoinput')
		const currentCamera = myStream.getVideoTracks()
		cameras.forEach((camera) => {
			const option = document.createElement('option')
			option.value = camera.deviceId
			option.innerText = camera.label

			if (currentCamera.label === camera.label) {
				option.selected = true
			}

			camerasSelect.appendChild(option)
		})
	} catch (error) {
		console.log(error)
	}
}

async function getMedia(deviceId) {
	const initialConstraints = {
		audio: true,
		video: { facingMode: 'user' },
	}
	const cameraConstraints = {
		audio: true,
		video: { deviceId: { exact: deviceId } },
	}
	try {
		myStream = await navigator.mediaDevices.getUserMedia(
			deviceId ? cameraConstraints : initialConstraints
		)
		myFace.srcObject = myStream
		myFace.muted = true

		if (!deviceId) {
			await getCameras()
		}
	} catch (error) {
		console.log(error)
	}
}

async function initCall() {
	welcome.hidden = true
	call.hidden = false
	await getMedia()
}

function handleWelcomeSubmit(event) {
	event.preventDefault()
	const welcomeRoomName = document.querySelector('#roomName')
	const welcomeNickName = document.querySelector('#nickname')
	const nicknameContainer = document.querySelector('#userNickname')
	roomName = welcomeRoomName.value
	welcomeRoomName.value = ''
	nickname = welcomeNickName.value
	welcomeNickName.value = ''
	nicknameContainer.innerText = nickname
	socket.emit('join_room', roomName, nickname)
}

socket.on('reject_join', () => {
	alert('????????? ?????????????????????.')
	const nicknameContainer = document.querySelector('#userNickname')
	roomName = ''
	nickname = ''
	nicknameContainer.innerText = ''
})

socket.on('accept_join', async (userObjArr) => {
	await initCall()

	const length = userObjArr.length
	// ??? ????????? ????????? ???????????? ??????
	if (length === 1) {
		return
	}

	// ????????? ?????? ?????? ??????????????? offer??? ????????????.
	for (let i = 0; i < length - 1; i++) {
		try {
			const newPC = createConnection(
				userObjArr[i].socketId,
				userObjArr[i].nickname
			)
			const offer = await newPC.createOffer() // ??? ???????????? ?????? offer??? ??????
			await newPC.setLocalDescription(offer)
			socket.emit('offer', offer, userObjArr[i].socketId, nickname) // offer??? ?????? socket id??? ????????? ????????? ?????????
		} catch (error) {
			console.log(error)
		}
	}
})

socket.on('offer', async (offer, remoteSocketId, remoteNickname) => {
	try {
		const newPC = createConnection(remoteSocketId, remoteNickname)
		await newPC.setRemoteDescription(offer)
		const answer = await newPC.createAnswer()
		await newPC.setLocalDescription(answer)
		socket.emit('answer', answer, remoteSocketId)
	} catch (error) {
		console.log(error)
	}
})

socket.on('answer', async (answer, remoteSocketId) => {
	await pcObj[remoteSocketId].setRemoteDescription(answer)
})

socket.on('ice', async (ice, remoteSocketId) => {
	await pcObj[remoteSocketId].addIceCandidate(ice)
})

function handleIce(event, remoteSocketId) {
	if (event.candidate) {
		socket.emit('ice', event.candidate, remoteSocketId)
	}
}

function paintPeerFace(peerStream, id, remoteNickname) {
	console.log(peerStream)
	const streams = document.querySelector('#streams')
	const div = document.createElement('div')
	div.id = id
	const video = document.createElement('video')
	video.autoplay = true
	video.playsInline = true
	video.width = '300'
	video.height = '300'
	video.srcObject = peerStream
	const nicknameContainer = document.createElement('h3')
	nicknameContainer.id = 'userNickname'
	nicknameContainer.innerText = remoteNickname

	div.appendChild(video)
	div.appendChild(nicknameContainer)
	streams.appendChild(div)
}

function handleAddStream(event, remoteSocketId, remoteNickname) {
	console.log(event)
	const peerStream = event.stream
	paintPeerFace(peerStream, remoteSocketId, remoteNickname)
}

function createConnection(remoteSocketId, remoteNickname) {
	const myPeerConnection = new RTCPeerConnection({
		iceServers: [
			{
				urls: [
					'stun:stun.l.google.com:19302',
					'stun:stun1.l.google.com:19302',
					'stun:stun2.l.google.com:19302',
					'stun:stun3.l.google.com:19302',
					'stun:stun4.l.google.com:19302',
				],
			},
		],
	})
	myPeerConnection.addEventListener('icecandidate', (event) => {
		handleIce(event, remoteSocketId)
	})
	myPeerConnection.addEventListener('addstream', (event) => {
		handleAddStream(event, remoteSocketId, remoteNickname)
	})

	// ??? ????????? myPeerConnection??? ??????. ??? listner????????? ?????? ???????????? ???????
	myStream
		.getTracks()
		.forEach((track) => myPeerConnection.addTrack(track, myStream))

	// pcObj??? ??? ??????????????? connection ????????? ?????????
	pcObj[remoteSocketId] = myPeerConnection

	peopleInRoom++

	return myPeerConnection
}

function handleMuteClick() {
	myStream
		.getAudioTracks()
		.forEach((track) => (track.enabled = !track.enabled))
	if (muted) {
		muteBtn.innerText = '????????? ??????'
		muted = false
	} else {
		muteBtn.innerText = '????????? ??????'
		muted = true
	}
}

function handleCameraClick() {
	myStream
		.getVideoTracks()
		.forEach((track) => (track.enabled = !track.enabled))
	if (cameraOff) {
		cameraBtn.innerText = '????????? ??????'
		cameraOff = false
	} else {
		cameraBtn.innerText = '????????? ??????'
		cameraOff = true
	}
}

// ???????????? ????????? ????????? ???????????? ???
function leaveRoom() {
	socket.disconnect()

	call.hidden = true
	welcome.hidden = false

	pcObj = {}
	peopleInRoom = 1
	nickname = ''

	// html ????????? ????????? ?????? ????????? ??? ???????????????
	myStream.getTracks().forEach((track) => track.stop())
	const nicknameContainer = document.querySelector('#userNickname')
	nicknameContainer.innerText = ''

	myFace.srcObject = null
	clearAllVideos()
}

function clearAllVideos() {
	const streams = document.querySelector('#streams')
	const streamArr = streams.querySelectorAll('div')
	streamArr.forEach((streamElement) => {
		if (streamElement.id != 'myStream') {
			streams.removeChild(streamElement)
		}
	})
}

// ?????? ?????? ??? ?????? ??????????????? ???????????? ?????????
socket.on('leave_room', (leavedSocketId) => {
	removeVideo(leavedSocketId)
})

function removeVideo(leavedSocketId) {
	const streams = document.querySelector('#streams')
	const streamArr = streams.querySelectorAll('div')
	streamArr.forEach((streamElement) => {
		if (streamElement.id === leavedSocketId) {
			streams.removeChild(streamElement)
		}
	})
}

function handleEmojiClick() {
	const myArea = document.querySelector('#myStream')
	const emojiBox = document.createElement('button')
	emojiBox.innerText = '????'
	myArea.appendChild(emojiBox)
	setTimeout(() => {
		emojiBox.hidden = true
	}, 2000)
	socket.emit('emoji')
}

socket.on('emoji', (remoteSocketId) => {
	const remoteDiv = document.querySelector(`#${remoteSocketId}`)
	const emojiBox = document.createElement('button')
	emojiBox.innerText = '????'
	remoteDiv.appendChild(emojiBox)
	setTimeout(() => {
		emojiBox.hidden = true
	}, 2000)
})

welcomeForm.addEventListener('submit', handleWelcomeSubmit)
muteBtn.addEventListener('click', handleMuteClick)
cameraBtn.addEventListener('click', handleCameraClick)
leaveBtn.addEventListener('click', leaveRoom)
emojiBtn.addEventListener('click', handleEmojiClick)
