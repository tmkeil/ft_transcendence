import { buildWorld, resetBall } from "@app/shared";

export const rooms = [];
// export const rooms = new Map();

export class Room {
  constructor() {
    this.id = rooms.length;
    this.players = new Map();
    this.state = this.initState();
    this.tempState = { p1Y: 0, p2Y: 0, ballX: 0, ballY: 0, scoreL: 0, scoreR: 0, p1_spd: 0, p2_spd: 0 };
    this.ballV = resetBall();
    this.loopInterval = null;
    this.inputs = { left: 0, right: 0 };
    this.config = buildWorld();
    // As optional parameters to override the default values e.g. buildWorld({ FIELD_WIDTH: 120, FIELD_HEIGHT: 50 })
  }

  initState() {
    return {
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
}

export function getOrCreateRoom() {
  let room = rooms.length > 0 ? rooms[rooms.length - 1] : null;
  if (!room) {
    room = new Room();
    rooms.push(room);
  }
  return room;
}