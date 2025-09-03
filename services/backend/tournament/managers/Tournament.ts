import { Tournament, Match, Player } from "../interfaces/TournamentInterfaces.ts";
import { shufflePlayers } from "../utils/shuffle.ts";

//  Create a new tournament
export function createTournament(players: Player[], size: 4 | 8 | 16): Tournament {
  if (players.length !== size)
    throw new Error("Player count mismatch");

  const shuffled = shufflePlayers(players);
  const matches: Match[] = [];
  let   match_id = 0;

  for (let i = 0; i < size; i += 2) {
    matches.push({
      id: match_id,
      round: 1,
      p1: shuffled[i],
      p2: shuffled[i+1],
      winner: null,
      loser: null,
      status: "pending"
    });
    match_id ++;
  }

  return {
    id: crypto.randomUUID(),
    size,
    players,
    matches,
    round: 1,
    status: "active"
  };
}

//  Record match result
export function recordMatchResult(t: Tournament, matchId: number, winnerId: number): Tournament {
  const match = t.matches.find(m => m.id === matchId);
  if (!match)
    throw new Error("Match not found");
  if (match.status === "completed")
    throw new Error("Match already completed");

  if (match.p1?.id !== winnerId && match.p2?.id !== winnerId)
    throw new Error("Invalid winner");

  match.winner = match.p1?.id === winnerId ? match.p1 : match.p2;
  match.loser  = match.p1?.id === winnerId ? match.p2 : match.p1;
  match.status = "completed";

  return (t);
}

//  Generate next round
export function advanceRound(t: Tournament): Tournament {
  const roundMatches = t.matches.filter(m => m.round === t.round);

  // check if all matches finished
  if (!roundMatches.every(m => m.status === "completed"))
    return (t);

  const winners = roundMatches.map(m => m.winner!).filter(Boolean);
  const losers  = roundMatches.map(m => m.loser!).filter(Boolean);

  let newMatches: Match[] = [];
  let match_id = 0;

  function makePairs(players: Player[], round: number) {
    for (let i = 0; i < players.length; i += 2) {
      newMatches.push({
        id: match_id,
        round,
        p1: players[i],
        p2: players[i+1],
        winner: null,
        loser: null,
        status: "pending"
      });
      match_id ++;
    }
  }

  if (winners.length > 1)
    makePairs(winners, t.round + 1);
  if (losers.length > 1)
    makePairs(losers, t.round + 1);

  t.matches.push(...newMatches);
  t.round++;

  if (winners.length === 1)
    t.status = "completed";

  return (t);
}
