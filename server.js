const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: "*", // Render par mobile aur desktop dono connect kar sakein
        methods: ["GET", "POST"]
    }
});

// Static files serve karna (public folder se HTML milegi)
app.use(express.static('public'));

// --- DATA & STATE VARIABLES ---
let currentVideo = null; // Jo video abhi chal rahi hai
let isPlaying = false;   // Video play hai ya pause?
let currentTime = 0;     // Video ka time (seconds)
let viewers = 0;          // Kitne log online hain

// --- SOCKET.IO CONNECTION LOGIC ---
io.on('connection', (socket) => {
    
    // 1. Naya User Join Hua
    viewers++;
    io.emit('viewer_count', viewers); // Sabko naya count bhejo
    console.log(`User connected: ${socket.id}. Total Viewers: ${viewers}`);

    // 2. Naye User ko Current State Bhejo (Sync logic)
    // Agar server par koi video chal rahi hai, to naye user ko wo bhi dikhegi
    socket.emit('sync_state', { 
        videoUrl: currentVideo, 
        playing: isPlaying, 
        time: currentTime 
    });

    // --- ADMIN EVENTS (Jab Admin command dega) ---

    // Event: Admin ne naya video play kiya
    socket.on('admin_play', (data) => {
        currentVideo = data.url;
        isPlaying = true;
        currentTime = 0;
        
        console.log(`[ADMIN] Playing: ${currentVideo}`);
        
        // Sab connected users ko bhejo: "Video badlo aur Play karo"
        io.emit('sync_video', { url: currentVideo });
    });

    // Event: Admin ne pause kiya
    socket.on('admin_pause', () => {
        isPlaying = false;
        console.log('[ADMIN] Paused stream');
        
        // Sabko bhejo: "Pause karo"
        io.emit('sync_pause');
    });

    // Event: Admin ne video forward/backward kiya (Seeking)
    socket.on('admin_time_update', (data) => {
        currentTime = data.time;
        // Sirf time update karein, play/pause state disturb nahi karenge
        io.emit('sync_time', { time: currentTime });
    });

    // --- USER DISCONNECT ---
    socket.on('disconnect', () => {
        viewers--;
        io.emit('viewer_count', viewers);
        console.log(`User disconnected: ${socket.id}. Total Viewers: ${viewers}`);
    });
});

// --- SERVER START ---
const PORT = process.env.PORT || 3000; // Localhost 3000 ya Render ka port
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
});
