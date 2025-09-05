// filepath: /home/jgraf/Documents/42/transcendence/services/backend/tournament/TournamentManager.ts
import { Tournament, Match, Player } from './interfaces/TournamentInterfaces.js';
import { Room } from '../gameRooms.js';

export class TournamentManager {
    private tournament: Tournament;
    private currentMatchIndex: number;

    constructor(size: 4 | 8 | 16) {
        this.tournament = {
            id: this.generateTournamentId(),
            rooms: [],
            size: size,
            players: [],
            matches: [],
            round: 1,
            status: "pending",
        };
        this.currentMatchIndex = 0;
    }

    private generateTournamentId(): string {
        return `tournament-${Date.now()}`;
    }

    public registerPlayer(player: Player): void {
        if (this.tournament.players.length < this.tournament.size) {
            this.tournament.players.push(player);
            console.log(`Player ${player.name} registered for tournament.`);
            if (this.tournament.players.length === this.tournament.size) {
                this.startTournament();
            }
        } else {
            console.log("Tournament is full.");
        }
    }

    private startTournament(): void {
        this.tournament.status = "active";
        this.scheduleMatches();
    }

    private scheduleMatches(): void {
        const shuffledPlayers = this.shuffleArray(this.tournament.players);
        for (let i = 0; i < shuffledPlayers.length; i += 2) {
            const match: Match = {
                id: this.currentMatchIndex++,
                room: new Room(), // Create a new room for the match
                round: this.tournament.round,
                time: Date.now(),
                p1: shuffledPlayers[i],
                p2: shuffledPlayers[i + 1] || null,
                winner: null,
                loser: null,
                status: "pending",
            };
            this.tournament.matches.push(match);
            this.tournament.rooms.push(match.room);
            console.log(`Match scheduled: ${match.p1?.name} vs ${match.p2?.name}`);
        }
        this.startNextMatch();
    }

    private startNextMatch(): void {
        const match = this.tournament.matches.find(m => m.status === "pending");
        if (match) {
            match.status = "active";
            // Redirect players to their match room
            match.room.addPlayer(match.p1?.id, match.p1?.name);
            if (match.p2) {
                match.room.addPlayer(match.p2.id, match.p2.name);
            }
            console.log(`Match started: ${match.p1?.name} vs ${match.p2?.name}`);
        }
    }

    public reportMatchOutcome(matchId: number, winnerId: number): void {
        const match = this.tournament.matches.find(m => m.id === matchId);
        if (match) {
            match.winner = match.p1?.id === winnerId ? match.p1 : match.p2;
            match.loser = match.p1?.id === winnerId ? match.p2 : match.p1;
            match.status = "completed";
            console.log(`Match completed: ${match.winner?.name} wins against ${match.loser?.name}`);
            this.advanceWinner(match.winner);
        }
    }

    private advanceWinner(winner: Player | null): void {
        if (winner) {
            this.tournament.players.push(winner); // Add winner to the next round
            if (this.tournament.players.length < this.tournament.size) {
                this.scheduleMatches(); // Schedule next matches
            } else {
                this.tournament.status = "completed"; // Tournament finished
                console.log("Tournament completed.");
            }
        }
    }

    private shuffleArray(array: Player[]): Player[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}