import { Room, Client } from 'colyseus';
import type { RoomOptions } from '@scorched/shared';

export class GameRoom extends Room {
  maxClients = 8;

  onCreate(options: RoomOptions) {
    console.log(`GameRoom created: ${options.name}`);
  }

  onJoin(client: Client) {
    console.log(`Client joined: ${client.sessionId}`);
  }

  onLeave(client: Client) {
    console.log(`Client left: ${client.sessionId}`);
  }

  onDispose() {
    console.log('GameRoom disposed');
  }
}
