
// Run SQL queries with parameters and return a promise
// Code from: https://www.sqlitetutorial.net/sqlite-nodejs/query/
export const fetchAll = async (db, sql, params) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows || []);
        });
    });
};

// Promisify db.run to properly support async/await and return lastID/changes
const runQuery = (db, sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) return reject(err);
            resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
};

// Allowed table and column names to prevent SQL injection via identifiers
const ALLOWED_TABLES = ["users", "friends", "friend_requests", "blocks", "messages", "settings"];
const ALLOWED_COLUMNS = [
    "id", "username", "email", "password_hash", "totp_secret", "mfa_enabled",
    "wins", "losses", "level", "status", "created_at",
    "user_id", "friend_id", "sender_id", "receiver_id", "blocked_user_id",
];

const validateTable = (table) => {
    if (!ALLOWED_TABLES.includes(table)) {
        throw new Error(`Invalid table name: ${table}`);
    }
};

const validateColumns = (columns) => {
    for (const col of columns) {
        if (!ALLOWED_COLUMNS.includes(col)) {
            throw new Error(`Invalid column name: ${col}`);
        }
    }
};

// Edits a row in a table (friend_requests, users, messages, settings, friends, blocks) in the db
// Example command:
// UPDATE ${table} SET ${column} = '${colValue}' WHERE ${keys} = '${keyValues}'
// UPDATE friend_requests SET status = 'accepted' WHERE id = 1 AND sender_id = 2
export const updateRowInTable = async (db, table, column, keys, keyValues, colValue) => {
    let keyArray = keys.split(",").map((k) => k.trim());
    let keyValuesArray = keyValues.split(",").map((k) => k.trim());

    try {
        validateTable(table);
        validateColumns([column, ...keyArray]);

        if (keyArray.length !== keyValuesArray.length) {
            throw new Error("Keys and keyValues must have the same length");
        }

        const params = [colValue];
        let sqlCmd = `UPDATE ${table} SET ${column} = ? `;
        keyArray.forEach((element, index) => {
            sqlCmd += (index === 0 ? "WHERE " : " AND ") + `${element} = ?`;
            params.push(keyValuesArray[index]);
        });

        await runQuery(db, sqlCmd, params);
    } catch (error) {
        console.error("Error updating element in table: ", error);
    }
}

// Adds a row to a table in the db
// Example command:
// INSERT INTO ${table} (${columns}) VALUES (${values})
// INSERT INTO friend_requests (sender_id, receiver_id) VALUES (1, 2)
export const addRowToTable = async (db, table, columns, values) => {
    try {
        if (!columns || !values)
            return;

        const allColumns = columns.split(",").map((c) => c.trim());
        validateTable(table);
        validateColumns(allColumns);
        const allValues = values.split(",").map((v) => v.trim());

        // Check for duplicate rows before inserting
        const tableData = await fetchAll(db, `SELECT * FROM ${table}`);
        if (tableData.length !== 0) {
            const uniqueColumns = Object.keys(tableData[0]).filter((col) => col !== "id" && col !== "created_at");
            const filteredColumns = allColumns.filter((c) => uniqueColumns.includes(c));
            const filteredValues = filteredColumns.map((col) => allValues[allColumns.indexOf(col)]);

            if (filteredColumns.length > 0) {
                const where = filteredColumns.map((col) => `${col} = ?`).join(" AND ");
                const existingRows = await fetchAll(db, `SELECT * FROM ${table} WHERE ${where}`, filteredValues);
                if (existingRows.length > 0) {
                    return;
                }
            }
        }

        const placeholders = allValues.map(() => "?").join(", ");
        const sqlCmd = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
        await runQuery(db, sqlCmd, allValues);
    } catch (error) {
        console.error("Error adding row to table: ", error);
    }
};

// Removes a row from a table in the db
// Example command:
// DELETE FROM ${table} WHERE ${keys} = '${keyValues}'
// DELETE FROM friend_requests WHERE id = 1 AND sender_id = 2
export const removeRowFromTable = async (db, table, keys, keyValues) => {
    let keyArray = keys.split(",").map((k) => k.trim());
    let keyValuesArray = keyValues.split(",").map((k) => k.trim());

    try {
        validateTable(table);
        validateColumns(keyArray);

        if (keyArray.length !== keyValuesArray.length) {
            throw new Error("Keys and keyValues must have the same length");
        }

        const params = [];
        let sqlCmd = `DELETE FROM ${table} `;
        keyArray.forEach((element, index) => {
            sqlCmd += (index === 0 ? "WHERE " : " AND ") + `${element} = ?`;
            params.push(keyValuesArray[index]);
        });

        await runQuery(db, sqlCmd, params);
    } catch (error) {
        console.error("Error removing element from table: ", error);
    }
};

// Adds an element to a users table column => (adding friends, blocking users, etc.)
export const addElementToColumn = async (db, column, userId, elementId) => {
    try {
        validateColumns([column]);
        const row = await fetchAll(db, `SELECT ${column} FROM users WHERE id = ?`, [userId]);
        if (row.length === 0) return;

        const data = row[0]?.[column];
        if (!data || data === "") {
            await runQuery(db, `UPDATE users SET ${column} = ? WHERE id = ?`, [String(elementId), userId]);
            return;
        }

        let oldData = data.split(",").map((id) => id.trim());
        if (oldData.includes(String(elementId))) return;

        oldData.push(String(elementId));
        const newData = oldData.join(",");
        await runQuery(db, `UPDATE users SET ${column} = ? WHERE id = ?`, [newData, userId]);
    } catch (err) {
        console.error("Error adding element to column: ", err);
    }
};

export const removeElementFromColumn = async (db, column, userId, elementId) => {
    try {
        validateColumns([column]);
        const row = await fetchAll(db, `SELECT ${column} FROM users WHERE id = ?`, [userId]);
        if (!row || row.length === 0) return;

        const data = row[0]?.[column];
        if (!data || data === "") return;

        let oldData = data.split(",").map((id) => id.trim());
        if (!oldData.includes(String(elementId))) return;

        oldData = oldData.filter((id) => id !== String(elementId));
        const newData = oldData.join(",");
        await runQuery(db, `UPDATE users SET ${column} = ? WHERE id = ?`, [newData, userId]);
    } catch (err) {
        console.error("Error removing element from column: ", err);
    }
};