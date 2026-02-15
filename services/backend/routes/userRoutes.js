import { fetchAll } from "../DatabaseUtils.js";
import fs from "node:fs";
import { pipeline } from "node:stream/promises";
import { checkAuthentication, checkAuthorization } from '../utils.js';

export default async function (fastify, options) {
    const db = options.db;

    // Get all users (without password_hash and totp_secret)
    fastify.get("/api/users", { preHandler: checkAuthentication }, async (request, reply) => {
        let params = [];
        const fields = "id, username, wins, losses, level, created_at, status";
        let sql = `SELECT ${fields} FROM users ORDER BY created_at DESC`;
        try {
            const rows = await fetchAll(db, sql, params);
            reply.send(rows);
        } catch (err) {
            reply.code(500).send({ error: err.message });
        }
    });

    // Get a user by userId (without password_hash and totp_secret)
    fastify.get("/api/users/:id", { preHandler: checkAuthentication }, async (request, reply) => {
        const userId = parseInt(request.params.id);
        if (!userId) {
            return reply.code(400).send({ error: "Invalid user ID" });
        }
        const fields = 'id, username, email, wins, losses, level, created_at, status, mfa_enabled';
        try {
            const rows = await fetchAll(db, `SELECT ${fields} FROM users WHERE id = ?`, [userId]);
            if (!rows) return reply.code(404).send({ error: "User not found" });
            reply.send(rows[0]);
        } catch (err) {
            reply.code(500).send({ error: err.message });
        }
    });

    // Increment wins for a user
    fastify.post("/api/users/:id/win", { preHandler: checkAuthorization }, async (request, reply) => {
        const targetId = parseInt(request.params.id);

        try {
            await new Promise((resolve, reject) => {
                db.run("UPDATE users SET wins = wins + 1 WHERE id = ?", [targetId], function (err) {
                    if (err) return reject(err);
                    if (this.changes === 0) return reject(new Error("User not found"));
                    resolve();
                });
            });
            await new Promise((resolve, reject) => {
                db.run("UPDATE users SET level = FLOOR((-1 + SQRT(8 * wins + 9)) / 2) WHERE id = ?;", [targetId], function (err) {
                    if (err) return reject(err);
                    resolve();
                });
            });
            reply.send({ success: true });
        } catch (err) {
            if (err.message === "User not found") return reply.code(404).send({ error: err.message });
            reply.code(500).send({ error: err.message });
        }
    });

    // Upload profile picture
    fastify.post("/api/users/:id/change-pfp", { preHandler: checkAuthorization }, async (request, reply) => {
        const options = { limits: { fileSize: 10_000_000 } };
        const data = await request.file(options);
        const userId = parseInt(request.params.id);

        if (data.mimetype.startsWith("image/")) {
            await pipeline(data.file, fs.createWriteStream(`data/public/user_pfps/${userId}`));
            reply.send();
        } else {
            reply.code(400).send({ error: "Wrong file format" });
        }
    });

    // Get profile picture
    fastify.get("/api/users/:id/pfp", { preHandler: checkAuthentication }, (request, reply) => {
        const userId = parseInt(request.params.id);
        reply.sendFile(`user_pfps/${userId}`);
    });
}
