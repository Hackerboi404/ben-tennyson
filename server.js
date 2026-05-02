const express = require('express');
const app = express();
const http = require('http');
const { createProxyMiddleware } = require('http-proxy-middleware'); // Ye naya package hai
const server = http.createServer(app);
const io = require('socket.io')(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// Static files serve karna
app.use(express.static('public'));

// --- NEW: VIDEO PROXY (Yeh Google Drive ke rok ko hatayega) ---
app.use('/proxy-video', createProxyMiddleware({
    target: (proxyReqOpts, srcReq) => {
        // URL se original destination nikalna
        const url = srcReq.query.url;
        return url;
    },
    changeOrigin: true,
    pathRewrite: {
        '^/proxy-video': '', // URL se /proxy-video hata dega
    },
    onProxyReq: (proxyReq, req, res) => {
        // Google Drive ke liye User-Agent badalna zaroori hai
        proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    }
}));

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

server.listen(process.env.PORT || 3000, () => {
    console.log(`Server running on port ${process.env.PORT || 3000}`);
});
