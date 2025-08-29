import Fastify from "fastify";
import sqlite3 from "sqlite3";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { getOrCreateRoom, rooms } from "./gameRooms.js";
import { initDb } from "./initDatabases.js";
import { broadcaster } from "./utils.js";
import { buildWorld, Derived, movePaddles } from "@app/shared";
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

    // static readonly WORLD_WIDTH = 800;
    // static readonly WORLD_HEIGHT = 600;
    // static readonly PADDLE_WIDTH = 20;
    // static readonly PADDLE_HEIGHT = 100;
    // static readonly BALL_SIZE = 20;
    // static readonly PADDLE_SPEED = 10;
    // static readonly BALL_SPEED = 5;
// fastify.get("/users", (request, reply) => {
//   db.all("SELECT * FROM users", [], (err, rows) => {
//     if (err) {
//       reply.code(500).send({ error: err.message });
//     } else {
//       reply.send(rows);
//     }
//   });
// });

// Test for adding a user via POST request to the database
fastify.post("/users", (request, reply) => {
  const { name } = request.body;
  if (!name) {
    reply.code(400).send({ error: "Name is required" });
    return;
  }
  db.run("INSERT INTO users (name) VALUES (?)", [name], function (err) {
    if (err) {
      reply.code(500).send({ error: err.message });
    } else {
      reply.send({ id: this.lastID, name });
    }
  });
});

// fastify.get("/initState", (request, reply) => {
//   const initialState = {
//     p1Y: 0,
//     p2Y: 0,
//     ballX: 0,
//     ballY: 0,
//     scoreL: 0,
//     scoreR: 0,
//     started: false,
//   };
//   reply.send(initialState);
// });

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
    clients.delete(ws);
  });

  // When (on the server side) a message is received from a client, parse it and store it in the db and broadcast it to the others
  ws.on("message", (message) => {
    try {
      const parsed = JSON.parse(message);
      const { type } = parsed;
      console.log("parsed message:", parsed);
      console.log("Backend: Received message type:", type);

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
        const { roomId, userId } = parsed;
        const room = getOrCreateRoom(roomId);
        room.addPlayer(userId, ws);
        // Response to the client, which side the player is on and the current state to render the initial game state
        ws.send(JSON.stringify({ type: "join", side: ws._side, gameConfig: room.config, state: room.state }));

      } else if (type === "ready") {
        const { userId } = parsed;
        // Set the player as ready
        const room = rooms.get(ws._roomId);
        room.getPlayer(ws).ready = true;
        startLoop(room);
        console.log(`User ${userId} is ready`);

      } else if (type === "input") {
        console.log("Backend: Received input from client:", parsed);
        const { direction } = parsed;
        const room = rooms.get(ws._roomId);
        if (!room || !room.state.started) return;

        if (ws._side === "left")  room.inputs.left  = direction;
        else if (ws._side === "right") room.inputs.right = direction;
      }
    } catch (e) {
      console.error("Invalid JSON received:", message);
      return;
    }
  });
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
  rooms.delete(roomId);
}

// This function is called every 33ms to update the game state based on the current state and player input.
// Then broadcast it to the players, so that they can render the new state
export function loop(room) {

  const config = room.config;
  // Update paddles based on input
  movePaddles(room, config);
  if (room.inputs.left !== 0) {
    room.state.p1Y += room.inputs.left * config.paddleSpeed;
  }
  if (room.inputs.right !== 0) {
    room.state.p2Y += room.inputs.right * config.paddleSpeed;
  }
  room.state.p1Y = Math.max(-config.FIELD_HEIGHT / 2 + config.paddleSize / 2,
    Math.min(config.FIELD_HEIGHT / 2 - config.paddleSize / 2, room.state.p1Y));
  room.state.p2Y = Math.max(-config.FIELD_HEIGHT / 2 + config.paddleSize / 2,
    Math.min(config.FIELD_HEIGHT / 2 - config.paddleSize / 2, room.state.p2Y));

  // console.log("Game loop tick for room", room.id);
  // Update the ball position. New position += speed / framerate (speed is 50 for now) / framerate (33ms for now)
  config.FIELD_HEIGHT;
  room.state.ballX = Math.max(-config.FIELD_WIDTH / 2, Math.min(config.FIELD_WIDTH / 2, room.state.ballX));
  room.state.ballY = Math.max(-config.FIELD_HEIGHT / 2, Math.min(config.FIELD_HEIGHT / 2, room.state.ballY));
  // room.ballV.hspd = Math.max(-1.25, Math.min(1.25, room.ballV.hspd));
  // room.ballV.vspd = Math.max(-1.25, Math.min(1.25, room.ballV.vspd));
  room.state.ballX += room.ballV.hspd;
  room.state.ballY += room.ballV.vspd;

  // Check if there is a collision on the left paddle
  if (room.state.ballX <= 4 - config.FIELD_WIDTH / 2) {
    // Check if the ball is outside the paddle range => Goal for player 2
    if (room.state.ballY < room.state.p1Y - config.paddleSize / 2 ||
      room.state.ballY > room.state.p1Y + config.paddleSize / 2) {
      room.state.scoreR += 1;
      room.state.ballX = 0;
      room.state.ballY = 0;
      room.ballV = room.resetBall();
    }
    else {
      // Hit the paddle, reflect the ball
      room.ballV.hspd *= -1.1;
    }
  }
  // Check if there is a collision on the right paddle
  else if (room.state.ballX >= config.FIELD_WIDTH / 2 - 4) {
    // Check if the ball is outside the paddle range => Goal for player 1
    if (room.state.ballY < room.state.p2Y - config.paddleSize / 2 ||
      room.state.ballY > room.state.p2Y + config.paddleSize / 2) {
      room.state.scoreL += 1;
      room.state.ballX = 0;
      room.state.ballY = 0;
      room.ballV = room.resetBall();
    }
    else {
      // Hit the paddle, reflect the ball
      room.ballV.hspd *= -1.1;
    }
  }
  // Colission with top and bottom wall
  if (room.state.ballY <= -config.FIELD_HEIGHT / 2 || room.state.ballY >= config.FIELD_HEIGHT / 2) {
    room.ballV.vspd *= -1;
  }

  // broadcast the new state to the players
  broadcaster(room.players.keys(), null, JSON.stringify({ type: "state", state: room.state }));
  // console.log("Broadcasted state:", room.state);
}
