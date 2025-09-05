// filepath: /home/jgraf/Documents/42/transcendence/services/backend/tournament/interfaces/TournamentInterfaces.ts
import { Room } from "../../gameRooms.js"

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
    currentMatch: Match | null; // Track the current match
    start(): void; // Start the tournament
    end(): void; // End the tournament
    registerPlayer(player: Player): void; // Register a player
    assignMatches(): void; // Assign matches
    handleMatchOutcome(matchId: number, winnerId: number): void; // Handle match outcomes
}