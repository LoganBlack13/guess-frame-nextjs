import { getRoom, removePlayer } from './rooms';
import type { Room } from './rooms';

export function broadcastRoomUpdate(roomCode: string, room: Room) {
  console.log('📡 Broadcasting room update via WebSocket for room:', roomCode);
  if (typeof global !== 'undefined' && global.roomConnections) {
    const connections = global.roomConnections.get(roomCode);
    if (connections) {
      connections.forEach(ws => {
        if (ws.readyState === 1) { // WebSocket.OPEN
          ws.send(JSON.stringify({
            type: 'room-update',
            data: room
          }));
        }
      });
    }
  }
}

export function broadcastChatMessage(roomCode: string, message: { id: string; playerId: string; playerName: string; message: string; timestamp: number }) {
  console.log('💬 Broadcasting chat message via WebSocket for room:', roomCode);
  if (typeof global !== 'undefined' && global.roomConnections) {
    const connections = global.roomConnections.get(roomCode);
    if (connections) {
      connections.forEach(ws => {
        if (ws.readyState === 1) { // WebSocket.OPEN
          ws.send(JSON.stringify({
            type: 'chat-message',
            data: message
          }));
        }
      });
    }
  }
}

export function broadcastPartyRedirect(roomCode: string, room: Room) {
  console.log('📡 Broadcasting party:redirect event via WebSocket for room:', roomCode);
  if (typeof global !== 'undefined' && global.roomConnections) {
    const connections = global.roomConnections.get(roomCode);
    if (connections) {
      connections.forEach(ws => {
        if (ws.readyState === 1) { // WebSocket.OPEN
          ws.send(JSON.stringify({
            type: 'party:redirect',
            data: room
          }));
        }
      });
    }
  }
}

export function broadcastPartyCountdown(
  roomCode: string,
  room: Room,
  countdown: number
) {
  console.log(
    `📡 Broadcasting party:countdown event via WebSocket for room ${roomCode}: ${countdown}`
  );
  if (typeof global !== 'undefined' && global.roomConnections) {
    const connections = global.roomConnections.get(roomCode);
    if (connections) {
      connections.forEach(ws => {
        if (ws.readyState === 1) { // WebSocket.OPEN
          ws.send(JSON.stringify({
            type: 'party:countdown',
            data: { room, countdown }
          }));
        }
      });
    }
  }
}
