import { Room } from "../../gameRooms.js";

export interface Player {
  id: number;
  name: string | null;
}

export interface Match {
  id: number;
  room: Room;
  round: number;
  time: number;
  p1: Player | null;
  p2: Player | null;
  winner: Player | null;
  loser: Player | null;
  status: "pending" | "active" | "completed";
}

export interface Tournament {
  id: string;
  rooms: Room[];
  size: 4 | 8 | 16;
  players: Player[];
  matches: Match[];
  round: number;
  status: "pending" | "active" | "completed";
  waitingArea: Player[];
}