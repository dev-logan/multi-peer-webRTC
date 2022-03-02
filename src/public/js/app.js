const socket = io()

const welcome = document.querySelector('#welcome')
const welcomeForm = welcome.querySelector('form')
const call = document.querySelector('#call')
const myFace = document.querySelector('#myFace')
const camerasSelect = document.querySelector('#cameras')

call.hidden = true

let myStream
let roomName
let nickname
let pcObj = {}

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
	alert('정원이 초과되었습니다.')
	const nicknameContainer = document.querySelector('#userNickname')
	roomName = ''
	nickname = ''
	nicknameContainer.innerText = ''
})

socket.on('accept_join', async (userObjArr) => {
	await initCall()

	const length = userObjArr.length
	// 나 혼자일 경우는 여기까지 실행
	if (length === 1) {
		return
	}

	// 기존에 방에 있던 사람들에게 offer를 제공한다.
	for (let i = 0; i < length - 1; i++) {
		try {
			
		} catch (error) {

		}
	}
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
	const streams = document.querySelector('#streams')
	const div = document.createElement('div')
	div.id = id
	const video = document.createElement('video')
	video.autoplay = true
	video.playsInline = true
	video.width = '400'
	video.height = '400'
	video.srcObject = peerStream
	const nicknameContainer = document.createElement('h3')
	nicknameContainer.id = 'userNickname'
	nicknameContainer.innerText = remoteNickname

	div.appendChild(video)
	div.appendChild(nicknameContainer)
	streams.appendChild(div)
}

function handleAddStream(event, remoteSocketId, remoteNickname) {
	const peerStream = event.myStream
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
	myPeerConnection.addEventListener('icecandidate', event => {
		handleIce(event, remoteSocketId)
	})
	myPeerConnection.addEventListener('addstream', event => {
		handleAddStream(event, remoteSocketId, remoteNickname)
	})
}
welcomeForm.addEventListener('submit', handleWelcomeSubmit)
