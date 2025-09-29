const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);
  
  // Create WebSocket server
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws'
  });

  // Store room connections
  const roomConnections = new Map();

  wss.on('connection', (ws) => {
    console.log('🔌 WebSocket client connected');

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('📡 Received message:', message);

        switch (message.type) {
          case 'join-room':
            const { roomCode, playerId } = message.data;
            console.log(`👤 Player ${playerId} joining room ${roomCode}`);
            
            ws.roomCode = roomCode;
            ws.playerId = playerId;
            
            // Store connection
            if (!roomConnections.has(roomCode)) {
              roomConnections.set(roomCode, new Set());
            }
            roomConnections.get(roomCode).add(ws);
            
            // Send room joined confirmation
            ws.send(JSON.stringify({
              type: 'room-joined',
              data: { roomCode, playerId }
            }));
            
            // Send initial room data
            ws.send(JSON.stringify({
              type: 'room-update',
              data: { 
                roomCode, 
                players: [{ id: playerId, name: 'Player', role: 'host' }],
                status: 'waiting',
                frames: [],
                currentFrameIndex: 0,
                difficulty: 'normal',
                durationMinutes: 10,
                targetFrameCount: 0,
                frameStartedAt: null,
                roundStartedAt: null,
                createdAt: Date.now(),
                guessWindowSeconds: 20,
                preRollSeconds: 5,
                code: roomCode
              }
            }));
            break;

          case 'chat-message':
            if (ws.roomCode && ws.playerId) {
              const chatMessage = {
                id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                playerId: ws.playerId,
                message: message.data.message,
                timestamp: Date.now()
              };
              
              // Broadcast to all connections in the room
              const roomConnections = roomConnections.get(ws.roomCode);
              if (roomConnections) {
                roomConnections.forEach(connection => {
                  if (connection !== ws && connection.readyState === 1) {
                    connection.send(JSON.stringify({
                      type: 'chat-message',
                      data: chatMessage
                    }));
                  }
                });
              }
            }
            break;
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });

    ws.on('close', () => {
      console.log('🔌 WebSocket client disconnected');
      if (ws.roomCode && roomConnections.has(ws.roomCode)) {
        roomConnections.get(ws.roomCode).delete(ws);
        if (roomConnections.get(ws.roomCode).size === 0) {
          roomConnections.delete(ws.roomCode);
        }
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // Make wss available globally for broadcasting
  global.wss = wss;
  global.roomConnections = roomConnections;

  httpServer.listen(port, () => {
    console.log(`🚀 Server ready on http://${hostname}:${port}`);
    console.log('🔌 Native WebSocket server ready');
  });
});
