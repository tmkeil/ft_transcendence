import { ws } from "../services/ws.js";
import type { ServerState } from "../interfaces/GameInterfaces.js";
import { GameManager } from "../managers/GameManager.js";
import { Derived } from "@app/shared";
import { Settings } from "../game/GameSettings.js";


export const HomeController = (root: HTMLElement) => {
  // Elements from the DOM
  const chatBox = root.querySelector<HTMLDivElement>("#chat")!;
  const log = root.querySelector<HTMLTextAreaElement>("#log")!;
  const msgInput = root.querySelector<HTMLInputElement>("#msg")!;
  const sendBtn = root.querySelector<HTMLButtonElement>("#send")!;
  const joinBtn = root.querySelector<HTMLButtonElement>("#joinRoomButton")!;
  const roomInput = root.querySelector<HTMLInputElement>("#roomName")!;
  const startBtn = root.querySelector<HTMLButtonElement>("#startBtn")!;
  const stopBtn = root.querySelector<HTMLButtonElement>("#stopBtn")!;
  const resetBtn = root.querySelector<HTMLButtonElement>("#resetBtn")!;
  const aiBtn = root.querySelector<HTMLButtonElement>("#aiOpponentButton")!;
  const localBtn = root.querySelector<HTMLButtonElement>("#localOpponentButton")!;
  const remoteBtn = root.querySelector<HTMLButtonElement>("#remoteOpponentButton")!;

  // Game
  const settings = new Settings();
  const game = new GameManager(settings);

  // Remote
  const userId = Number(localStorage.getItem("userId"));
  ws.connect(userId);
      //   } else if (type === "input") {
      //   console.log("Backend: Received input from client:", parsed);
      //   const { direction } = parsed;
      //   const room = rooms.get(ws._roomId);
      //   if (!room || !room.state.started) return;

      //   if (ws._side === "left")  room.inputs.left  = direction;
      //   else if (ws._side === "right") room.inputs.right = direction;
      // }
  game.getInputHandler().bindRemoteSender((dir) => {
    if (game.getInputHandler().isInputRemote() && ws)
      ws.send({ type: "input", direction: dir, userId: userId });
  });
  chatBox.style.display = "block";

  // Actions from server like receiving chat messages, game state updates, join confirmation, game start
  function appendLog(line: string) {
    log.value += line + "\n";
    log.scrollTop = log.scrollHeight;
  }

  // When the ws receives the message type chat from the server, subscribe these callback/lambda functions to the message type via ws.ts
  ws.on("chat", (m: { type: "chat"; userId: number; content: string }) => {
    console.log("Server message: chat", m);
    appendLog(`P${m.userId}: ${m.content}`);
  });

  // When the ws receives the message type state from the server, subscribe these callback/lambda functions to the message type via ws.ts
  ws.on("state", (m: { type: "state"; state: ServerState }) => {
    game.applyServerState(m.state);
  });

  // When the ws receives the message type join from the server, subscribe these callback/lambda functions to the message type via ws.ts
  ws.on("join", (m: { type: "join"; side: string; gameConfig: Derived; state: ServerState }) => {
    console.log("Server message: joined on side: ", m.side);
    game.setConfig(m.gameConfig);
    game.applyServerState(m.state);
    appendLog(`Joined as ${m.side === "left" ? "P1 (left)" : "P2 (right)"}!`);
  });

  // When the ws receives the message type start from the server, subscribe these callback/lambda functions to the message type via ws.ts
  ws.on("start", (m: { type: "start"; timestamp: number }) => {
    console.log("Server message: start the game at", m.timestamp);
    game.setTimestamp(m.timestamp);
    appendLog('Game started!');
  });


      // if (type === "chat") {
      //   const { userId, content } = parsed;
      //   db.run("INSERT INTO messages (userId, content) VALUES (?, ?)", [
      //     userId,
      //     content,
      //   ]);
      //   // Send the message, which the client sent to all connected clients
      //   broadcaster(clients, ws, JSON.stringify({ type: 'chat', userId: userId, content: content }));

      // } else if (type === "join") {
      //   // Join a game room
      //   const { roomId, userId } = parsed;
      //   const room = getOrCreateRoom(roomId);
      //   room.addPlayer(userId, ws);
      //   // Response to the client, which side the player is on and the current state to render the initial game state
      //   ws.send(JSON.stringify({ type: "join", side: ws._side, gameConfig: room.config, state: room.state }));

      // } else if (type === "ready") {
      //   const room = rooms.get(ws._roomId);
      //   // If the player is already ready
      //   if (room.getPlayer(ws).ready) return;
      //   room.getPlayer(ws).ready = true;
      //   startLoop(room);
      //   const { userId } = parsed;
      //   console.log(`User ${userId} is ready`);
      //   // broadcaster(room.players.keys(), null, JSON.stringify({ type: "ready", userId: userId }));

      // } else if (type === "input") {
      //   console.log("Backend: Received input from client:", parsed);
      //   const { direction } = parsed;
      //   const room = rooms.get(ws._roomId);
      //   if (!room || !room.state.started) return;

      //   if (ws._side === "left")  room.inputs.left  = direction;
      //   else if (ws._side === "right") room.inputs.right = direction;
      // }
  // Actions from this user like sending chat messages, joining a room, readying up
  // Send chat message to server
  const onSend = () => {
    const text = msgInput.value.trim();
    if (!text || !ws)
      return;
    console.log("Sending chat message to server:", text);
    ws.send({ type: "chat", content: text });
    appendLog(`Me: ${text}`);
    msgInput.value = "";
  };

  // Join a game room and send it to the server
  const onJoin = () => {
    if (!ws)
      return;
    const room = roomInput.value.trim() || "room1";
    console.log("Joining room and sending to server:", room);
    ws.send({ type: "join", room });
    appendLog(`Joining room "${room}" ...`);
  };

  // Ready up and send it to the server
  const onStart = () => {
    console.log("Readying up. Playing against", settings.getOpponent());
    if (game.getInputHandler().isInputRemote() && ws)
      ws.send({ type: "ready", userId: userId });
    else
      game.getGameStatus().playing = true;
  };

  const onStop = () => {

  };
  const onReset = () => {

  };

  // When clicking on the AI Opponent button, set the opponent to AI and set remote input to false
  const onAI = () => {
    console.log("Setting opponent to AI");
    settings.setOpponent('AI');
    game.getInputHandler().setRemote(false);
  };
  
  // When clicking on the Local Opponent button, set the opponent to Person and set remote input to false
  const onLocal = () => {
    console.log("Setting opponent to Person");
    settings.setOpponent('PERSON');
    game.getInputHandler().setRemote(false);
  };

  // When clicking on the Remote Opponent button, set the opponent to Remote and set remote input to true
  const onRemote = () => {
    console.log("Setting opponent to Remote");
    settings.setOpponent('REMOTE');
    game.getInputHandler().setRemote(true);
  };

  // Add event listeners to the buttons
  sendBtn.addEventListener("click", onSend);
  joinBtn.addEventListener("click", onJoin);
  startBtn.addEventListener("click", onStart);
  stopBtn.addEventListener("click", onStop);
  resetBtn.addEventListener("click", onReset);
  aiBtn.addEventListener("click", onAI);
  localBtn.addEventListener("click", onLocal);
  remoteBtn.addEventListener("click", onRemote);

  // Cleanup function to remove event listeners when navigating away from the page
  return () => {
    sendBtn.removeEventListener("click", onSend);
    joinBtn.removeEventListener("click", onJoin);
    startBtn.removeEventListener("click", onStart);
    stopBtn.removeEventListener("click", onStop);
    resetBtn.removeEventListener("click", onReset);
    aiBtn.removeEventListener("click", onAI);
    localBtn.removeEventListener("click", onLocal);
    // remote?.disconnect();
    // game.dispose();
  };
};