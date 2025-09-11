import { buildWorld, resetBall } from "@app/shared";

let nextRoomId = 0;
export const rooms = [];
// export const rooms = new Map();

export class Room {
  constructor() {
    this.id = nextRoomId++;
    this.players = new Map();
  // build config first so we can derive paddle X positions
  this.config = buildWorld();
  this.state = this.initState();
  const halfW = this.config.FIELD_WIDTH / 2;
  // Place paddles slightly inside the left/right edges so server physics can detect collisions
  this.tempState = { p1X: -halfW + 1, p1Y: 0, p2X: halfW - 1, p2Y: 0, ballX: 0, ballY: 0, scoreL: 0, scoreR: 0, p1_spd: 0, p2_spd: 0 };
    this.ballV = resetBall();
    this.loopInterval = null;
    this.inputs = { left: 0, right: 0 };
    // As optional parameters to override the default values e.g. buildWorld({ FIELD_WIDTH: 120, FIELD_HEIGHT: 50 })
  }

  initState() {
    return {
      p1X: 0,
      p2X: 0,
      p1Y: 0,
      p2Y: 0,
      ballX: 0,
      ballY: 0,
      scoreL: 0,
      scoreR: 0,
      started: false,
      timestamp: null
    };
  }

  addPlayer(userId, ws) {
    // If this player is already in the room, do nothing
    const side = this.players.size % 2 === 0 ? "left" : "right";
    this.players.set(ws, { id: userId, side: side, ready: false });
    console.log(`User ${userId} added to room ${this.id}`);
    ws._roomId = this.id;
    ws._side = side;
  }

  removePlayer(ws) {
    this.players.delete(ws);
    console.log(`Player removed from room ${this.id}`);
  }

  getPlayer(ws) {
    return this.players.get(ws);
  }

  get(roomId) {
    return rooms[roomId];
  }
}

export function getOrCreateRoom() {
  // const index = rooms.findIndex(room => room.id === ws._roomId);
  // const room = rooms[index];
  let room = rooms.length > 0 ? rooms[rooms.length - 1] : null;
  if (!room) {
    room = new Room();
    rooms.push(room);
  }
  return room;
}
