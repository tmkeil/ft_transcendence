import Fastify from "fastify";
import sqlite3 from "sqlite3";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { getOrCreateRoom, rooms } from "./gameRooms.js";
import { initDb, fetchAll, addElementToTable, removeElementFromTable } from "./initDatabases.js";
import { broadcaster } from "./utils.js";
import { buildWorld, movePaddles, moveBall } from "@app/shared";
import fastifyCookie from "@fastify/cookie";
import fastifyJWT from "@fastify/jwt";
import bcrypt from "bcryptjs";			// Password encryption
import qrcode from "qrcode";			// QR code gen for autheticator app
import { authenticator } from "otplib";	// Authenticator App functionality
import tournamentRoutes from "./tournament/managers/TournamentRoutes.js";
import { TournamentManager } from './tournament/managers/TournamentManager.js';

// import * as Shared from "@app/shared";
// or import specific identifiers, e.g.:
// import { Config } from "@app/shared";

// import { startGameLoop } from "./game.js";

const fastify = Fastify({ logger: true });
fastify.register(tournamentRoutes);
// const db = new sqlite3.Database('./database.sqlite');
// Initialize SQLite database in the data folder
const db = new sqlite3.Database("./data/database.sqlite");
let tournaments = {};

// Register CORS and WebSocket plugins
await fastify.register(cors, {
	origin: "https://localhost:8443",
	credentials: true,
});

await fastify.register(websocket);

await fastify.register(fastifyJWT, {
  secret: process.env.JWT_SECRET || "supersecret"
})

await fastify.register(fastifyCookie);

// Call the initDb function to create the tables by the time the server starts
initDb(db);

fastify.get("/api/users", async (request, reply) => {
  let params = [];
  const fields = "id, username, wins, losses, level, created_at, status, friends, blocks";
  let sql = `SELECT ${fields} FROM users ORDER BY created_at DESC`;
  try {
    const rows = await fetchAll(db, sql, params);
    console.log("Fetched users: ", rows);
    reply.send(rows);
  } catch (err) {
    reply.code(500).send({ error: err.message });
  }
});

// This will send a friend request to another user
fastify.post("/api/users/:id/sendFriendRequest", async (request, reply) => {
  // Extract userId from the URL parameters
  const userId = parseInt(request.params.id);
  // Extract friendId from the request body
  const {friendId} = request.body;
  if (!friendId || !userId) {
    return reply.code(400).send({ error: "Invalid user ID or friend ID" });
  }
  
});

fastify.post("/api/users/:id/unfriend", async (request, reply) => {
  const userId = parseInt(request.params.id);
  const {friendId} = request.body;
  if (!friendId || !userId) {
    return reply.code(400).send({ error: "Invalid user ID or friend ID" });
  }
  console.log("Unfriending user: ", friendId, "for user: ", userId);
  try {
    await removeElementFromTable(db, "friends", userId, friendId);
    reply.send({ success: true });
  } catch (err) {
    reply.code(500).send({ error: err.message });
  }
});

// Adding a block Id to the user's block list
fastify.post("/api/users/:id/block", async (request, reply) => {
  const userId = parseInt(request.params.id);
  const {blockId} = request.body;
  if (!blockId || !userId) {
    return reply.code(400).send({ error: "Invalid user ID or block ID" });
  }
  console.log("Blocking user: ", blockId, "for user: ", userId);
  try {
    await addElementToTable(db, "blocks", userId, blockId);
    reply.send({ success: true });
  } catch (err) {
    reply.code(500).send({ error: err.message });
  }
});

fastify.post("/api/users/:id/unblock", async (request, reply) => {
  const userId = parseInt(request.params.id);
  const {unblockId} = request.body;
  if (!unblockId || !userId) {
    return reply.code(400).send({ error: "Invalid user ID or unblock ID" });
  }
  console.log("Unblocking user: ", unblockId, "for user: ", userId);
  try {
    await removeElementFromTable(db, "blocks", userId, unblockId);
    reply.send({ success: true });
  } catch (err) {
    reply.code(500).send({ error: err.message });
  }
});

// WebSocket Set
const clients = new Set();

