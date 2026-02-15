import { fetchAll, addRowToTable, removeRowFromTable } from "../DatabaseUtils.js";
import { checkAuthentication, checkAuthorization } from '../utils.js';

export default async function (fastify, options) {
    const db = options.db;

    // Accept a friend request by requestId
    fastify.post("/api/friendRequests/:id/accept", { preHandler: checkAuthentication }, async (request, reply) => {
        const requestId = parseInt(request.params.id);
        if (!requestId) {
            return reply.code(400).send({ error: "Invalid request ID" });
        }
        try {
            const rows = await fetchAll(db, `SELECT * FROM friend_requests WHERE id = ?`, [requestId]);
            if (!rows) {
                return reply.code(404).send({ error: "Friend request not found" });
            }
            const friendRequest = rows[0];
            const { sender_id, receiver_id } = friendRequest;
            await addRowToTable(db, "friends", "user_id, friend_id", `${sender_id}, ${receiver_id}`);
            await addRowToTable(db, "friends", "user_id, friend_id", `${receiver_id}, ${sender_id}`);
            await removeRowFromTable(db, "friend_requests", "id", `${requestId}`);
            reply.send({ success: true });
        } catch (err) {
            reply.code(500).send({ error: err.message });
        }
    });

    // Decline a friend request by requestId
    fastify.post("/api/friendRequests/:id/decline", { preHandler: checkAuthentication }, async (request, reply) => {
        const requestId = parseInt(request.params.id);
        if (!requestId) {
            return reply.code(400).send({ error: "Invalid request ID" });
        }
        try {
            await removeRowFromTable(db, "friend_requests", "id", `${requestId}`);
            reply.send({ success: true });
        } catch (err) {
            reply.code(500).send({ error: err.message });
        }
    });

    // Get pending friend requests for a user
    fastify.get("/api/users/:id/friendRequests", { preHandler: checkAuthorization }, async (request, reply) => {
        const userId = parseInt(request.params.id);

        try {
            const rows = await fetchAll(db, `SELECT * FROM friend_requests WHERE receiver_id = ?`, [userId]);
            if (!rows) return reply.send([]);
            reply.send(rows);
        } catch (err) {
            reply.code(500).send({ error: err.message });
        }
    });

    // Get sent friend requests
    fastify.get("/api/users/:id/sentFriendRequests", { preHandler: checkAuthorization }, async (request, reply) => {
        const userId = parseInt(request.params.id);

        try {
            const rows = await fetchAll(db, `SELECT * FROM friend_requests WHERE sender_id = ?`, [userId]);
            if (!rows) return reply.send([]);
            reply.send(rows);
        } catch (err) {
            reply.code(500).send({ error: err.message });
        }
    });

    // Send a friend request
    fastify.post("/api/users/:id/sendFriendRequest", { preHandler: checkAuthorization }, async (request, reply) => {
        const userId = parseInt(request.params.id);
        const { friendId } = request.body;
        if (!friendId) {
            return reply.code(400).send({ error: "Invalid friend ID" });
        }
        try {
            const existingRequests = await fetchAll(db, `SELECT * FROM friend_requests WHERE
    (sender_id = ? AND receiver_id = ?) OR
    (sender_id = ? AND receiver_id = ?)`,
                [userId, friendId, friendId, userId]);
            if (existingRequests.length > 0) {
                return reply.code(400).send({ error: "There is already a pending friend request between these users" });
            }
            const existingFriends = await fetchAll(db, `SELECT * FROM friends WHERE
    (user_id = ? AND friend_id = ?) OR
    (user_id = ? AND friend_id = ?)`,
                [userId, friendId, friendId, userId]);
            if (existingFriends.length > 0) {
                return reply.code(400).send({ error: "These users are already friends" });
            }
            const blocks = await fetchAll(db, `SELECT * FROM blocks WHERE
    (user_id = ? AND blocked_user_id = ?) OR
    (user_id = ? AND blocked_user_id = ?)`,
                [userId, friendId, friendId, userId]);
            if (blocks.length > 0) {
                return reply.code(400).send({ error: "Cannot send friend request because one user has blocked the other" });
            }
        } catch (err) {
            return reply.code(500).send({ error: err.message });
        }
        try {
            await addRowToTable(db, "friend_requests", "sender_id, receiver_id", `${userId}, ${friendId}`);
            reply.send({ success: true });
        } catch (err) {
            reply.code(500).send({ error: err.message });
        }
    });

    // Unfriend a user
    fastify.post("/api/users/:id/unfriend", { preHandler: checkAuthorization }, async (request, reply) => {
        const userId = parseInt(request.params.id);
        const { friendId } = request.body;
        if (!friendId) {
            return reply.code(400).send({ error: "Invalid friend ID" });
        }
        try {
            await removeRowFromTable(db, "friends", "user_id, friend_id", `${userId}, ${friendId}`);
            await removeRowFromTable(db, "friends", "user_id, friend_id", `${friendId}, ${userId}`);
            reply.send({ success: true });
        } catch (err) {
            reply.code(500).send({ error: err.message });
        }
    });

    // Get friends for a user
    fastify.get("/api/users/:id/friends", { preHandler: checkAuthorization }, async (request, reply) => {
        const userId = parseInt(request.params.id);

        try {
            const rows = await fetchAll(db, `SELECT * FROM friends WHERE user_id = ?`, [userId]);
            if (!rows) return reply.send([]);
            reply.send(rows);
        } catch (err) {
            reply.code(500).send({ error: err.message });
        }
    });

    // Get users blocked by this user
    fastify.get("/api/users/:id/blocks", { preHandler: checkAuthorization }, async (request, reply) => {
        const userId = parseInt(request.params.id);

        try {
            const rows = await fetchAll(db, `SELECT * FROM blocks WHERE user_id = ?`, [userId]);
            if (!rows) return reply.send([]);
            reply.send(rows);
        } catch (err) {
            reply.code(500).send({ error: err.message });
        }
    });

    // Get users that have blocked this user
    fastify.get("/api/users/:id/blockedBy", { preHandler: checkAuthorization }, async (request, reply) => {
        const userId = parseInt(request.params.id);

        try {
            const rows = await fetchAll(db, `SELECT * FROM blocks WHERE blocked_user_id = ?`, [userId]);
            if (!rows) return reply.send([]);
            reply.send(rows);
        } catch (err) {
            reply.code(500).send({ error: err.message });
        }
    });

    // Block a user
    fastify.post("/api/users/:id/block", { preHandler: checkAuthorization }, async (request, reply) => {
        const userId = parseInt(request.params.id);
        const { blockId } = request.body;
        if (!blockId) {
            return reply.code(400).send({ error: "Invalid block ID" });
        }
        try {
            await addRowToTable(db, "blocks", "user_id, blocked_user_id", `${userId}, ${blockId}`);
            reply.send({ success: true });
        } catch (err) {
            reply.code(500).send({ error: err.message });
        }
    });

    // Unblock a user
    fastify.post("/api/users/:id/unblock", { preHandler: checkAuthorization }, async (request, reply) => {
        const userId = parseInt(request.params.id);

        const { unblockId } = request.body;
        if (!unblockId) {
            return reply.code(400).send({ error: "Invalid unblock ID" });
        }
        try {
            await removeRowFromTable(db, "blocks", "user_id, blocked_user_id", `${userId}, ${unblockId}`);
            reply.send({ success: true });
        } catch (err) {
            reply.code(500).send({ error: err.message });
        }
    });
}
