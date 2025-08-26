import { FastifyInstance } from "fastify";
import {Player, Match, Tournament} from "../interfaces/TournamentInterfaces.ts"
import { createTournament, recordMatchResult, advanceRound } from "./Tournament.ts";

let tournaments: Record<string, Tournament> = {}; // in-memory, use DB in production

export default async function tournamentRoutes(fastify: FastifyInstance) {
  
  fastify.post("/tournaments", async (req, reply) => {
    const { players, size } = req.body as { players: Player[], size: 4 | 8 | 16 };
    const t = createTournament(players, size);
    tournaments[t.id] = t;
    return (t);
  });

  fastify.post("/tournaments/:id/matches/:matchId/result", async (req, reply) => {
    const { id, matchId } = req.params as { id: string, matchId: number };
    const { winnerId } = req.body as { winnerId: number };

    let t = tournaments[id];
    t = recordMatchResult(t, matchId, winnerId);
    tournaments[id] = t;
    return (t);
  });

  fastify.post("/tournaments/:id/advance", async (req, reply) => {
    const { id } = req.params as { id: string };
    let t = tournaments[id];
    t = advanceRound(t);
    tournaments[id] = t;
    return (t);
  });

  fastify.get("/tournaments/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    return (tournaments[id]);
  });
}
