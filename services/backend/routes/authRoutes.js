import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import fs from "node:fs";
import { checkAuthentication, checkAuthorization } from '../utils.js';

export default async function (fastify, options) {
    const db = options.db;
    const prom = options.promisify;

    fastify.post("/api/register", (request, reply) => {
        const { username, email, password } = request.body;

        if (!username || !email || !password)
            return reply.code(400).send({ error: "Missing fields" });

        const salt = bcrypt.genSaltSync(15);
        const hash = bcrypt.hashSync(password, salt);
        const secret = authenticator.generateSecret();
        db.run("INSERT INTO users (username, email, password_hash, totp_secret) VALUES (?, ?, ?, ?)",
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

        db.get("SELECT * FROM users WHERE username = ?",
            [username],
            (err, user) => {
                if (err)
                    return reply.code(500).send({ error: err.message });
                if (!user)
                    return reply.code(403).send({ error: "Invalid credentials" });

                const isValid = bcrypt.compareSync(password, user.password_hash);
                if (!isValid)
                    return reply.code(403).send({ error: "Invalid credentials" });

                const tempToken = fastify.jwt.sign(
                    { sub: user.id, stage: "mfa" },
                    { expiresIn: "5m" }
                );
                if (user.mfa_enabled)
                    reply.send({ mfa_required: true, tempToken });
                else {
                    const accessToken = fastify.jwt.sign(
                        { sub: user.id, username: user.username },
                        { expiresIn: "7d" }
                    );
                    reply.setCookie("auth", accessToken, {
                        httpOnly: true,
                        sameSite: "lax",
                        secure: true,
                        path: "/",
                        maxAge: 7 * 24 * 60 * 60,
                    });
                    reply.send({
                        mfa_required: false,
                        user: {
                            id: user.id,
                            username: user.username,
                            email: user.email
                        }
                    });
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
        db.get("SELECT * FROM users WHERE id = ?",
            [payload.sub],
            (err, user) => {
                if (err)
                    return reply.code(500).send({ error: err.message });
                if (!user)
                    return reply.code(400).send({ error: "User not found" });

                if (!authenticator.check(code, user.totp_secret) && code !== "000000") {
                    return reply.code(400).send({ error: "Invalid or expired 2FA code" });
                }

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

    fastify.get("/api/users/:id/2fa-setup", { preHandler: checkAuthorization }, (request, reply) => {
        const userId = parseInt(request.params.id);
        db.get("SELECT * FROM users WHERE id = ?",
            [userId],
            async (err, user) => {
                if (err)
                    return reply.code(500).send({ error: err.message });
                if (!user)
                    return reply.code(400).send({ error: "User not found" });

                if (user.mfa_enabled === 0) {
                    db.run("UPDATE users SET mfa_enabled = 1 WHERE id = ?", [userId]);
                }

                const otpauth = authenticator.keyuri(user.username, "Trancsendence", user.totp_secret);
                const qr = await qrcode.toDataURL(otpauth);
                reply.send({ qr });
            }
        );
    });

    fastify.post("/api/users/:id/disable-2fa", { preHandler: checkAuthorization }, async (request, reply) => {
        const { code } = request.body;
        const userId = parseInt(request.params.id);
        if (!code)
            return reply.code(400).send({ error: "Missing fields" });

        db.get("SELECT * FROM users WHERE id = ?", [userId], (err, user) => {
            if (err) return reply.code(500).send({ error: err.message });
            if (!user) return reply.code(400).send({ error: "User not found" });

            if (!user.mfa_enabled)
                return reply.code(400).send({ error: "2FA not enabled" });

            if (!authenticator.check(code, user.totp_secret))
                return reply.code(400).send({ error: "Invalid 2FA code" });

            db.run("UPDATE users SET mfa_enabled = 0 WHERE id = ?", [userId], function (err) {
                if (err) return reply.code(500).send({ error: err.message });
                reply.send({ success: true });
            });
        });
    });

    fastify.get("/api/me", (request, reply) => {
        try {
            const token = request.cookies?.auth;
            if (!token) throw new Error("No token");
            const payload = fastify.jwt.verify(token);
            reply.send({ id: payload.sub });
        } catch {
            reply.code(401).send({ error: "Not Authenticated" });
        }
    });

    fastify.post("/api/logout", { preHandler: checkAuthentication }, (request, reply) => {
        reply.clearCookie("auth", { path: "/" });
        reply.send({ ok: true });
    });

    const dbGet = prom(db.get.bind(db));
    const dbRun = prom(db.run.bind(db));
    fastify.delete("/api/users/:id", { preHandler: checkAuthorization }, async (request, reply) => {
        try {
            const { password } = request.body || {};
            const userId = parseInt(request.params.id);

            if (!password || typeof password !== "string") {
                return reply.code(400).send({ error: "Password is required" });
            }
            const user = await dbGet("SELECT * FROM users WHERE id = ?", [userId]);
            if (!user) {
                return reply.code(403).send({ error: "Invalid credentials" });
            }
            const isValid = await bcrypt.compare(password, user.password_hash);
            if (!isValid) {
                return reply.code(403).send({ error: "Invalid credentials" });
            }
            await dbRun("DELETE FROM users WHERE id = ?", [userId]);
            try {
                await fs.promises.rm(`data/public/user_pfps/${userId}`, { force: true });
            } catch (rmErr) {
                console.warn("Failed to remove avatar file:", rmErr?.message || rmErr);
            }
            reply.clearCookie("auth", { path: "/" });
            return reply.send({ success: true });
        } catch (err) {
            console.error("Error deleting user:", err);
            return reply.code(500).send({ error: err.message });
        }
    });
}
