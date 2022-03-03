import http from 'http'
import { Server } from 'socket.io'
import { instrument } from '@socket.io/admin-ui'
import express from 'express'
import cors from 'cors'

const app = express()

app.use(cors())
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

const handleListen = () => console.log('Listening on http://localhost:3000')
httpServer.listen(3000, handleListen)
