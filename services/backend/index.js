import Fastify from "fastify";
import sqlite3 from "sqlite3";
import cors from "@fastify/cors";
import { fastifyMultipart } from "@fastify/multipart";
import { fastifyStatic } from "@fastify/static";
import websocket from "@fastify/websocket";
import { getOrCreateRoom, rooms, Room } from "./gameRooms.js";
import { initDb } from "./initDatabases.js";
import { fetchAll, updateRowInTable, addRowToTable, removeRowFromTable } from "./DatabaseUtils.js";
import { broadcaster, getUserIdFromRequest } from "./utils.js";
import { buildWorld, movePaddles, moveBall } from "@app/shared";
import fastifyCookie from "@fastify/cookie";
import fastifyJWT from "@fastify/jwt";
import tournamentRoutes from "./tournament/managers/TournamentRoutes.js";
import { TournamentManager } from "./tournament/managers/TournamentManager.js";
import path, { resolve } from "node:path";
import metricsPlugin from "fastify-metrics";
import fastifyRoutes from "./fastifyRoutes.js";
import { promisify } from "node:util";

// import * as Shared from "@app/shared";
// or import specific identifiers, e.g.:
// import { Config } from "@app/shared";

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
    secret: process.env.JWT_SECRET
})

await fastify.register(fastifyCookie);

await fastify.register(fastifyMultipart);

await fastify.register(fastifyStatic, {
    root: path.join(path.resolve(), 'data', 'public'),
    prefix: '/api/public/', // optional: default '/'
});

await fastify.register(metricsPlugin, {
    endpoint: "/metrics",
    enableDefaultMetrics: true,
});

// Call the initDb function to create the tables by the time the server starts
initDb(db);

// Register routes from fastifyRoutes.js
await fastify.register(fastifyRoutes, { db, promisify });

// WebSocket map of clientIds to websockets
const clients = new Map();

