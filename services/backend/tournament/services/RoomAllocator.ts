// filepath: /home/jgraf/Documents/42/transcendence/services/backend/tournament/TournamentManager.ts
import { Tournament, Match, Player } from './interfaces/TournamentInterfaces';
import { Room } from '../../gameRooms.js';

export class TournamentManager {
    private tournaments: Tournament[] = [];
    private currentTournament: Tournament | null = null;

    public createTournament(size: 4 | 8 | 16): Tournament {
        const tournament: Tournament = {
            id: this.generateId(),
            rooms: [],
            size,
            players: [],
            matches: [],
            round: 0,
            status: "pending",
        };
        this.tournaments.push(tournament);
        return tournament;
    }

    public joinTournament(player: Player): boolean {
        if (!this.currentTournament || this.currentTournament.players.length >= this.currentTournament.size) {
            return false; // Tournament is full or not started
        }
        this.currentTournament.players.push(player);
        if (this.currentTournament.players.length === this.currentTournament.size) {
            this.startTournament();
        }
        return true;
    }

    private startTournament(): void {
        this.currentTournament.status = "active";
        this.scheduleMatches();
    }

    private scheduleMatches(): void {
        const players = this.currentTournament!.players;
        const shuffledPlayers = this.shuffleArray(players);
        const matches: Match[] = [];

        for (let i = 0; i < shuffledPlayers.length; i += 2) {
            const match: Match = {
                id: this.generateId(),
                room: new Room(), // Create a new room for the match
                round: this.currentTournament!.round,
                time: Date.now(),
                p1: shuffledPlayers[i],
                p2: shuffledPlayers[i + 1],
                winner: null,
                loser: null,
                status: "pending",
            };
            matches.push(match);
        }

        this.currentTournament!.matches = matches;
        this.currentTournament!.round++;
        this.startMatches(matches);
    }

    private startMatches(matches: Match[]): void {
        matches.forEach(match => {
            // Logic to redirect players to their match rooms
            // e.g., match.room.startMatch();
        });
    }

    public reportMatchOutcome(matchId: string, winnerId: number): void {
        const match = this.currentTournament!.matches.find(m => m.id === matchId);
        if (match) {
            match.winner = match.p1?.id === winnerId ? match.p1 : match.p2;
            match.loser = match.p1?.id === winnerId ? match.p2 : match.p1;
            match.status = "completed";

            // Check if the tournament is over
            this.checkTournamentOutcome();
        }
    }

    private checkTournamentOutcome(): void {
        // Logic to determine if the tournament is over and declare a winner
    }

    private generateId(): string {
        return Math.random().toString(36).substr(2, 9);
    }

    private shuffleArray(array: Player[]): Player[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}