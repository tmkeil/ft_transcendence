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
        const shuffledPlayers = this.shuffleArray([...this.tournament.players]);
        for (let i = 0; i < shuffledPlayers.length; i += 2) {
            const match: Match = {
                id: this.currentMatchIndex++,
                room: new Room(), // Create a new room for each match
                round: this.tournament.round,
                time: Date.now(),
                p1: shuffledPlayers[i],
                p2: shuffledPlayers[i + 1],
                winner: null,
                loser: null,
                status: "pending",
            };
            this.tournament.matches.push(match);
            this.tournament.rooms.push(match.room);
            console.log(`Match scheduled: ${match.p1.name} vs ${match.p2.name}`);
        }
        this.startNextMatch();
    }

    private startNextMatch(): void {
        const match = this.tournament.matches.find(m => m.status === "pending");
        if (match) {
            match.status = "active";
            console.log(`Match started: ${match.p1.name} vs ${match.p2.name}`);
            // Logic to redirect players to their respective rooms can be added here
        }
    }

    public reportMatchOutcome(matchId: number, winner: Player): void {
        const match = this.tournament.matches.find(m => m.id === matchId);
        if (match) {
            match.winner = winner;
            match.loser = match.p1 === winner ? match.p2 : match.p1;
            match.status = "completed";
            console.log(`Match completed: ${winner.name} wins against ${match.loser.name}`);
            this.advanceWinner(winner);
        }
    }

    private advanceWinner(winner: Player): void {
        // Logic to advance the winner to the next round
        // This could involve scheduling new matches for the next round
        console.log(`Player ${winner.name} advances to the next round.`);
    }

    private shuffleArray(array: Player[]): Player[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}