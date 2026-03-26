import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { createServer } from 'http';
import { GameRoom } from './rooms/game-room.js';

const port = Number(process.env['PORT']) || 2567;

const httpServer = createServer();
const server = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

server.define('game', GameRoom);

httpServer.listen(port, () => {
  console.log(`Scorched Modern server listening on port ${port}`);
});
