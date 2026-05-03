const express = require('express');
const axios = require('axios');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(express.static('public'));

// --- GOOGLE DRIVE & TERABOX STREAMING PROXY ---
// Ye route video ko server ke through pass karega taaki CORS error na aaye
app.get('/stream', async (req, res) => {
    const videoUrl = req.query.url;
    
    if (!videoUrl) {
        return res.status(400).send('URL parameter is required');
    }

    try {
        // Google Drive link ko convert karna
        let finalUrl = videoUrl;
        
        if (videoUrl.includes('drive.google.com')) {
            // ID nikalna
            const idMatch = videoUrl.match(/\/d\/(.*?)\//);
            if (idMatch && idMatch[1]) {
                const id = idMatch[1];
                finalUrl = `https://drive.google.com/uc?export=download&id=${id}`;
            }
        } else if (videoUrl.includes('terabox')) {
            // TeraBox direct link kaam nahi karta server side easily, 
            // isliye wo error dega.
            return res.status(400).send("TeraBox is not supported via Proxy. Please use Google Drive.");
        }

        console.log(`Proxying: ${finalUrl}`);

        // Video ko fetch karna
        const response = await axios({
            method: 'get',
            url: finalUrl,
            responseType: 'stream'
        });

        // Headers set karna taaki browser ko lage video file hai
        res.setHeader('Content-Type', 'video/mp4');
        response.data.pipe(res);

    } catch (error) {
        console.error('Stream Error:', error.message);
        res.status(500).send('Error loading video');
    }
});

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