// This get endpoint will be used to establish a websocket connection
// New sockets/connections are added to the clients map (at the moment)
// Later this should be moved to a more sophisticated user management system where new users are registered and authenticated
fastify.get("/ws", { websocket: true }, (connection, req) => {
    //console.log("New WebSocket connection in backend");
    // Getting the userId from the JWT token in the cookie
    const userId = getUserIdFromRequest(req, fastify);
    if (userId === -1) {
        connection.socket.close();
        return;
    }

    // Get the websocket from the connection request
    const ws = connection.socket;
    // Add the new connection to the clients map of clientIds to websockets
    let set = clients.get(userId);
    if (!set) {
        set = new Set();
        clients.set(userId, set);
    }
    // If the websocket is already in the set, it is simply ignored and not added to the set again
    set.add(ws);

    //console.log(`Current connected clients: ${[...clients.keys()]}`);

    // When a client disconnects, remove it
    ws.on("close", () => {
        // Remove the websocket from the set of websockets for this userId
        set.delete(ws);
        // If the set is empty, remove the userId from the clients map
        if (set.size === 0) clients.delete(userId);

        const index = rooms.findIndex(room => room.id === ws._roomId);
        const room = rooms[index];

        if (!room || !room.players.has(ws)) {
            for (const t of Object.values(tournaments)) {
                if (t.hasPlayer(userId)) {
                    t.handleDisconnect(userId);
                }
            }
            return;
        }

        // const userId = room.getPlayer(ws)?.id;

        // Remove disconnected player
        ws._roomId = null;
        ws._side = null;
        room.removePlayer(ws);

        // Tournament cleanup
        if (room.tournamentManager && userId) {
            room.tournamentManager.handleDisconnect(userId);
        }

        // Clean up room if empty
        if (room.players.size === 0) rooms.splice(index, 1);
    });


    // When (on the server side) a message is received from a client, parse it and store it in the db and broadcast it to the others
    ws.on("message", async (message) => {
        let parsed;
        try {
            //console.log("Received message:", message);
            // Convert Buffer to string before parsing
            //console.log("Converting to string...")
            const str = message.toString();
            //console.log("Message as string:", str);
            parsed = JSON.parse(str);
        } catch (e) {
            //console.error("Invalid JSON received:", message.toString());
            return;
        }

        const { type } = parsed;
        //console.log(`parsed message: ${JSON.stringify(parsed)}. Type: ${type}`);

        if (type === "chat") {
            const { content, to } = parsed;
            // ws?.send({ type: "chat", content: text, to: currentChat.peerId });
            //console.log(`Received chat message from user ${userId}: ${content}, to: ${to}`);
            // await addRowToTable(db, "messages", "userId, content", `${userId}, '${content}'`);
            // Send the message, which the client sent to all connected clients
            // broadcaster(to, ws, JSON.stringify({ type: 'chat', userId: userId, content: content }));
            //console.log("Sending chat message to user", to);
            const set = clients.get(to);
            if (!set) return;
            for (const socket of set) {
                if (socket.readyState === 1) {
                    socket.send(JSON.stringify({ type: "chat", userId: userId, content: content }));
                }
            }
            //console.log("Chat message sent to user", to);

            // If the user wants to send a game invite
        } else if (type === "gameInvite") {
            const { to, roomId } = parsed;

            //console.log(`The user ${userId} invites the user ${to} in room ${roomId}`);

            const inviter = await fetchAll(db, "SELECT username FROM users WHERE id = ?", [userId]);
            const inviterName = inviter[0]?.username;

            const target = clients.get(to);
            // "to" is the userId of the target user
            // We get the Set of websockets for "to" from clients map
            // If there is no Set, the user is offline
            // If a user logs out, the websockets are removed from the Set
            if (!target) {
                return;
            }

            // Send a game invite to the target users sockets
            for (const socket of target) {
                if (socket.readyState === 1) {
                    socket.send(JSON.stringify({
                        type: "gameInvite",
                        from: userId,
                        roomId: roomId,
                        inviterName: inviterName
                    }));
                }
            }

            // If the user wants to accept a game invite
        } else if (type === "acceptGameInvite") {
            const { roomId, inviterUserId } = parsed;
            //console.log(`User ${userId} wants to accept game invite from ${inviterUserId}, room: ${roomId}`);

            // Check if inviter is still online and available
            const inviter = clients.get(inviterUserId);
            if (!inviter || inviter.size === 0) {
                ws.send(JSON.stringify({
                    type: "inviteError",
                    message: "The player who invited you is offline."
                }));
                return;
            }

            // Check if inviter is already in another game
            let inGame = false;
            for (const room of rooms) {
                // Extract the ws and player from the room's players Map
                // room.player = {ws, { id, side, ready, userId }}
                for (const [roomWs, player] of room.players) {
                    // If the player who invited is found in any room => not available
                    if (player.userId === inviterUserId) {
                        inGame = true;
                        break;
                    }
                }
                if (inGame) break;
            }

            if (inGame) {
                ws.send(JSON.stringify({
                    type: "inviteError",
                    message: "The player who invited you is already in another game."
                }));
                return;
            }

            // When the users are available, let them join the room

            // Adds the accepting player to the room
            ws.send(JSON.stringify({
                type: "inviteAccepted",
                roomId: roomId
            }));

            // Add the inviter to the room
            for (const socket of inviter) {
                if (socket.readyState === 1) {
                    socket.send(JSON.stringify({
                        type: "inviteAccepted",
                        roomId: roomId
                    }));
                }
            }

        } else if (type === "join") {
            // Join a game room
            // If either the user provided a roomId in the input
            // or he got invited and clicked on accept and therefore
            // got redirected to Remote.html and Remote.ts sent the "join" message with
            // the roomId extracted from the URL, then use that roomId to join a specific room
            const { roomId: requestedRoomId } = parsed;
            let room;

            if (requestedRoomId) {
                // If the private room does not exist yet => create it
                // The other user just joins the existing private room
                room = rooms.find(r => r.id === requestedRoomId);
                if (!room) {
                    room = new Room(requestedRoomId, "private");
                    rooms.push(room);
                }
            } else {
                // Otherwise just join any random open regular room
                room = getOrCreateRoom(parsed.roomId);
            }

            if (room.players.has(ws)) return;
            room.addPlayer(userId, ws);
            // Response to the client, which side the player is on and the current state to render the initial game state
            ws.send(JSON.stringify({ type: "join", roomName: room.name, roomId: room.id, side: ws._side, gameConfig: room.config, state: room.state }));

        } else if (type === "leave") {
            const index = rooms.findIndex(room => room.id === ws._roomId);
            const room = rooms[index];
            ws._roomId = null;
            if (!room || !room.players.has(ws)) {
                for (const t of Object.values(tournaments)) {
                    if (t.hasPlayer(userId)) {
                        // explicit "leave" should abort the tournament, not run disconnect logic
                        t.handlePlayerLeave(userId);
                    }
                }
                return;
            }
            room.removePlayer(ws);

            if (room.tournamentManager && userId) {
                try {
                    room.tournamentManager.handlePlayerLeave(userId);
                } catch (err) {
                    console.warn("Error handling tournament leave:", err?.message || err);
                }
            }
            room.closeRoom();
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
            if (ws._side === "left") room.inputQueue.left.push(direction);
            else if (ws._side === "right") room.inputQueue.right.push(direction);

        } else if (type === "joinTournament") {
            try {
                // const { userId } = parsed;

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
                    //console.log("Already in an active tournament!");
                    return;
                }

                db.get("SELECT id, username FROM users WHERE id = ?", [userId], (err, row) => {
                    if (err || !row) {
                        //console.error("Failed to read user for tournament join:", err?.message);
                        return;
                    }
                    let manager = Object.values(tournaments).find(
                        (t) => t.getTournament().status === "pending" && t.getTournament().players.length < 4
                    );

                    if (!manager) {
                        manager = new TournamentManager();
                        tournaments[manager.getTournament().id] = manager;
                    }

                    manager.addPlayer({ id: userId, username: row.username }, ws);
                    ws.send(JSON.stringify({ type: 'joinedTournament', t_id: manager.getTournament().id }))
                });
            } catch (err) {
                //console.error("Failed to join tournament:", err.message);
                ws.send(JSON.stringify({
                    type: "error",
                    message: err.message
                }));
            }
        }
    });
});

