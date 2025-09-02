// Initialize the database and create tables if they do not exist
// Tabels: users, messages, settings
export function initDb(db) {
  db.serialize(() => {
    // Create users table with id <INTEGER PRIMARY KEY> and name <TEXT>
    db.run(`
			CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY,
			username TEXT UNIQUE NOT NULL,
			email TEXT UNIQUE NOT NULL,
			password_hash TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
			)
		`);
    // Create messages table with id <INTEGER PRIMARY KEY>, userId <INTEGER>, content <TEXT>, timestamp <DATETIME DEFAULT CURRENT_TIMESTAMP>
		db.run(`CREATE TABLE IF NOT EXISTS messages (
			id INTEGER PRIMARY KEY,
			userId INTEGER,
			content TEXT,
			timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(userId) REFERENCES users(id)
			)
		`);
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
