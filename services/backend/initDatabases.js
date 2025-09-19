// Initialize the database and create tables if they do not exist
// Tabels: users, messages, settings
export function initDb(db) {
	db.serialize(() => {
		// Create users table with id, name, email, password_hash, created_at, number of wins, number of losses, number of draws
		db.run(`
			CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY,
			username TEXT UNIQUE NOT NULL,
			email TEXT UNIQUE NOT NULL,
			password_hash TEXT NOT NULL,
			totp_secret TEXT UNIQUE,
			wins INTEGER DEFAULT 0,
			losses INTEGER DEFAULT 0,
			level INTEGER DEFAULT 1,
			status TEXT DEFAULT 'ok',
			mfa_enabled BOOL DEFAULT 0,
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

// Run SQL queries with parameters and return a promise
// Code from: https://www.sqlitetutorial.net/sqlite-nodejs/query/
export const fetchAll = async (db, sql, params) => {
  return new Promise((resolve, reject) => {
	db.all(sql, params, (err, rows) => {
	  if (err) reject(err);
	  resolve(rows || []);
	});
  });
};

// Adds an element to a users database => (adding friends, blocking users, etc.)
export const addElementToTable = async (db, column, userId, elementId) => {
	console.log(`Adding element ${elementId} to column ${column} for user ${userId}`);
  try {
	const row = await fetchAll(db, `SELECT ${column} FROM users WHERE id = ?`, [userId]);
	if (row.length === 0) {
		console.log("No user found with id: ", userId);
	  return;
	}
	console.log("Row data: ", row);
	console.log("Column data: ", row[0]);
	console.log("Column data for column ", column, ": ", row[0][column]);

	const data = row[0]?.[column];
	if (!data || data === "") {
		// If the column is empty, just set it to the new elementId
		await db.run(`UPDATE users SET ${column} = ? WHERE id = ?`, [String(elementId), userId]);
		console.log("Element added successfully to empty column");
		return;
	}
	// Split "  3, 5,7 " into ["  3", " 5", "7 "] and then into ["3", "5", "7"]
	let oldData = data.split(",").map((id) => id.trim());

	// If the id is already in the list, do nothing
	if (oldData.includes(String(elementId))) {
		console.log("Element already in the list: ", elementId);
	  return;
	}

	console.log("Old data: ", oldData);
	// Add the new id to the list
	oldData.push(String(elementId));
	const newData = oldData.join(",");
	console.log("New data: ", newData);
	await db.run(`UPDATE users SET ${column} = ? WHERE id = ?`, [newData, userId]);
	console.log("Element added successfully");
  } catch (err) {
	console.error("Error adding element to table: ", err);
	return;
  }
};

export const removeElementFromTable = async (db, column, userId, elementId) => {
	console.log(`Removing element ${elementId} from column ${column} for user ${userId}`);
  try {
	const row = await fetchAll(db, `SELECT ${column} FROM users WHERE id = ?`, [userId]);
	if (!row || row.length === 0) {
	  console.log("No user found with id: ", userId);
	  return;
	}
	console.log("Row data: ", row);
	console.log("Column data: ", row[0]);
	console.log("Column data for column ", column, ": ", row[0][column]);
	const data = row[0]?.[column];

	if (!data || data === "") {
		console.log("Column is empty, nothing to remove");
		return;
	}
	let oldData = data.split(",").map((id) => id.trim());

	// If the id is not in the list, do nothing
	if (!oldData.includes(String(elementId))) {
		console.log("Element not found in the list: ", elementId);
	  return;
	}
	console.log("Old data: ", oldData);
	// Remove the id from the list. Keep all elements that are not equal to elementId
	oldData = oldData.filter((id) => id !== String(elementId));
	const newData = oldData.join(",");
	console.log("New data: ", newData);
	await db.run(`UPDATE users SET ${column} = ? WHERE id = ?`, [newData, userId]);
	console.log("Element removed successfully");
  } catch (err) {
	console.error("Error removing element from table: ", err);
	return;
  }
};