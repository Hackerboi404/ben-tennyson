const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(express.static('public'));

// --- STATE VARIABLES ---
let currentVideo = null;
let isPlaying = false;
let currentTime = 0;
let viewers = 0;

io.on('connection', (socket) => {
    viewers++;
    io.emit('viewer_count', viewers);
    console.log(`User connected: ${socket.id}. Total: ${viewers}`);

    socket.emit('sync_state', { 
        videoUrl: currentVideo, 
        playing: isPlaying, 
        time: currentTime 
    });

    socket.on('admin_play', (data) => {
        currentVideo = data.url;
        isPlaying = true;
        currentTime = 0;
        console.log(`[ADMIN] Playing: ${currentVideo}`);
        io.emit('sync_video', { url: currentVideo });
    });

    socket.on('admin_pause', () => {
        isPlaying = false;
        io.emit('sync_pause');
    });

    socket.on('admin_time_update', (data) => {
        currentTime = data.time;
        io.emit('sync_time', { time: currentTime });
    });

    socket.on('disconnect', () => {
        viewers--;
        io.emit('viewer_count', viewers);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
