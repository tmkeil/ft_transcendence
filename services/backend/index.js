import Fastify from "fastify";
import sqlite3 from "sqlite3";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import bcrypt from "bcryptjs";
import { getOrCreateRoom, rooms } from "./gameRooms.js";
import { initDb } from "./initDatabases.js";
import { broadcaster } from "./utils.js";
import { buildWorld, movePaddles, moveBall } from "@app/shared";
// import * as Shared from "@app/shared";
// or import specific identifiers, e.g.:
// import { Config } from "@app/shared";

// import { startGameLoop } from "./game.js";

const fastify = Fastify({ logger: true });
// const db = new sqlite3.Database('./database.sqlite');
// Initialize SQLite database in the data folder
const db = new sqlite3.Database("./data/database.sqlite");

// Register CORS and WebSocket plugins
await fastify.register(cors, {
	origin: true,
});
await fastify.register(websocket);
// Call the initDb function to create the tables by the time the server starts
initDb(db);

fastify.get("/users", (request, reply) => {
  db.all("SELECT * FROM users", [], (err, rows) => {
    if (err) {
      reply.code(500).send({ error: err.message });
    } else {
      reply.send(rows);
    }
  });
});

// Database inspection endpoint
// fastify.get("/db/info", (request, reply) => {
//   db.get("SELECT COUNT(*) as count FROM users", [], (err, row) => {
//     if (err) {
//       reply.code(500).send({ error: err.message });
//     } else {
//       reply.send({
//         table: "users",
//         userCount: row.count,
//         timestamp: new Date().toISOString(),
//       });
//     }
//   });
// });

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
	});

  // When (on the server side) a message is received from a client, parse it and store it in the db and broadcast it to the others
  ws.on("message", (message) => {
    try {
      const parsed = JSON.parse(message);
      const { type } = parsed;
      console.log(`parsed message: ${JSON.stringify(parsed)}. Type: ${type}`);

      if (type === "chat") {
        const { userId, content } = parsed;
        db.run("INSERT INTO messages (userId, content) VALUES (?, ?)", [
          userId,
          content,
        ]);
        // Send the message, which the client sent to all connected clients
        broadcaster(clients, ws, JSON.stringify({ type: 'chat', userId: userId, content: content }));

      } else if (type === "join") {
        // Join a game room
        const { userId } = parsed;
        const room = getOrCreateRoom();
        if (room.players.has(ws)) return;
        room.addPlayer(userId, ws);
        // Response to the client, which side the player is on and the current state to render the initial game state
        ws.send(JSON.stringify({ type: "join", roomId: room.id, side: ws._side, gameConfig: room.config, state: room.state }));

      } else if (type === "leave") {
        const { userId } = parsed;
        // console.log(`player id: ${userId} wants to leave the channel: ${roomId}`);
        const index = rooms.findIndex(room => room.id === ws._roomId);
        const room = rooms[index];
        ws._roomId = null;
        if (!room || !room.players.has(ws)) return;
        if (room.loopInterval) {
          clearInterval(room.loopInterval);
          room.loopInterval = null;
        }
        room.state.started = false;
        ws.send(JSON.stringify({ type: "chat", userId: -1, content: `Left room ${ws._roomId}.` }));
        broadcaster(room.players.keys(), ws, JSON.stringify({ type: "chat", userId: userId, content: `User ${userId} left room ${ws._roomId}` }));
        broadcaster(room.players.keys(), null, JSON.stringify({ type: "reset" }));
        room.removePlayer(ws);
        if (room.players.size === 0) {
          const index = rooms.findIndex(room => room.id === ws._roomId);
          rooms.splice(index, 1);
          // rooms.delete(ws._roomId);
        }
        try {
          ws.close();
        } catch {}

      } else if (type === "ready") {
        const {userId} = parsed;
        console.log("In ready1");
        console.log("ws._roomId:", ws._roomId);
        const index = rooms.findIndex(room => room.id === ws._roomId);
        const room = rooms[index];
        // If the player is already ready
        console.log("Room found: ", room);
        if (room.getPlayer(ws).ready) return;
        console.log("Player is not ready yet");
        room.getPlayer(ws).ready = true;
        console.log("In ready2");
        startLoop(room);
        console.log("In ready3");
        console.log(`Sending ready state of user ${userId} to all players in room ${room.id}`);
        broadcaster(room.players.keys(), null, JSON.stringify({ type: "ready", userId: userId }));
        console.log(`Message sent to all players in room ${room.id} that user ${userId} is ready`);

      } else if (type === "input") {
        console.log("Backend: Received input from client:", parsed);
        const { direction } = parsed;
        const index = rooms.findIndex(room => room.id === ws._roomId);
        const room = rooms[index];
        if (!room || !room.state.started) return;

        if (ws._side === "left")  room.inputs.left  = direction;
        else if (ws._side === "right") room.inputs.right = direction;

      } else if (type === "teardown") {
        // console.log("Teardown message from client:", parsed);
      }
    } catch (e) {
      console.error("Invalid JSON received:", message);
      return;
    }
  });
});

fastify.post("/api/register", (request, reply) => {
	const { username, email, password } = request.body;

	if (!username || !email || !password) {
		return reply.code(400).send({ error: "Missing fields" });
	}

	const salt = bcrypt.genSaltSync(15);
	const hash = bcrypt.hashSync(password, salt);
	db.run(
		"INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
		[username, email, hash],
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

	if (!username || !password) {
		return reply.code(400).send({ error: "Missing fields" });
	}

	db.get(
		"SELECT * FROM users WHERE username = ?",
		[username],
		(err, user) => {
			if (err) {
				return reply.code(500).send({ error: err.message });
			}
			if (!user) {
				return reply.code(400).send({ error: "Invalid credentials" });
			}

			const isValid = bcrypt.compareSync(password, user.password_hash);
			if (!isValid) {
				return reply.code(400).send({ error: "Invalid credentials" });
			}

			// We just return user info. In a real app, use sessions or JWTs.
			reply.send({ id: user.id, username: user.username, email: user.email });
		}
	);
});

// Start the Fastify server on port 3000 hosting on all interfaces
fastify.listen({ port: 3000, host: "0.0.0.0" }, (err) => {
	if (err) {
		fastify.log.error(err);
		process.exit(1);
	}
	fastify.log.info("Backend running on port 3000");
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
  // Destroy the room and stop the game loop
  if (room.loopInterval) clearInterval(room.loopInterval);
  const index = rooms.findIndex(room => room.id === ws._roomId);
  rooms.splice(index, 1);
  //         // rooms.delete(ws._roomId);
  //       }
  // rooms.delete(roomId);
}

// This function is called every 33ms to update the game state based on the current state and player input.
// Then broadcast it to the players, so that they can render the new state
export function loop(room) {

  // console.log("Game room tick. GameStatus:", room.state);
  const config = room.config;
  movePaddles(room.tempState, room.inputs, config);
  moveBall(room.tempState, room.ballV, config);

  room.state.p1Y = room.tempState.p1Y;
  room.state.p2Y = room.tempState.p2Y;
  room.state.ballX = room.tempState.ballX;
  room.state.ballY = room.tempState.ballY;
  room.state.scoreL = room.tempState.scoreL;
  room.state.scoreR = room.tempState.scoreR;

  // broadcast the new state to the players
  broadcaster(room.players.keys(), null, JSON.stringify({ type: "state", state: room.state }));
  // console.log("Broadcasted state:", room.state);
}
