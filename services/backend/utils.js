export function broadcaster(clients, ws, msg) {
  // console.log("Broadcasting message to all clients: ", msg);
  for (const client of clients) {
    if (client !== ws && client.readyState === 1) {
      client.send(msg);
    }
  }
}

// This extracts the userId from the JWT token in the cookie of the request
export const getUserIdFromRequest = (req) => {
  try {
    const token = req.cookies?.auth;
    if (!token) throw new Error("No token");
    const payload = fastify.jwt.verify(token);
    const userId = payload.sub;
    if (!userId) throw new Error("No userId in token payload");
    return userId;
  } catch (error) {
    console.error("Error getting userId from request:", error);
    return -1;
  }
}