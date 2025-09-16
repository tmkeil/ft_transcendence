import { ws } from "../services/ws.js";
import type { ServerState, UserData } from "../interfaces/GameInterfaces.js";
import { GameManager } from "../managers/GameManager.js";
import { Derived } from "@app/shared";
import { Settings } from "../game/GameSettings.js";

type UsersData = {
  id: number;
  username: string;
  wins: number;
  losses: number;
  level: number;
  created_at: string;
  email?: string;
  status: "ok" | "friend" | "blocked";
};

const getUsers = async () => {
  const response = await fetch("/api/users");
  if (!response.ok) {
    console.error("Failed to fetch users:", response.statusText);
    return [];
  }

  // Get my userId from the backend
  const myUserRes = await fetch(`https://${location.host}/api/me`, { method: "GET" });
  if (!myUserRes.ok) {
    console.error("Failed to fetch my user ID:", myUserRes.statusText);
    return [];
  }

  const users: UsersData[] = await response.json();
  const myUserId = (await myUserRes.json()).id;
  if (myUserId === -1) {
    console.error("Failed to fetch my user ID");
    return [];
  }

  // Get myUser from the users list
  const myUser = users.find(u => u.id === myUserId);

  if (!myUser) {
    console.error("Failed to find my user in the users list");
    return [];
  }

  // Update each user with their relationship status
  // Get the user's friends and blocks
  const friendsRes = await fetch(`/api/users/${myUserId}/friends`);
  if (!friendsRes.ok) {
    console.error("Failed to fetch friends:", friendsRes.statusText);
    return [];
  }
  const blocksRes = await fetch(`/api/users/${myUserId}/blocks`);
  if (!blocksRes.ok) {
    console.error("Failed to fetch blocks:", blocksRes.statusText);
    return [];
  }
  const friends = await friendsRes.json();
  const blocks = await blocksRes.json();
  for (const user of users) {
    // If the user is myself, set status to "ok"
    if (user.id === myUserId) {
      user.status = "ok";
    }
    // If the user is in my blocks list, set status to "blocked"
    else if (blocks.has(String(user.id))) {
      user.status = "blocked";
    }
    // If the user is in my friends list, set status to "friend"
    else if (friends.has(String(user.id))) {
      user.status = "friend";
    }
    // Otherwise, set status to "ok"
    else {
      user.status = "ok";
    }
  }
  return users;
};

const sendRequest = async (userId: number, myUserId: number | undefined) => {
  const res = await fetch(`/api/users/${myUserId}/sendFriendRequest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ friendId: userId })
  });
  if (!res.ok) {
    console.error("Failed to add friend:", res.statusText);
  }
};

const unfriend = async (userId: number, myUserId: number | undefined) => {
  const res = await fetch(`/api/users/${myUserId}/unfriend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ friendId: userId })
  });
  if (!res.ok) {
    console.error("Failed to unfriend user:", res.statusText);
  }
};

const block = async (userId: number, myUserId: number | undefined) => {
  const res = await fetch(`/api/users/${myUserId}/block`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blockId: userId })
  });
  if (!res.ok) {
    console.error("Failed to block user:", res.statusText);
  }
};

