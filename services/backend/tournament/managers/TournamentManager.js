import { shufflePlayers } from "../utils/shuffle.js";
import { Room, rooms } from "../../gameRooms.js";
import crypto from 'node:crypto';

export class TournamentManager {
  constructor() {
    this.tournament = {
      id: crypto.randomUUID(),
      size: 4,
      rooms: [],
      players: [],
      matches: [],
      round: 0,
      status: "pending",
      waitingArea: [],
    };
    this.matchCounter = 0;
  }

  addPlayer(player) {
    if (this.tournament.players.find((p) => p.id === player.id)) {
      throw new Error("Player already joined this tournament");
    }

    if (this.tournament.players.length >= this.tournament.size) {
      throw new Error("Tournament is already full");
    }

    this.tournament.players.push(player);

    // If tournament is now full → start it
    if (this.tournament.players.length === this.tournament.size) {
      this.startTournament();
    }
  }

  startTournament() {
    const shuffled = shufflePlayers(this.tournament.players);
    const matches = [];

    for (let i = 0; i < this.tournament.size; i += 2) {
      matches.push(this.createMatch(shuffled[i], shuffled[i + 1], 1));
    }

    this.tournament.matches = matches;
    this.tournament.round = 1;
    this.tournament.status = "active";
  }

  createMatch(p1, p2, round) {
    const room = new Room();
    rooms.push(room);
    return {
      id: this.matchCounter++,
      round,
      time: Date.now(),
      room: room,
      p1,
      p2,
      winner: null,
      loser: null,
      status: "pending",
    };
  }

  getTournament() {
    return this.tournament;
  }

  recordMatchResult(matchId, winnerId) {
    const match = this.tournament.matches.find((m) => m.id === matchId);
    if (!match) throw new Error("Match not found");
    if (match.status === "completed")
      throw new Error("Match already completed");

    if (match.p1?.id !== winnerId && match.p2?.id !== winnerId)
      throw new Error("Invalid winner");

    match.winner = match.p1?.id === winnerId ? match.p1 : match.p2;
    match.loser = match.p1?.id === winnerId ? match.p2 : match.p1;
    match.status = "completed";

    this.tournament.waitingArea.push(match.winner);
    this.checkRoundReady();
  }

  checkRoundReady() {
    const currentRoundMatches = this.tournament.matches.filter(
      (m) => m.round === this.tournament.round
    );

    if (!currentRoundMatches.every((m) => m.status === "completed")) return;

    const winners = this.tournament.waitingArea;

    if (winners.length === 1) {
      this.tournament.status = "completed";
      return;
    }

    this.advanceRound();
  }

  advanceRound() {
    const winners = this.tournament.waitingArea;
    this.tournament.waitingArea = [];

    const newMatches = [];
    for (let i = 0; i < winners.length; i += 2) {
      newMatches.push(
        this.createMatch(winners[i], winners[i + 1], this.tournament.round + 1)
      );
    }

    this.tournament.matches.push(...newMatches);
    this.tournament.round++;
  }
}