// This get endpoint will be used to establish a websocket connection
// New sockets/connections are added to the clients set (at the moment)
// Later this should be moved to a more sophisticated user management system where new users are registered and authenticated
  fastify.get("/ws", { websocket: true }, (connection, req) => {
    const ws = connection.socket;
    clients.add(ws);

	// When a client disconnects, remove it from the clients set
	ws.on("close", () => {
    console.log("Client disconnected in backend");
    clients.delete(ws);

    const index = rooms.findIndex(room => room.id === ws._roomId);
    const room = rooms[index];
    if (!room || !room.players.has(ws)) return;

    // Remove disconnected player
    room.removePlayer(ws);

    // If tournament and only one player remains, award win
    if (room.tournamentManager && room.matchId !== undefined && room.players.size === 1) {
      const remainingPlayer = [...room.players.values()][0];
      room.tournamentManager.recordMatchResult(room.matchId, remainingPlayer.id, "opponentLeft");
    }

    // Clean up room if empty
    if (room.players.size === 0) rooms.splice(index, 1);
  });


  // When (on the server side) a message is received from a client, parse it and store it in the db and broadcast it to the others
  ws.on("message", (message) => {
    let parsed;
    try {
      // Convert Buffer to string before parsing
      const str = message.toString();
      parsed = JSON.parse(str);
    } catch (e) {
      console.error("Invalid JSON received:", message.toString());
      return;
    }

    const { type } = parsed;
    console.log(`parsed message: ${JSON.stringify(parsed)}. Type: ${type}`);

    if (type === "chat") {
      const { userId, content } = parsed;
      db.run("INSERT INTO messages (userId, content) VALUES (?, ?)", [userId, content]);
      broadcaster(clients, ws, JSON.stringify({ type: 'chat', userId, content }));

    } else if (type === "join") {
      const { userId } = parsed;
      const room = getOrCreateRoom();
      if (room.players.has(ws)) return;
      room.addPlayer(userId, ws);
      ws.send(JSON.stringify({ type: "join", roomId: room.id, side: ws._side, gameConfig: room.config, state: room.state }));

    } else if (type === "leave") {
      const { userId } = parsed;
      const index = rooms.findIndex(room => room.id === ws._roomId);
      const room = rooms[index];
      ws._roomId = null;
      if (!room || !room.players.has(ws)) return;
      room.removePlayer(ws);
      broadcaster(room.players.keys(), ws, JSON.stringify({ type: "chat", userId, content: `User ${userId} left room` }));
      try { ws.send(JSON.stringify({ type: "tournamentEliminated" })); ws.close(); } catch {}
      if (room.tournamentManager && room.matchId !== undefined && room.players.size === 1) {
        const remainingPlayer = [...room.players.values()][0];
        room.tournamentManager.recordMatchResult(room.matchId, remainingPlayer.id, "opponentLeft");
      }
      if (room.players.size === 0) rooms.splice(index, 1);
    } else if (type === "ready") {
      const { userId } = parsed;
      const index = rooms.findIndex(room => room.id === ws._roomId);
      const room = rooms[index];
      if (!room || room.getPlayer(ws).ready) return;
      room.getPlayer(ws).ready = true;
      startLoop(room);
      broadcaster(room.players.keys(), null, JSON.stringify({ type: "ready", userId }));

    } else if (type === "input") {
      const { direction } = parsed;
      const index = rooms.findIndex(room => room.id === ws._roomId);
      const room = rooms[index];
      if (!room || !room.state.started) return;
      if (ws._side === "left") room.inputs.left = direction;
      else if (ws._side === "right") room.inputs.right = direction;

    } else if (type === "joinTournament") {
      try {
        const { userId } = parsed;
        
        // Prevent joining a new tournament if the user is already in any active (non-completed) tournament
        const alreadyInTournament = Object.values(tournaments).some((mgr) => {
          // mgr is a TournamentManager instance; get its serializable tournament state
          if (!mgr || typeof mgr.getTournament !== "function") return false;
          const tour = mgr.getTournament();
          if (!tour || tour.status === "completed") return false;
          const inPlayers = Array.isArray(tour.players) && tour.players.some(p => p.id === userId);
          const inWaiting = Array.isArray(tour.waitingArea) && tour.waitingArea.some(p => p.id === userId);
          const inMatches = Array.isArray(tour.matches) && tour.matches.some(m => (m.p1?.id === userId) || (m.p2?.id === userId));
          return inPlayers || inWaiting || inMatches;
        });

        if (alreadyInTournament) {
          console.log("Already in an active tournament!");
          return;
        }

        let manager = Object.values(tournaments).find(
          (t) => t.getTournament().status === "pending" && t.getTournament().players.length < 4
        );

        if (!manager) {
          manager = new TournamentManager();
          tournaments[manager.getTournament().id] = manager;
        }

        manager.addPlayer({ id: userId }, ws);
      } catch (err) {
        console.error("Failed to join tournament:", err.message);
        ws.send(JSON.stringify({
          type: "error",
          message: err.message
        }));
      }
    }
  });
});


