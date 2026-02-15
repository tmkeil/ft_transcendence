<div align="center">
  <h1>
    🏓 ft_transcendence (42 project)
  </h1>
</div>

In collaboration with my peers [Jacob](https://github.com/Cimex404), [Noel](https://github.com/DeusExFiasco) and [Betül](https://github.com/Bebuber).

## About
ft_transcendence is the capstone project of the 42 Common Core — a full-stack multiplayer Pong web application. The game faithfully recreates the original 1972 Pong while adding modern features like remote play, a tournament system, live chat, and 3D rendering. My focus was on the backend architecture: WebSocket networking, the database layer, the live chat system, the user dashboard with friend/block management, and overall routing and project structure.

## Features
- **Remote multiplayer** — real-time online play via WebSockets with server-side game physics
- **Tournament system** — round-based matchmaking for multiple players
- **AI opponent** — single-player mode with three difficulty levels
- **3D graphics** — rendered with Babylon.js
- **Live chat** — messaging, game invites, and player statistics
- **User dashboard** — profiles, friend/block management, profile pictures, match history
- **Authentication** — JWT sessions, bcrypt password hashing, optional 2FA via Google Authenticator
- **Monitoring** — Prometheus, Grafana, and AlertManager for metrics and alerting
- **Frontend** — SPA built with Vite and Tailwind CSS
- **Database** — SQLite for persistent user, social, and game data

## Architecture

### Docker & Containerization
The entire application runs as a multi-container setup orchestrated via Docker Compose. All services communicate over a shared bridge network (`transcendence-net`). The stack consists of:

| Container | Role |
|-----------|------|
| **nginx** | Reverse proxy & SSL termination |
| **frontend** | Vite dev server serving the SPA |
| **backend** | Fastify API server (REST + WebSocket) |
| **prometheus** | Metrics collection |
| **grafana** | Metrics dashboard |
| **alertmanager** | Alert routing (Slack integration) |
| **nginx-exporter** | Exposes nginx metrics to Prometheus |

Persistent data (database, Grafana dashboards, Prometheus TSDB) is stored in Docker volumes. The backend database file is bind-mounted to `services/backend/data/` so it survives container restarts.

### Nginx Configuration
Nginx acts as the single entry point on ports `8080` (HTTP) and `8443` (HTTPS). HTTP requests are automatically redirected to HTTPS via a `301` redirect. TLS is handled with a self-signed certificate. The routing works as follows:

- `/` → proxied to the **frontend** container (`http://frontend:5173`)
- `/api/*` → proxied to the **backend** container (`http://backend:3000`)
- `/ws` → proxied to the **backend** with WebSocket upgrade headers

WebSocket connections use extended timeouts (`proxy_read_timeout 86400s`) to keep long-lived game sessions alive without nginx closing them.

### WebSocket Communication
Real-time features (remote gameplay, live chat, game invites, tournament updates) are handled over a single persistent WebSocket connection per client at `/ws`.

**Authentication:** On upgrade, the backend extracts the JWT from the `auth` cookie and verifies it via `fastify.jwt.verify()`. If the token is missing or invalid, `connection.socket.close()` is called immediately — unauthenticated clients never reach the message handler.

**Connection lifecycle:** Each authenticated user is tracked in a `Map<userId, Set<WebSocket>>`, allowing multiple concurrent connections (e.g. multiple browser tabs). On disconnect, the server removes the socket from the set, cleans up any game room the player was in, notifies active tournament managers via `handleDisconnect`, and deletes the user mapping once all of their connections are closed.

**Message protocol:** Messages are JSON-encoded with a `type` field that determines the handler:

- `chat` — broadcast chat messages to all connected clients
- `join` / `leave` — enter or leave a game room
- `input` — send paddle movement to the server-side game loop
- `ready` — signal readiness to start a match
- `gameInvite` / `acceptGameInvite` — private match invitations
- `joinTournament` — enter the tournament matchmaking queue

The server runs the game physics at 60 fps (`setInterval` at 16 ms), processes input queues, and broadcasts state updates only when the game state has changed.

## Usage
- You can simply clone this repo to your machine:
`git clone https://github.com/tmkeil/ft_transcendence`

- You **must** make a `.env` file in the root of the repository with these variables:
```
JWT_SECRET=[JSON Web Token Secret Key]

GF_SECURITY_ADMIN_USER=[Grafana Admin Username]
GF_SECURITY_ADMIN_PASSWORD=[Grafana Admin Password]
GF_AUTH_ANONYMOUS_ENABLED=false
GF_USERS_ALLOW_SIGN_UP=true

SLACK_WEBHOOK_URL=[Slack Webhook URL for Alert Manager]
```

- Then you can use the Makefile to quickly build everything:
`make build`
(You can use `make help` for info on additional Make commands)

- Once everything is up, you can navigate to `https://localhost:8443/` and bypass the warning regarding the self-signed SSL certificate.

- You are up and running!

## Credits
**Jacob Graf** - Game design, game logic, 3D graphics, user statistics, general project architecture, implementation of all gamemodes, playtesting.

**Noel** - Cybersecurity, user registration flow, authentication and authorization systems, user settings, frontend and UI design, project management, sound design and music, playtesting, documentation.

**Myself (Tobias Keil)** - Website routing and web sockets, networking and remote player systems, database and backend setup, general project architecture, live chat and dashboard implementations, user friending, blocking and invites system, playtesting.

**Betül Büber** - DevOps and monitoring systems, playtesting.
