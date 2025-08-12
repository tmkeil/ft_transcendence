import Fastify from "fastify";
import sqlite3 from "sqlite3";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";

const fastify = Fastify({ logger: true });
// const db = new sqlite3.Database('./database.sqlite');
// Initialize SQLite database in the data folder
const db = new sqlite3.Database("./data/database.sqlite");

// Register CORS and WebSocket plugins
await fastify.register(cors, {
  origin: true,
});
await fastify.register(websocket);

// Initialize the database and create tables if they do not exist
// Tabels: users, messages, settings
const initDb = () => {
  db.serialize(() => {
    // Create users table with id <INTEGER PRIMARY KEY> and name <TEXT>
    db.run(
      "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)"
    );
    // Create messages table with id <INTEGER PRIMARY KEY>, userId <INTEGER>, content <TEXT>, timestamp <DATETIME DEFAULT CURRENT_TIMESTAMP>
    db.run(`CREATE TABLE IF NOT EXISTS messages (
		  id INTEGER PRIMARY KEY,
		  userId INTEGER,
		  content TEXT,
		  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
		  FOREIGN KEY(userId) REFERENCES users(id)
		)`);
    // Create settings table with id <INTEGER PRIMARY KEY>, key <TEXT UNIQUE>, value <TEXT>
    db.run(
      "CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY, key TEXT UNIQUE, value TEXT)"
    );
    // Insert default settings if they do not exist
    db.run("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", [
      "app_name",
      "Fastify WebSocket Example",
    ]);
    // Insert default version if it does not exist
    db.run("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", [
      "version",
      "1.0.0",
    ]);
  });
};
// Call the initDb function to create the tables by the time the server starts
initDb();

fastify.get("/users", (request, reply) => {
  db.all("SELECT * FROM users", [], (err, rows) => {
    if (err) {
      reply.code(500).send({ error: err.message });
    } else {
      reply.send(rows);
    }
  });
});

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

// Database inspection endpoint
fastify.get("/db/info", (request, reply) => {
  db.get("SELECT COUNT(*) as count FROM users", [], (err, row) => {
    if (err) {
      reply.code(500).send({ error: err.message });
    } else {
      reply.send({
        table: "users",
        userCount: row.count,
        timestamp: new Date().toISOString(),
      });
    }
  });
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
    clients.delete(ws);
  });

  // When (on the server side) a message is received from a client, parse it and store it in the db and broadcast it to the others
  ws.on("message", (message) => {
    try {
      const parsed = JSON.parse(message);
      const { userId, content } = parsed;
      db.run(
        "INSERT INTO messages (userId, content) VALUES (?, ?)",
        [userId, content],
        (err) => {
          if (err) console.error("DB Error:", err.message);
        }
      );

	  console.log("Received message:", parsed);
      // Send the message, which the client sent to all connected clients
      for (const client of clients) {
        if (client !== ws && client.readyState === 1) {
          client.send(JSON.stringify({ userId, content }));
        }
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
