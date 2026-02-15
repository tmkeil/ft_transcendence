export function broadcaster(clients, ws, msg) {
    //console.log("Broadcasting message to all clients: ", msg);

    for (const client of clients) {
        if (!client)
            continue;
        try {
            if (client !== ws && client.readyState === 1)
                client.send(msg);
        }
        catch {
            console.warn("Failed to broadcast message to client!");
        }
    }
}

export const INVALID_USER = -1;

// This extracts the userId from the JWT token in the cookie of the request
export const getUserIdFromRequest = (req, fastify) => {
    try {
        const token = req.cookies?.auth;
        if (!token) throw new Error("No token");
        const payload = fastify.jwt.verify(token);
        const userId = payload.sub;
        if (!userId) throw new Error("No userId in token payload");
        return userId;
    } catch (error) {
        console.error("Error getting userId from request:", error);
        return INVALID_USER;
    }
}

const unauthenticated = (reply) => {
    reply.code(401).send({ error: "Not Authenticated" });
    return reply;
};
const unauthorized = (reply) => {
    reply.code(403).send({ error: "Unauthorized" });
    return reply;
};

export function checkAuthentication(request, reply, done) {
    const token = request.cookies?.auth;
    if (!token) return unauthenticated(reply);
    const payload = this.jwt.verify(token);
    if (!payload) return unauthenticated(reply);
    const userId = payload.sub;
    if (!userId) return unauthenticated(reply);
    done();
}

export function checkAuthorization(request, reply, done) {
    const token = request.cookies?.auth;
    if (!token) return unauthenticated(reply);
    const payload = this.jwt.verify(token);
    if (!payload) return unauthenticated(reply);
    const userId = payload.sub;
    if (!userId) return unauthenticated(reply);
    const requestUserId = parseInt(request.params.id);
    if (!requestUserId || userId != requestUserId) return unauthorized(reply);
    done();
}
