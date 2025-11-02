<div align="center">
  <h1>
    🏓 ft_transcendence (42 project)
  </h1>
  <p>
    <b><i>We are Team Babylonians.</i></b>
  </p>
</div>

In collaboration with my peers [Jacob](https://github.com/Cimex404), [Tobias](https://github.com/tmkeil) and [Betül](https://github.com/Bebuber).

## About
This is the final project of the 42 Common Core. It is meant to put all of our skills to the test by making a full-stack web application with tons of features. The premise is to make our own version of Pong with some modern features of our choice. The project is comprised of a mandatory part and optional Major and Minor modules which count toward the final score.

## Base Features
The basic features that Transcendence had to have are a local game of pong between two players and a round-based tournament system between multiple players. The gameplay must be faithful to that of the original 1972 game. How the tournament system works exactly is left up to us to decide, so we took some liberties there. Our website has to be secure and protected against SQL injections and malicious API calls. I focused primarily on this aspect, creating the login/register flow, 2FA system, JWT and cookie management and API protection with Authorization pre-handlers.

## Modules
We picked 9 major modules and 4 minor modules. A minor module is worth half a major one, thus adding up to a total of 11 module points. The requirement for 100% grade is 7, meaning we have the maximum bonus of 125%.

### Major Modules:
- **Backend Framework (Fastify)** - Our backend routes and endpoints use a Fastify for JavaScript.
- **Remote Authentication** - There is support for the Google Authenticator as a 3rd party authentication.
- **Remote Players** - The game can be played online with remote players via use of web sockets.
- **Live Chat** - There is a live chat system where players can send messages, game invites and view eachother's statistics.
- **User Dashboard and Statistics** - There is a dynamic dashboard where users can view eachother's statistics and can send friend requests. There is also a profile picture system and a blocking system.
- **AI Opponent** - An additional mode where players can play endlessly against an AI with three different difficulty settings.
- **Two-Factor Authentication and JWTs** - Sessions are stored with browser cookies and verified using JSON Web Tokens. Users can activate 2FA and scan a QR to link their Google Authenticator to their profile.
- **3D Graphics (Babylon)** - The game is rendered in 3D using a graphical library called Babylon.js (which is where our team got its name from).
- **Server-Side Pong API** - In conjunction with the remote players system we calculate the game's data such as paddle positions and ball velocity on the server and broadcast to the clients via a custom API.

### Minor Modules:
- **Frontend Framework** (Tailwind and Vite) - The frontend uses Tailwind CSS for UI design and rendering, as well as Vite for fast reload.
- **Database Implementation (sqlite)** - We use a database to store user data, friend and block data and game data.
- **DevOps Monitoring System (Prometheus, Grafana and Alert Manager)** - Three additional containers have been set up to gather metrics and display them. There is also an alert system linked to a custom Slack channel.
- **Multiple Browser Compatibility** - Our Transcendence works on multiple browsers (though Firefox is its native one).

## Usage
- You can simply clone this repo to your machine:
`git clone https://github.com/kixikCodes/ft_transcendence`

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

**Tobias Keil** - Website routing and web sockets, networking and remote player systems, database and backend setup, general project architecture, live chat and dashboard implementations, user friending, blocking and invites system, playtesting.

**Betül Büber** - DevOps and monitoring systems, playtesting.

**Myself** - Cybersecurity, user registration flow, authentication and authorization systems, user settings, frontend and UI design, project management, sound design and music, playtesting, documentation.

_Special Thanks:_ [skyecodes](https://github.com/skyecodes) for help with profile picture system implementation, playtesting and providing a server to host the project for online testing. Also, much needed moral support.