export function startLoop(room) {
    // If the game is already started, do nothing
    if (room.state.started || room.loopInterval) return;

    // If both players are ready, start the game
    if (room.players.size === 2 && Array.from(room.players.values()).every((p) => p.ready)) {
        room.state.started = true;
        //console.log("Both players are ready, starting the game in room", room.id);
        // Initialize timestamp
        room.state.timestamp = Date.now();
        // Start the game loop, which updates the game state and broadcasts it to the players every 16ms
        room.loopInterval = setInterval(() => loop(room), 16);
        // Send to the backend log that the game has started in a specific room
        //console.log("Game started in room", room.id);
        // Broadcast the timestamp to the players
        broadcaster(room.players.keys(), null, JSON.stringify({ type: "start", timestamp: room.state.timestamp }));
    }
}

export function stopRoom(room) {
    // Stop the loop for this room
    if (room && room.loopInterval) {
        clearInterval(room.loopInterval);
        room.loopInterval = null;
    }

    // Clean up room resources
    if (room) {
        room.state.started = false;
        room.inputQueue = { left: [], right: [] };
        room.inputs = { left: 0, right: 0 };
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
    // Check if room still exists and should continue
    if (!room || !room.state.started || !room.loopInterval) {
        return;
    }

    // Process ALL queued inputs, not just one per loop iteration
    // This prevents input lag when one player sends multiple inputs
    if (room.inputQueue.right.length > 0) {
        room.inputs.right = room.inputQueue.right[room.inputQueue.right.length - 1];
        room.inputQueue.right = [];
    }
    if (room.inputQueue.left.length > 0) {
        room.inputs.left = room.inputQueue.left[room.inputQueue.left.length - 1];
        room.inputQueue.left = [];
    }

    let prevState = JSON.stringify(room.state);

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
    let newState = JSON.stringify({ type: "state", state: room.state });
    if (prevState !== JSON.stringify(room.state))
        broadcaster(room.players.keys(), null, newState);
    // console.log("Broadcasted state:", room.state);

    // Check for win condition: first to 5
    if (room.state.scoreL >= 5 || room.state.scoreR >= 5) {
        clearInterval(room.loopInterval);
        room.loopInterval = null;
        room.state.started = false;

        // Clear input queues to prevent stale inputs
        room.inputQueue = { left: [], right: [] };
        room.inputs = { left: 0, right: 0 };

        const winnerSide = room.state.scoreL >= 5 ? "left" : "right";
        const loserSide = winnerSide === "left" ? "right" : "left";

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

        // Update wins/losses in DB for real matches between authenticated users
        if (winner && loser) {
            // console.log("\x1b[31m Winner: ", winner, "\nLoser: ", loser, " \x1b[0m");
            Promise.all([
                new Promise(resolve => {
                    db.run("UPDATE users SET wins = wins + 1 WHERE id = ?", [winner.userId], resolve);
                }),
                new Promise(resolve => {
                    db.run("UPDATE users SET level = FLOOR((-1 + SQRT(8 * wins + 9)) / 2) WHERE id = ?;", [winner.userId], resolve);
                }),
                new Promise(resolve => {
                    db.run("UPDATE users SET losses = losses + 1 WHERE id = ?", [loser.userId], resolve);
                })
            ]).catch(err => console.error("Error was: ", err));
            if (room.tournamentManager && room.matchId !== undefined) {
                room.tournamentManager.recordMatchResult(room.matchId, winner.userId);
                const t = room.tournamentManager.getTournament();
                if (t.status === "completed")
                    delete tournaments[t.id];
            }
        }
    }

}

// Monitor active rooms and loops every 30 seconds
setInterval(() => {
    rooms.forEach((room, index) => {
        const hasLoop = !!room.loopInterval;
        const players = room.players.size;
        // Clean up empty rooms without loops
        if (players === 0 && !hasLoop && !room.state.started) {
            rooms.splice(index, 1);
        }
    });
}, 30000);

// Start the Fastify server on port 3000 hosting on all interfaces
fastify.listen({ port: 3000, host: "0.0.0.0" }, (err) => {
    if (err) {
        fastify.log.error(err);
        process.exit(1);
    }
});
