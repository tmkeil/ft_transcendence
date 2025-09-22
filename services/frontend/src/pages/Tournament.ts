import { ws } from "../services/ws.js";
import type { ServerState } from "../interfaces/GameInterfaces.js";
import { GameManager } from "../managers/GameManager.js";
import { Settings } from "../game/GameSettings.js";

export const TournamentController = async (root: HTMLElement) => {
  const settings = new Settings();
  const game = new GameManager(settings);

  const user = await fetch(`https://${location.host}/api/me`, {
    method: "GET",
    credentials: "include",
  }).then((r) => r.json());

  if (!user?.id) {
    console.error("User not authenticated");
    return () => {};
  }

  // 👉 Immediately join a tournament
  try {
    const res = await fetch(`http://${location.hostname}:3000/tournaments/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ player: { id: user.id, username: user.username } }),
        });
    if (res.ok) {
      const tournament = await res.json();
      console.log("Joined tournament:", tournament);

      const statusEl = root.querySelector<HTMLDivElement>("#tournamentStatus");
      if (statusEl) {
        statusEl.textContent = `Tournament ${tournament.id} — ${tournament.status}`;
      }
    } else {
      console.error("Failed to join tournament", await res.text());
    }
  } catch (err) {
    console.error("Error joining tournament", err);
  }

  // Setup websocket + game like before
  ws.connect(user.id);

    // Listen for tournament updates
    ws.on("tournamentUpdate", (msg: { type: "tournamentUpdate"; state: any }) => {
    console.log("Tournament update:", msg.state);

    const statusEl = root.querySelector<HTMLDivElement>("#tournamentStatus");
    if (statusEl) {
        statusEl.textContent =
        `Tournament ${msg.state.id} — ${msg.state.status} — Round ${msg.state.round}`;
    }

    // Example: show players list dynamically
    const playersEl = root.querySelector<HTMLUListElement>("#tournamentPlayers");
    if (playersEl) {
        playersEl.innerHTML = "";
        msg.state.players.forEach((p: any) => {
        const li = document.createElement("li");
        li.textContent = `${p.username} (${p.ready ? "ready" : "waiting"})`;
        playersEl.appendChild(li);
        });
    }
    });

  game.getInputHandler().bindRemoteSender((dir) => {
    if (game.getInputHandler().isInputRemote() && ws) {
      ws.send({ type: "input", direction: dir, userId: user.id });
    }
  });

  ws.on("state", (m: { type: "state"; state: ServerState }) => {
    game.applyServerState(m.state);
  });

  return () => {
    // cleanup later
  };
};
