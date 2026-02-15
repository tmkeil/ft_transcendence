import authRoutes from './routes/authRoutes.js';
import socialRoutes from './routes/socialRoutes.js';
import userRoutes from './routes/userRoutes.js';

export default async function (fastify, options) {
    await fastify.register(authRoutes, options);
    await fastify.register(socialRoutes, options);
    await fastify.register(userRoutes, options);
}
