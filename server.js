import express from 'express';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {Server as SocketIOServer} from 'socket.io';
import {Redis} from 'ioredis';

const app = express();
const server = createServer(app);
const redis = new Redis();

const __dirname = dirname(fileURLToPath(import.meta.url));

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

const io = new SocketIOServer(server, {
    cors: {
        origin: '*', methods: ['GET', 'POST'], allowedHeaders: ['Content-Type'], credentials: true,
    },
});

// Socket.io
io.on('connection', (socket) => {
    console.log('A new user connected', socket.id);

    socket.on('login', async (data) => {
        console.log(data);
        const {userId} = data;
        const room = `room_${userId}`; // Get room name based on user ID
        socket.join(room); // Join the room
        await redis.set(socket.id, room); // update redis with socket.id->room values
    });

    socket.on('message', async (data) => {
        const {message} = data;
        // Assuming 'data' contains the user ID and the message
        const room = await redis.get(socket.id); // get room name from redis
        socket.to(room).emit('message', message); // sends data to all subscribed sockets (except itself) of that channel
    });

    socket.on('disconnect', async () => {
        console.log(`user socket disconnected: ${socket.id}`);
        const room = await redis.get(socket.id) // get room from redis
        socket.leave(room) // leave room
        await redis.del(socket.id) // delete socket->room data from redis
    });
});

server.listen(3000, () => {
    console.log('server running at http://localhost:3000');
});