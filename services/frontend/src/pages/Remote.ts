// Remote.ts
import { ws } from "../services/ws.js";
import type { ServerState } from "../interfaces/GameInterfaces.js";
import { GameManager } from "../managers/GameManager.js";
import { Derived } from "@app/shared";
import { Settings } from "../game/GameSettings.js";
import { navigate } from "../router/router.js";

export const RemoteController = (root: HTMLElement) => {

  // --- DOM elements from Remote.html ---
  const canvas = root.querySelector<HTMLCanvasElement>("#gameCanvas")!;
  const joinBtn = root.querySelector<HTMLButtonElement>("#joinBtn")!;
  const leaveBtn = root.querySelector<HTMLButtonElement>("#leaveBtn")!;
  const startBtn = root.querySelector<HTMLButtonElement>("#startBtn")!;
  const roomInput = root.querySelector<HTMLInputElement>("#roomInput")!;
  const tournamentStatus = root.querySelector<HTMLDivElement>("#tournamentStatus")!;

  // --- Game setup ---
  const settings = new Settings();
  const game = new GameManager(settings);
  settings.setOpponent('REMOTE');
  game.getInputHandler().setRemote(true);

  // Remote setup
  const userId = Number(localStorage.getItem("userId"));
  ws.connect(userId);

  // Send paddle movement to server
  game.getInputHandler().bindRemoteSender((dir) => {
    if (game.getInputHandler().isInputRemote() && ws)
      ws.send({ type: "input", direction: dir, userId });
  });

  // --- Handlers for incoming server messages ---
  ws.on("state", (m: { type: "state"; state: ServerState }) => {
    game.applyServerState(m.state);
  });

  ws.on("join", (m: { type: "join"; roomId: string; roomName: string; side: string; gameConfig: Derived; state: ServerState }) => {
    console.log("Joined room:", m.roomId, "as", m.side);
    game.setConfig(m.gameConfig);
    game.applyServerState(m.state);
    tournamentStatus.textContent = `Joined ${m.roomName} as ${m.side === "left" ? "P1 (left)" : "P2 (right)"}`;
  });

  ws.on("reset", () => {
    game.stopGame();
    tournamentStatus.textContent = "Game reset.";
    game.soundManager.stopTheme();
  });

  ws.on("start", (m: { type: "start"; timestamp: number }) => {
    game.setTimestamp(m.timestamp);
    tournamentStatus.textContent = "Game started!";
    game.soundManager.playTheme();
  });

  // When user clicks "Accept" on a game invitation in chat, they get redirected to:
  // "/remote?room=UUID"
  // and URLSearchParams extracts the UUID from the query string
  const urlParams = new URLSearchParams(window.location.search);
  const inviteRoomId = urlParams.get('room');
  
  // So if there was a UUID in the URL, let the user join that room automatically
  if (inviteRoomId) {
    roomInput.value = inviteRoomId;
    ws.send({ type: "join", userId, roomId: inviteRoomId });
  }

  // --- Outgoing actions ---
  const onJoin = () => {
    const roomId = roomInput.value.trim();
    ws.send({ type: "join", userId, roomId: roomId || undefined });
  };

  const onLeave = () => {
    try {
      ws.send({ type: "leave", userId });
      tournamentStatus.textContent = "Left room.";
    } catch {
      ws.close();
    }
    game.soundManager.stopTheme();
  };

  const onStart = () => {
    if (game.getInputHandler().isInputRemote() && ws) {
      ws.send({ type: "ready", userId });
      tournamentStatus.textContent = "Ready!";
    }
  };

  const onHome = () => {
    onLeave();
    navigate("/");
  };

  // --- Event listeners ---
  joinBtn.addEventListener("click", onJoin);
  leaveBtn.addEventListener("click", onHome);
  startBtn.addEventListener("click", onStart);
  window.addEventListener("beforeunload", onLeave, { once: true });
  window.addEventListener("unload", onLeave, { once: true });

  // --- Cleanup ---
  return () => {
    onLeave();
    ws.close();
    joinBtn.removeEventListener("click", onJoin);
    leaveBtn.removeEventListener("click", onHome);
    startBtn.removeEventListener("click", onStart);
    window.removeEventListener("beforeunload", onLeave);
    window.removeEventListener("unload", onLeave);
  };
};