const unblock = async (userId: number, myUserId: number | undefined) => {
  console.log("Unblock user function called with:", userId, myUserId);
  const res = await fetch(`/api/users/${myUserId}/unblock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ unblockId: userId })
  });
  if (!res.ok) {
    console.error("Failed to unblock user:", res.statusText);
  }
};

export const mountDashboard = async (root: HTMLElement) => {

  // Get the userId from localStorage
  const userId = (await fetch(`https://${location.host}/api/me`, { method: "GET" }).then(r => r.json())).id;
  if (!userId) {
    console.error("User not authenticated");
    return;
  }
  // const userId = Number(localStorage.getItem("userId") || "0");
  // if (userId === 0) {
  //   console.error("No userId found in localStorage");
  //   return;
  // }

  let users: UsersData[] = await getUsers();

  if (users.length === 0) {
    console.error("No users found from the server");
    return;
  }
  const myUser: UsersData | undefined = users.find(u => u.id === userId);
  if (!myUser) {
    console.error("Current user not found in users list");
    return;
  }

  // My Dashboard elements
  const myNameEl = root.querySelector("#my-name") as HTMLDivElement;
  const myLevelEl = root.querySelector("#my-level") as HTMLDivElement;
  const myWinsEl = root.querySelector("#my-wins") as HTMLSpanElement;
  const myLossesEl = root.querySelector("#my-losses") as HTMLSpanElement;
  const myWinrateEl = root.querySelector("#my-winrate") as HTMLSpanElement;
  const myAvatarEl = root.querySelector("#my-avatar") as HTMLDivElement;
  // Update the My Dashboard section with the user's data
  myNameEl.textContent = myUser.username;
  myLevelEl.textContent = `Level ${myUser.level}`;
  myWinsEl.textContent = myUser.wins.toString();
  myLossesEl.textContent = myUser.losses.toString();
  const totalGames = myUser.wins + myUser.losses;
  const winRate = totalGames > 0 ? Math.round((myUser.wins / totalGames) * 100) : 0;
  myWinrateEl.textContent = `${winRate}%`;

  // Function to create a user card element
  const createUserCard = (user: UsersData, myUser: UsersData | undefined) => {
    const li = document.createElement("li");
    const wins = user.wins;
    const losses = user.losses;
    const level = user.level;

    li.innerHTML = `
    <li class="usercard" data-user-id="${user.id}" data-status="${user.status}">
        <div class="usercard_left">
          <div class="avatar">A</div>
          <div class="usercard_meta">
            <div class="usercard_name">${user.username}</div>
            <div class="usercard_level">Level ${level}</div>
          </div>
        </div>

        <div class="usercard_stats">
          Wins: <span data-wins>${wins}</span> | Losses: <span data-losses>${losses}</span>
        </div>

        <div class="badge"></div>

        <div class="usercard_actions">
          <button class="btn btn--primary" data-action="add-friend">Add Friend</button>
          <button class="btn btn--ghost" data-action="unfriend">Unfriend</button>
          <button class="btn btn--ghost" data-action="block">Block</button>
          <button class="btn btn--ghost" data-action="unblock">Unblock</button>
        </div>
      </li>`;

      // Reference the buttons
      const addFriendBtn = li.querySelector('[data-action="add-friend"]') as HTMLButtonElement;
      const unfriendBtn = li.querySelector('[data-action="unfriend"]') as HTMLButtonElement;
      const blockBtn = li.querySelector('[data-action="block"]') as HTMLButtonElement;
      const unblockBtn = li.querySelector('[data-action="unblock"]') as HTMLButtonElement;

      addFriendBtn.addEventListener("click", async () => {
        console.log("Add Friend:", user.id);
          await sendRequest(user.id, myUser?.id);
          users = await getUsers();
          renderUserCards(usersListEl, users, userId, myUser);
      });

      unfriendBtn.addEventListener("click", async () => {
          console.log("Unfriend user:", user.id);
          await unfriend(user.id, myUser?.id);
          users = await getUsers();
          renderUserCards(usersListEl, users, userId, myUser);
      });

      blockBtn.addEventListener("click", async () => {
          console.log("Block user:", user.id);
          await block(user.id, myUser?.id);
          users = await getUsers();
          renderUserCards(usersListEl, users, userId, myUser);
      });

      unblockBtn.addEventListener("click", async () => {
          console.log("Unblock user:", user.id);
          await unblock(user.id, myUser?.id);
          users = await getUsers();
          renderUserCards(usersListEl, users, userId, myUser);
      });

      return li;
  };

  // Populate the User Dashboard with user cards
  const renderUserCards = (container: HTMLUListElement, users: UsersData[], userId: number, myUser: UsersData | undefined) => {
    console.log("Rendering user cards, total users:", users.length);
    console.log("Users data:", users);
    container.innerHTML = "";
    for (const user of users) {
      if (user.id === userId)
        continue;
      const userCard = createUserCard(user, myUser);
      container.appendChild(userCard);
    }
  };

  // Reference the ul element to append user cards to
  const usersListEl = root.querySelector("#users-list") as HTMLUListElement;
  // Render the user cards
  renderUserCards(usersListEl, users, userId, myUser);

  // User Dashboard elements
  const searchInput = root.querySelector("#user-search") as HTMLInputElement;

  return () => {
    console.log("Unmounting Dashboard");
  };
}

// import Fastify from "fastify";
// import sqlite3 from "sqlite3";
// import cors from "@fastify/cors";
// import websocket from "@fastify/websocket";
// import { getOrCreateRoom, rooms } from "./gameRooms.js";
// import { initDb } from "./initDatabases.js";
// import { fetchAll, updateRowInTable, addRowToTable, removeRowFromTable } from "./DatabaseUtils.js";
// import { broadcaster } from "./utils.js";
// import { buildWorld, movePaddles, moveBall } from "@app/shared";
// import fastifyCookie from "@fastify/cookie";
// import fastifyJWT from "@fastify/jwt";
// import bcrypt from "bcryptjs";			// Password encryption
// import qrcode from "qrcode";			// QR code gen for autheticator app
// import { authenticator } from "otplib";	// Authenticator App functionality
// // import * as Shared from "@app/shared";
// // or import specific identifiers, e.g.:
// // import { Config } from "@app/shared";

// // import { startGameLoop } from "./game.js";

// const fastify = Fastify({ logger: true });
// // const db = new sqlite3.Database('./database.sqlite');
// // Initialize SQLite database in the data folder
// const db = new sqlite3.Database("./data/database.sqlite");

// // Register CORS and WebSocket plugins
// await fastify.register(cors, {
// 	origin: "https://localhost:8443",
// 	credentials: true,
// });

// await fastify.register(websocket);

// await fastify.register(fastifyJWT, {
//   secret: process.env.JWT_SECRET || "supersecret"
// })

// await fastify.register(fastifyCookie);

// // Call the initDb function to create the tables by the time the server starts
// initDb(db);

// // Get all users (without password_hash and totp_secret) from the db
// fastify.get("/api/users", async (request, reply) => {
//   let params = [];
//   const fields = "id, username, wins, losses, level, created_at, status";
//   let sql = `SELECT ${fields} FROM users ORDER BY created_at DESC`;
//   try {
//     const rows = await fetchAll(db, sql, params);
//     console.log("Fetched users: ", rows);
//     reply.send(rows);
//   } catch (err) {
//     reply.code(500).send({ error: err.message });
//   }
// });

// // Get the friend requests for a user by userId from the db
// fastify.get("/api/users/:id/friendRequests", async (request, reply) => {
//   const userId = parseInt(request.params.id);
//   if (!userId) {
//     return reply.code(400).send({ error: "Invalid user ID" });
//   }
//   try {
//     const rows = await fetchAll(db, `SELECT * FROM friend_requests WHERE receiver_id = ?`, [userId]);
//     console.log("Fetched friend requests: ", rows);
//     // If there are no rows, return an empty array
//     if (!rows) return reply.send([]);
//     reply.send(rows);
//   } catch (err) {
//     reply.code(500).send({ error: err.message });
//   }
// });

// // Get the friends for a user by userId from the db
// fastify.get("/api/users/:id/friends", async (request, reply) => {
//   const userId = parseInt(request.params.id);
//   if (!userId) {
//     return reply.code(400).send({ error: "Invalid user ID" });
//   }
//   try {
//     const rows = await fetchAll(db, `SELECT * FROM friends WHERE user_id = ?`, [userId]);
//     console.log("Fetched friends: ", rows);
//     if (!rows) return reply.send([]);
//     reply.send(rows);
//   } catch (err) {
//     reply.code(500).send({ error: err.message });
//   }
// });

// // Get the blocks for a user by userId from the db
// fastify.get("/api/users/:id/blocks", async (request, reply) => {
//   const userId = parseInt(request.params.id);
//   if (!userId) {
//     return reply.code(400).send({ error: "Invalid user ID" });
//   }
//   try {
//     const rows = await fetchAll(db, `SELECT * FROM blocks WHERE user_id = ?`, [userId]);
//     console.log("Fetched blocks: ", rows);
//     if (!rows) return reply.send([]);
//     reply.send(rows);
//   } catch (err) {
//     reply.code(500).send({ error: err.message });
//   }
// });

// // This will send a friend request to another user
// fastify.post("/api/users/:id/sendFriendRequest", async (request, reply) => {
//   // Extract userId (the user which is sending the friend request) from the URL parameters
//   const userId = parseInt(request.params.id);
//   // Extract friendId (where the request should go to) from the request body
//   const {friendId} = request.body;
//   if (!friendId || !userId) {
//     return reply.code(400).send({ error: "Invalid user ID or friend ID" });
//   }
// });

// fastify.post("/api/users/:id/unfriend", async (request, reply) => {
//   const userId = parseInt(request.params.id);
//   const {friendId} = request.body;
//   if (!friendId || !userId) {
//     return reply.code(400).send({ error: "Invalid user ID or friend ID" });
//   }
//   console.log("Unfriending user: ", friendId, "for user: ", userId);
//   try {
//     await removeRowFromTable(db, "friends", "user_id, friend_id", `${userId}, ${friendId}`);
//     reply.send({ success: true });
//   } catch (err) {
//     reply.code(500).send({ error: err.message });
//   }
// });

// // Adding a block Id to the user's block list
// fastify.post("/api/users/:id/block", async (request, reply) => {
//   const userId = parseInt(request.params.id);
//   const {blockId} = request.body;
//   if (!blockId || !userId) {
//     return reply.code(400).send({ error: "Invalid user ID or block ID" });
//   }
//   console.log("Blocking user: ", blockId, "for user: ", userId);
//   try {
//     await addRowToTable(db, "blocks", "user_id, blocked_user_id", `${userId}, ${blockId}`);
//     reply.send({ success: true });
//   } catch (err) {
//     reply.code(500).send({ error: err.message });
//   }
// });

// fastify.post("/api/users/:id/unblock", async (request, reply) => {
//   const userId = parseInt(request.params.id);
//   const {unblockId} = request.body;
//   if (!unblockId || !userId) {
//     return reply.code(400).send({ error: "Invalid user ID or unblock ID" });
//   }
//   console.log("Unblocking user: ", unblockId, "for user: ", userId);
//   try {
//     await removeRowFromTable(db, "blocks", "user_id, blocked_user_id", `${userId}, ${unblockId}`);
//     reply.send({ success: true });
//   } catch (err) {
//     reply.code(500).send({ error: err.message });
//   }
// });

// // WebSocket map of clientIds to websockets
// const clients = new Map();

// export const getUserIdFromRequest = (req) => {
//   try {
//     const token = req.cookies?.auth;
//     if (!token) throw new Error("No token");
//     const payload = fastify.jwt.verify(token);
//     const userId = payload.sub;
//     if (!userId) throw new Error("No userId in token payload");
//     return userId;
//   } catch (error) {
//     console.error("Error getting userId from request:", error);
//     return null;    
//   }
// }
// // This get endpoint will be used to establish a websocket connection
// // New sockets/connections are added to the clients map (at the moment)
// // Later this should be moved to a more sophisticated user management system where new users are registered and authenticated
// fastify.get("/ws", { websocket: true }, (connection, req) => {
//   // Getting the userId from the JWT token in the cookie
//   const userId = getUserIdFromRequest(req);
//   if (!userId) {
//     connection.socket.close();
//     return;
//   }

//   // Get the websocket from the connection request
//   const ws = connection.socket;
//   // Add the new connection to the clients map of clientIds to websockets
//   let set = clients.get(userId);
//   if (!set) {
//     set = new Set();
//     clients.set(userId, set);
//   }
//   // If the websocket is already in the set, it is simply ignored and not added to the set again
//   set.add(ws);

// 	// When a client disconnects, remove it
// 	ws.on("close", () => {
//     console.log("Client disconnected in backend");
//     // Remove the websocket from the set of websockets for this userId
// 		set.delete(ws);
//     // If the set is empty, remove the userId from the clients map
//     if (set.size === 0) clients.delete(userId);
// 	});

//   // When (on the server side) a message is received from a client, parse it and store it in the db and broadcast it to the others
//   ws.on("message", async (message) => {
//     try {
//       // Parse the incoming message
//       // {"type":"chat","content":"Hello World"}
//       // {"type":"join","userId":1}
//       // {"type":"leave","userId":1,"roomId":"room-123"}
//       // {"type":"ready","userId":1}
//       const parsed = JSON.parse(message);
//       const { type } = parsed;
//       console.log(`parsed message: ${JSON.stringify(parsed)}. Type: ${type}`);

//       if (type === "chat") {
//         const { content } = parsed;
//         await addRowToTable(db, "messages", "userId, content", `${userId}, '${content}'`);
//         // Send the message, which the client sent to all connected clients
//         broadcaster(clients, ws, JSON.stringify({ type: 'chat', userId: userId, content: content }));

//       } else if (type === "join") {
//         // Join a game room
//         const room = getOrCreateRoom();
//         if (room.players.has(ws)) return;
//         room.addPlayer(userId, ws);
//         // Response to the client, which side the player is on and the current state to render the initial game state
//         ws.send(JSON.stringify({ type: "join", roomId: room.id, side: ws._side, gameConfig: room.config, state: room.state }));

//       } else if (type === "leave") {
//         // console.log(`player id: ${userId} wants to leave the channel: ${roomId}`);
//         const index = rooms.findIndex(room => room.id === ws._roomId);
//         const room = rooms[index];
//         ws._roomId = null;
//         if (!room || !room.players.has(ws)) return;
//         if (room.loopInterval) {
//           clearInterval(room.loopInterval);
//           room.loopInterval = null;
//         }
//         room.state.started = false;
//         ws.send(JSON.stringify({ type: "chat", userId: -1, content: `Left room ${ws._roomId}.` }));
//         broadcaster(room.players.keys(), ws, JSON.stringify({ type: "chat", userId: userId, content: `User ${userId} left room ${ws._roomId}` }));
//         broadcaster(room.players.keys(), null, JSON.stringify({ type: "reset" }));
//         room.removePlayer(ws);
//         if (room.players.size === 0) {
//           const index = rooms.findIndex(room => room.id === ws._roomId);
//           rooms.splice(index, 1);
//           // rooms.delete(ws._roomId);
//         }
//         try {
//           ws.close();
//         } catch {}

//       } else if (type === "ready") {
//         const {userId} = parsed;
//         console.log("In ready1");
//         console.log("ws._roomId:", ws._roomId);
//         const index = rooms.findIndex(room => room.id === ws._roomId);
//         const room = rooms[index];
//         // If the player is already ready
//         console.log("Room found: ", room);
//         if (room.getPlayer(ws).ready) return;
//         console.log("Player is not ready yet");
//         room.getPlayer(ws).ready = true;
//         console.log("In ready2");
//         startLoop(room);
//         console.log("In ready3");
//         console.log(`Sending ready state of user ${userId} to all players in room ${room.id}`);
//         broadcaster(room.players.keys(), null, JSON.stringify({ type: "ready", userId: userId }));
//         console.log(`Message sent to all players in room ${room.id} that user ${userId} is ready`);

//       } else if (type === "input") {
//         console.log("Backend: Received input from client:", parsed);
//         const { direction } = parsed;
//         const index = rooms.findIndex(room => room.id === ws._roomId);
//         const room = rooms[index];
//         if (!room || !room.state.started) return;

//         if (ws._side === "left")  room.inputs.left  = direction;
//         else if (ws._side === "right") room.inputs.right = direction;

//       } else if (type === "teardown") {
//         // console.log("Teardown message from client:", parsed);
//       }
//     } catch (e) {
//       console.error("Invalid JSON received:", message);
//       return;
//     }
//   });
// });

// fastify.post("/api/register", (request, reply) => {
// 	const { username, email, password } = request.body;

// 	if (!username || !email || !password)
// 		return reply.code(400).send({ error: "Missing fields" });

// 	const salt = bcrypt.genSaltSync(15); // Salt Password
// 	const hash = bcrypt.hashSync(password, salt); // Hash salted Password
// 	const secret = authenticator.generateSecret(); // Create unique key for authenticator app (2FA)
// 	db.run(
// 		"INSERT INTO users (username, email, password_hash, totp_secret) VALUES (?, ?, ?, ?)",
// 		[username, email, hash, secret],
// 		function (err) {
// 			if (err) {
// 				if (err.message.includes("UNIQUE")) {
// 					return reply
// 					.code(400)
// 					.send({ error: "Username or email already taken" });
// 				}
// 				return reply.code(500).send({ error: err.message });
// 			}
// 			reply.send({ id: this.lastID, username, email });
// 		}
// 	);
// });

// fastify.post("/api/login", (request, reply) => {
// 	const { username, password } = request.body;

// 	if (!username || !password)
// 		return reply.code(400).send({ error: "Missing fields" });

// 	db.get(
// 		"SELECT * FROM users WHERE username = ?",
// 		[username],
// 		(err, user) => {
// 			if (err)
// 				return reply.code(500).send({ error: err.message });
// 			if (!user)
// 				return reply.code(400).send({ error: "Invalid credentials" });
// 			// Authenticate password
// 			const isValid = bcrypt.compareSync(password, user.password_hash);
// 			if (!isValid)
// 				return reply.code(400).send({ error: "Invalid credentials" });

// 			// Issue temporary JWT
// 			const tempToken = fastify.jwt.sign(
// 				{ sub: user.id, stage: "mfa" },
// 				{ expiresIn: "5m" }
// 			);
// 			// ALWAYS require 2FA!
// 			reply.send({ mfa_required: true, tempToken });
// 		}
// 	);
// });

// fastify.post("/api/verify-2fa", (request, reply) => {
// 	const { code, tempToken } = request.body;
// 	if (!code || !tempToken) {
// 		return reply.code(400).send({ error: "Missing fields" });
// 	}

// 	let payload;
// 	try {
// 		payload = fastify.jwt.verify(tempToken);
// 	} catch (e) {
// 		return reply.code(401).send({ error: "Invalid or expired token" });
// 	}
// 	db.get(
// 		"SELECT * FROM users WHERE id = ?",
// 		[payload.sub],
// 		(err, user) => {
// 			if (err)
// 				return reply.code(500).send({ error: err.message });
// 			if (!user)
// 				return reply.code(400).send({ error: "User not found" });

// 			// Compare input code with currently generated code by Autheticator App
// 			if (!authenticator.check(code, user.totp_secret)) {
// 				return reply.code(400).send({ error: "Invalid or expired 2FA code" });
// 			}

// 			// Issue proper JWT and create session cookie (HttpOnly)
// 			const accessToken = fastify.jwt.sign(
// 				{ sub: user.id, username: user.username },
// 				{ expiresIn: "15m" }
// 			);
// 			reply.setCookie("auth", accessToken, {
// 				httpOnly: true,
// 				sameSite: "lax",
// 				secure: true,
// 				path: "/",
// 				maxAge: 15 * 60,
// 			});

// 			reply.send({ user: { id: user.id, username: user.username, email: user.email } });
// 		}
// 	);
// });

// fastify.get("/api/2fa-setup", (req, reply) => {
// 	const userId = req.query.userId;
// 	db.get(
// 		"SELECT * FROM users WHERE id = ?",
// 		[userId],
// 		async (err, user) => {
// 			if (err)
// 				return reply.code(500).send({ error: err.message });
// 			if (!user)
// 				return reply.code(400).send({ error: "User not found" });
// 			const otpauth = authenticator.keyuri(user.username, "Trancsendence", user.totp_secret);
// 			const qr = await qrcode.toDataURL(otpauth);
// 			reply.send({ qr });
// 		}
// 	);
// });

// fastify.get("/api/me", (request, reply) => {
// 	console.log("Received /api/me request");
// 	try {
// 		const token = request.cookies?.auth;
// 		console.log("Token from cookies:", token);
// 		if (!token) throw new Error("No token");
// 		// Verify and decode the token
// 		const payload = fastify.jwt.verify(token);
// 		console.log("Token payload:", payload);
// 		reply.send({ id: payload.sub });
// 		console.log("User authenticated:", payload.username);
// 	} catch {
// 		console.log("User not authenticated");
// 		reply.code(401).send({ error: "Not Authenticated" });
// 	}
// });

// fastify.post("/api/logout", (reply) => {
// 	reply.clearCookie("auth", { path: "/" });
// 	reply.send({ ok: true });
// });

// export function startLoop(room) {
//   // If the game is already started, do nothing
//   if (room.state.started) return;

//   // If both players are ready, start the game
//   if (room.players.size === 2 && Array.from(room.players.values()).every((p) => p.ready)) {
//     room.state.started = true;
//     console.log("Both players are ready, starting the game in room", room.id);
//     // Initialize timestamp
//     room.state.timestamp = Date.now();
//     // Start the game loop, which updates the game state and broadcasts it to the players every 16ms
//     room.loopInterval = setInterval(() => loop(room), 16);
//     // Send to the backend log that the game has started in a specific room
//     console.log("Game started in room", room.id);
//     // Broadcast the timestamp to the players
//     broadcaster(room.players.keys(), null, JSON.stringify({ type: "start", timestamp: room.state.timestamp }));
//   }
// }

// export function stopRoom(room, roomId) {
//   // Destroy the room and stop the game loop
//   if (room.loopInterval) clearInterval(room.loopInterval);
//   const index = rooms.findIndex(r => r.id === room.id);
//   if (index !== -1) {
//     rooms.splice(index, 1);
//   }
// }

// // This function is called every 33ms to update the game state based on the current state and player input.
// // Then broadcast it to the players, so that they can render the new state
// export function loop(room) {

//   // console.log("Game room tick. GameStatus:", room.state);
//   const config = room.config;
//   movePaddles(room.tempState, room.inputs, config);
//   // run server-side ball physics in "real" mode so paddle collisions and scoring are applied
//   moveBall(room.tempState, room.ballV, config, true);

//   room.state.p1Y = room.tempState.p1Y;
//   room.state.p2Y = room.tempState.p2Y;
//   // Ensure paddle X positions are propagated to the public state so clients know paddle horizontal positions
//   if (typeof room.tempState.p1X !== 'undefined') room.state.p1X = room.tempState.p1X;
//   if (typeof room.tempState.p2X !== 'undefined') room.state.p2X = room.tempState.p2X;
//   room.state.ballX = room.tempState.ballX;
//   room.state.ballY = room.tempState.ballY;
//   room.state.scoreL = room.tempState.scoreL;
//   room.state.scoreR = room.tempState.scoreR;

//   // broadcast the new state to the players
//   broadcaster(room.players.keys(), null, JSON.stringify({ type: "state", state: room.state }));
//   // console.log("Broadcasted state:", room.state);
// }

// // Start the Fastify server on port 3000 hosting on all interfaces
// fastify.listen({ port: 3000, host: "0.0.0.0" }, (err) => {
// 	if (err) {
// 		fastify.log.error(err);
// 		process.exit(1);
// 	}
// 	fastify.log.info("Backend running on port 3000");
// });