fastify.post("/api/register", (request, reply) => {
	const { username, email, password } = request.body;

	if (!username || !email || !password)
		return reply.code(400).send({ error: "Missing fields" });

	const salt = bcrypt.genSaltSync(15); // Salt Password
	const hash = bcrypt.hashSync(password, salt); // Hash salted Password
	const secret = authenticator.generateSecret(); // Create unique key for authenticator app (2FA)
	db.run(
		"INSERT INTO users (username, email, password_hash, totp_secret) VALUES (?, ?, ?, ?)",
		[username, email, hash, secret],
		function (err) {
			if (err) {
				if (err.message.includes("UNIQUE")) {
					return reply
					.code(400)
					.send({ error: "Username or email already taken" });
				}
				return reply.code(500).send({ error: err.message });
			}
			reply.send({ id: this.lastID, username, email });
		}
	);
});

fastify.post("/api/login", (request, reply) => {
	const { username, password } = request.body;

	if (!username || !password)
		return reply.code(400).send({ error: "Missing fields" });

	db.get(
		"SELECT * FROM users WHERE username = ?",
		[username],
		(err, user) => {
			if (err)
				return reply.code(500).send({ error: err.message });
			if (!user)
				return reply.code(400).send({ error: "Invalid credentials" });
			// Authenticate password
			const isValid = bcrypt.compareSync(password, user.password_hash);
			if (!isValid)
				return reply.code(400).send({ error: "Invalid credentials" });

			// Issue temporary JWT
			const tempToken = fastify.jwt.sign(
				{ sub: user.id, stage: "mfa" },
				{ expiresIn: "5m" }
			);
			if (user.mfa_enabled) // 2FA enabled, just pass tempToken
				reply.send({ mfa_required: true, tempToken });
			else { // 2FA disabled, issue full access token in cookies
				const accessToken = fastify.jwt.sign(
					{ sub: user.id, username: user.username },
					{ expiresIn: "15m" }
				);
				reply.setCookie("auth", accessToken, {
					httpOnly: true,
					sameSite: "lax",
					secure: true,
					path: "/",
					maxAge: 15 * 60,
				});
				reply.send({ mfa_required: false, user: { id: user.id, username: user.username, email: user.email } });
			}
		}
	);
});

fastify.post("/api/verify-2fa", (request, reply) => {
	const { code, tempToken } = request.body;
	if (!code || !tempToken) {
		return reply.code(400).send({ error: "Missing fields" });
	}

	let payload;
	try {
		payload = fastify.jwt.verify(tempToken);
	} catch (e) {
		return reply.code(401).send({ error: "Invalid or expired token" });
	}
	db.get(
		"SELECT * FROM users WHERE id = ?",
		[payload.sub],
		(err, user) => {
			if (err)
				return reply.code(500).send({ error: err.message });
			if (!user)
				return reply.code(400).send({ error: "User not found" });

			// Compare input code with currently generated code by Autheticator App
			if (!authenticator.check(code, user.totp_secret)) {
				return reply.code(400).send({ error: "Invalid or expired 2FA code" });
			}

			// Issue proper JWT and create session cookie (HttpOnly)
			const accessToken = fastify.jwt.sign(
				{ sub: user.id, username: user.username },
				{ expiresIn: "15m" }
			);
			reply.setCookie("auth", accessToken, {
				httpOnly: true,
				sameSite: "lax",
				secure: true,
				path: "/",
				maxAge: 15 * 60,
			});

			reply.send({ user: { id: user.id, username: user.username, email: user.email } });
		}
	);
});

fastify.get("/api/2fa-setup", (req, reply) => {
	const userId = req.query.userId;
	db.get(
		"SELECT * FROM users WHERE id = ?",
		[userId],
		async (err, user) => {
			if (err)
				return reply.code(500).send({ error: err.message });
			if (!user)
				return reply.code(400).send({ error: "User not found" });

			// If mfa_enabled is 0, set it to 1
			if (user.mfa_enabled === 0) {
				db.run("UPDATE users SET mfa_enabled = 1 WHERE id = ?", [userId]);
			}

			const otpauth = authenticator.keyuri(user.username, "Trancsendence", user.totp_secret);
			const qr = await qrcode.toDataURL(otpauth);
			reply.send({ qr });
		}
	);
});

