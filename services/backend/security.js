// I have split my code into this separate file just to avoid clutter.
// I know that the db not being reinitialized here is bad, I will move it back once its good.

import Fastify from "fastify";
import fastifyCookie from "@fastify/cookie";
import sqlite3 from "sqlite3";
import bcrypt from "bcryptjs";			// Password encryption
import jwt from "jsonwebtoken";			// JWT session tokens
import qrcode from "qrcode";			// QR code gen for autheticator app
import { authenticator } from "otplib";	// Authenticator App functionality

const JWT_SECRET = process.env.JWT_SECRET || "supersecret"; // Temporary, use env vars
const ACCESS_TOKEN_TTL = "15m";
// const REFRESH_TOKEN_TTL = "7d";

// Helpers for signing access and refresh Json Web Tokens
function signAccessToken(user) {
	return jwt.sign(
		{ sub: user.id, username: user.username },
		JWT_SECRET,
		{ expiresIn: ACCESS_TOKEN_TTL }
	);
}

// function signRefreshToken(user) {
// 	return jwt.sign(
// 		{ sub: user.id, username: user.username, type: "refresh" },
// 		JWT_SECRET,
// 		{ expiresIn: REFRESH_TOKEN_TTL }
// 	);
// }

const fastify = Fastify({ logger: true });
await fastify.register(fastifyCookie);
const db = new sqlite3.Database("./data/database.sqlite");

fastify.post("/api/register", (request, reply) => {
	const { username, email, password } = request.body;

	if (!username || !email || !password)
		return reply.code(400).send({ error: "Missing fields" });

	const salt = bcrypt.genSaltSync(15); // Salt Password
	const hash = bcrypt.hashSync(password, salt); // Hash salted Password
	const secret = authenticator.generateSecret(); // Create unique key for authenticator app (2FA)
	db.run(
		"INSERT INTO users (username, email, password_hash, totp_secret) VALUES (?, ?, ?, ?)",
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

	db.get(
		"SELECT * FROM users WHERE username = ?",
		[username],
		(err, user) => {
			if (err)
				return reply.code(500).send({ error: err.message });
			if (!user)
				return reply.code(400).send({ error: "Invalid credentials" });
			// Authenticate password
			const isValid = bcrypt.compareSync(password, user.password_hash);
			if (!isValid)
				return reply.code(400).send({ error: "Invalid credentials" });

			// Issue temporary JWT
			const tempToken = jwt.sign(
				{ sub: user.id, stage: "mfa" },
				JWT_SECRET,
				{ expiresIn: "5m" }
			);
			// ALWAYS require 2FA!
			reply.send({ mfa_required: true, tempToken });
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
		payload = jwt.verify(tempToken, JWT_SECRET);
	} catch (e) {
		return reply.code(401).send({ error: "Invalid or expired token" });
	}
	db.get(
		"SELECT * FROM users WHERE id = ?",
		[payload.sub],
		(err, user) => {
			if (err)
				return reply.code(500).send({ error: err.message });
			if (!user)
				return reply.code(400).send({ error: "User not found" });

			// Compare input code with currently generated code by Autheticator App
			if (!authenticator.check(code, user.totp_secret)) {
				return reply.code(400).send({ error: "Invalid or expired 2FA code" });
			}

			// Issue proper JWT and create session cookie (HttpOnly)
			const accessToken = signAccessToken(user);
			// const refreshToken = signRefreshToken(user);
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

// fastify.post("/api/refresh", (request, reply) => {
// 	const { refreshToken } = request.cookies;
// 	if (!refreshToken)
// 		return reply.code(401).send({ error: "No refresh token" });

// 	let payload;
// 	try {
// 		payload = jwt.verify(tempToken, JWT_SECRET);
// 	} catch (e) {
// 		return reply.code(401).send({ error: "Invalid refresh token" });
// 	}
// 	if (payload.type !== "refresh")
// 		return reply.code(400).send({ error: "Wrong token type" });

// 	db.get(
// 		"SELECT * FROM users WHERE id = ?",
// 		[payload.sub],
// 		(err, user) => {
// 			if (err)
// 				return reply.code(500).send({ error: err.message });
// 			if (!user)
// 				return reply.code(400).send({ error: "User not found" });
// 			const newAccess = signAccessToken(user);
// 			reply.send({ accessToken: newAccess });
// 		}
// 	);
// });

fastify.get("/api/2fa-setup", (req, reply) => {
	const userId = req.query.userId;
	db.get(
		"SELECT * FROM users WHERE id = ?",
		[userId],
		async (err, user) => {
			if (err)
				return reply.code(500).send({ error: err.message });
			if (!user)
				return reply.code(400).send({ error: "User not found" });
			const otpauth = authenticator.keyuri(user.username, "MyApp", user.totp_secret);
			const qr = await qrcode.toDataURL(otpauth);
			reply.send({ qr });
		}
	);
});

fastify.get("/api/me", (request, reply) => {
	try {
		const token = request.cookies?.auth;
		const payload = jwt.verify(token, JWT_SECRET);
		reply.send({ id: payload.sub, username: payload.username });
	} catch {
		reply.code(401).send({ error: "Not Authenticated" });
	}
});

fastify.post("/api/logout", (request, reply) => {
	// Stuff
	reply.clearCookie("auth", { path: "/" });
	reply.send({ ok: true });
});