fastify.get("/api/me", (request, reply) => {
	console.log("Received /api/me request");
	try {
		const token = request.cookies?.auth;
		console.log("Token from cookies:", token);
		if (!token) throw new Error("No token");
		// Verify and decode the token
		const payload = fastify.jwt.verify(token);
		console.log("Token payload:", payload);
		reply.send({ id: payload.sub });
		console.log("User authenticated:", payload.username);
	} catch {
		console.log("User not authenticated");
		reply.code(401).send({ error: "Not Authenticated" });
	}
});

fastify.post("/api/logout", (reply) => {
	reply.clearCookie("auth", { path: "/" });
	reply.send({ ok: true });
});

export function startLoop(room) {
  // If the game is already started, do nothing
  if (room.state.started) return;

  // If both players are ready, start the game
  if (room.players.size === 2 && Array.from(room.players.values()).every((p) => p.ready)) {
    room.state.started = true;
    console.log("Both players are ready, starting the game in room", room.id);
    // Initialize timestamp
    room.state.timestamp = Date.now();
    // Start the game loop, which updates the game state and broadcasts it to the players every 16ms
    room.loopInterval = setInterval(() => loop(room), 16);
    // Send to the backend log that the game has started in a specific room
    console.log("Game started in room", room.id);
    // Broadcast the timestamp to the players
    broadcaster(room.players.keys(), null, JSON.stringify({ type: "start", timestamp: room.state.timestamp }));
  }
}

export function stopRoom(room, roomId) {
  // Stop the loop for this room
  if (room && room.loopInterval) {
    clearInterval(room.loopInterval);
    room.loopInterval = null;
  }

  // Remove from global rooms array (use passed roomId or room.id)
  /*const idToRemove = roomId ?? (room && room.id);
  if (typeof idToRemove !== "undefined") {
    const index = rooms.findIndex(r => r.id === idToRemove);
    if (index !== -1) rooms.splice(index, 1);
  }*/
}

// This function is called every 33ms to update the game state based on the current state and player input.
// Then broadcast it to the players, so that they can render the new state
export function loop(room) {

  // console.log("Game room tick. GameStatus:", room.state);
  const config = room.config;
  movePaddles(room.tempState, room.inputs, config);
  // run server-side ball physics in "real" mode so paddle collisions and scoring are applied
  moveBall(room.tempState, room.ballV, config, true);

  room.state.p1Y = room.tempState.p1Y;
  room.state.p2Y = room.tempState.p2Y;
  // Ensure paddle X positions are propagated to the public state so clients know paddle horizontal positions
  if (typeof room.tempState.p1X !== 'undefined') room.state.p1X = room.tempState.p1X;
  if (typeof room.tempState.p2X !== 'undefined') room.state.p2X = room.tempState.p2X;
  room.state.ballX = room.tempState.ballX;
  room.state.ballY = room.tempState.ballY;
  room.state.scoreL = room.tempState.scoreL;
  room.state.scoreR = room.tempState.scoreR;

  // broadcast the new state to the players
  broadcaster(room.players.keys(), null, JSON.stringify({ type: "state", state: room.state }));
  // console.log("Broadcasted state:", room.state);

  // Check for win condition: first to 5
  if (room.state.scoreL >= 5 || room.state.scoreR >= 5) {
    clearInterval(room.loopInterval);
    room.state.started = false;

    const winnerSide = room.state.scoreL >= 5 ? "left" : "right";
    const loserSide = winnerSide === "left" ? "left" : "right";

    // Find winner and loser entries (socket + player)
    const winnerEntry = [...room.players.entries()].find(
      ([sock, player]) => sock._side === winnerSide
    );
    const loserEntry = [...room.players.entries()].find(
      ([sock, player]) => sock._side === loserSide
    );

    const winner = winnerEntry?.[1];
    const loserSock = loserEntry?.[0];
    const loser = loserEntry?.[1];

    if (winner && loser && room.tournamentManager && room.matchId !== undefined) {
        room.tournamentManager.recordMatchResult(room.matchId, winner.userId);
      }
  }

}

// Start the Fastify server on port 3000 hosting on all interfaces
fastify.listen({ port: 3000, host: "0.0.0.0" }, (err) => {
	if (err) {
		fastify.log.error(err);
		process.exit(1);
	}
	fastify.log.info("Backend running on port 3000");
});
