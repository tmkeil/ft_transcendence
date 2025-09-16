import { ws } from "../services/ws.js";
import type { ServerState } from "../interfaces/GameInterfaces.js";
import { GameManager } from "../managers/GameManager.js";
import { Derived } from "@app/shared";
import { Settings } from "../game/GameSettings.js";


export const HomeController = async (root: HTMLElement) => {
  // Elements from the DOM
<<<<<<< HEAD
  console.log("Home page");
  const chatBox = root.querySelector<HTMLDivElement>("#chat")!;
  const log = root.querySelector<HTMLTextAreaElement>("#log")!;
  const msgInput = root.querySelector<HTMLInputElement>("#msg")!;
  const sendBtn = root.querySelector<HTMLButtonElement>("#send")!;
  const joinBtn = root.querySelector<HTMLButtonElement>("#joinRoomButton")!;
  const leaveBtn = root.querySelector<HTMLButtonElement>("#leaveRoomButton")!;
  const startBtn = root.querySelector<HTMLButtonElement>("#startBtn")!;
  const stopBtn = root.querySelector<HTMLButtonElement>("#stopBtn")!;
  const aiBtn = root.querySelector<HTMLButtonElement>("#aiOpponentButton")!;
  const localBtn = root.querySelector<HTMLButtonElement>("#localOpponentButton")!;
  const remoteBtn = root.querySelector<HTMLButtonElement>("#remoteOpponentButton")!;
=======
  // const chatBox = root.querySelector<HTMLDivElement>("#chat")!;
  // const log = root.querySelector<HTMLTextAreaElement>("#log")!;
  // const msgInput = root.querySelector<HTMLInputElement>("#msg")!;
  // const sendBtn = root.querySelector<HTMLButtonElement>("#send")!;
  // const joinBtn = root.querySelector<HTMLButtonElement>("#joinRoomButton")!;
  // const roomInput = root.querySelector<HTMLInputElement>("#roomName")!;
  // const startBtn = root.querySelector<HTMLButtonElement>("#startBtn")!;
  // const stopBtn = root.querySelector<HTMLButtonElement>("#stopBtn")!;
  // const resetBtn = root.querySelector<HTMLButtonElement>("#resetBtn")!;
  // const aiBtn = root.querySelector<HTMLButtonElement>("#aiOpponentButton")!;
  // const localBtn = root.querySelector<HTMLButtonElement>("#localOpponentButton")!;
  // const remoteBtn = root.querySelector<HTMLButtonElement>("#remoteOpponentButton")!;
>>>>>>> sessions-JWT-feature

  // Game
  const settings = new Settings();
  const game = new GameManager(settings);

  // Remote
  //   console.log("Checking authentication status...");
  // const res = await fetch("/api/me", { method: "GET" });
  // console.log("Authentication status response:", res);
  // const user = await res.json();
  // console.log("Id of the authenticated user:", user.id);

  const userId = (await fetch(`https://${location.host}/api/me`, { method: "GET" }).then(r => r.json())).id;
  if (!userId) {
    console.error("User not authenticated");
  }
  ws.connect(userId);
  game.getInputHandler().bindRemoteSender((dir) => {
    if (game.getInputHandler().isInputRemote() && ws)
      ws.send({ type: "input", direction: dir, userId: userId });
  });
  // chatBox.style.display = "block";

  // Actions from server like receiving chat messages, game state updates, join confirmation, game start
  // function appendLog(line: string) {
  //   log.value += line + "\n";
  //   log.scrollTop = log.scrollHeight;
  // }

  // When the ws receives the message type chat from the server, subscribe these callback/lambda functions to the message type via ws.ts
<<<<<<< HEAD
  ws.on("chat", (m: { type: "chat"; userId: number; content: string }) => {
    console.log("Server message: chat", m);
    m.userId != -1 ? 
    appendLog(`P${m.userId}: ${m.content}`) :
    appendLog(`${m.content}`);
  });
=======
  // ws.on("chat", (m: { type: "chat"; userId: number; content: string }) => {
  //   console.log("Server message: chat", m);
  //   appendLog(`P${m.userId}: ${m.content}`);
  // });
>>>>>>> sessions-JWT-feature

  // When the ws receives the message type state from the server, subscribe these callback/lambda functions to the message type via ws.ts
  ws.on("state", (m: { type: "state"; state: ServerState }) => {
    game.applyServerState(m.state);
  });

  // When the ws receives the message type join from the server, subscribe these callback/lambda functions to the message type via ws.ts
<<<<<<< HEAD
  ws.on("join", (m: { type: "join"; roomId: string; side: string; gameConfig: Derived; state: ServerState }) => {
    console.log("Server message: joined on side: ", m.side);
    game.setConfig(m.gameConfig);
    game.applyServerState(m.state);
    appendLog(`Joined ${m.roomId} as ${m.side === "left" ? "P1 (left)" : "P2 (right)"}!`);
  });

  ws.on("reset", (m: { type: "reset" }) => {
    game.stopGame();
  });

  // When the ws receives the message type start from the server, subscribe these callback/lambda functions to the message type via ws.ts
  ws.on("start", (m: { type: "start"; timestamp: number }) => {
    game.setTimestamp(m.timestamp);
    appendLog('Game started!');
  });
=======
  // ws.on("join", (m: { type: "join"; side: string; gameConfig: Derived; state: ServerState }) => {
  //   console.log("Server message: joined on side: ", m.side);
  //   game.setConfig(m.gameConfig);
  //   game.applyServerState(m.state);
  //   appendLog(`Joined as ${m.side === "left" ? "P1 (left)" : "P2 (right)"}!`);
  // });

  // When the ws receives the message type start from the server, subscribe these callback/lambda functions to the message type via ws.ts
  // ws.on("start", (m: { type: "start"; timestamp: number }) => {
  //   console.log("Server message: start the game at", m.timestamp);
  //   game.setTimestamp(m.timestamp);
  //   appendLog('Game started!');
  // });
>>>>>>> sessions-JWT-feature

  // Actions from this user like sending chat messages, joining a room, readying up
  // Send chat message to server
  // const onSend = () => {
  //   const text = msgInput.value.trim();
  //   if (!text || !ws)
  //     return;
  //   console.log("Sending chat message to server:", text);
  //   ws.send({ type: "chat", content: text });
  //   appendLog(`Me: ${text}`);
  //   msgInput.value = "";
  // };

  // Join a game room and send it to the server
<<<<<<< HEAD
  const onJoin = () => {
    if (!ws)
      return;
    ws.send({ type: "join", userId: userId });
  };

  // Leave a game room and send it to the server
  const onLeave = () => {
    try {
      ws.send({ type: "leave", userId: userId });
    } catch {
      ws.close();
    }
  };

  // Ready up and send it to the server
  const onStart = () => {
    if (game.getInputHandler().isInputRemote() && ws)
      ws.send({ type: "ready", userId: userId });
    else if (settings.getOpponent() !== 'REMOTE') {
      game.getGameStatus().playing = true;
      appendLog(`Local game started! Playing against ${settings.getOpponent()}`);
    }
  };

  const onStop = () => {
    if (game.getGameStatus().playing)
      appendLog(`Local game stopped!`);
    game.stopGame();
  };
=======
  // const onJoin = () => {
  //   if (!ws)
  //     return;
  //   const room = roomInput.value.trim() || "room1";
  //   console.log("Joining room and sending to server:", room);
  //   ws.send({ type: "join", room });
  //   appendLog(`Joining room "${room}" ...`);
  // };

  // Ready up and send it to the server
  // const onStart = () => {
  //   console.log("Readying up. Playing against", settings.getOpponent());
  //   if (game.getInputHandler().isInputRemote() && ws)
  //     ws.send({ type: "ready", userId: userId });
  //   else
  //     game.getGameStatus().playing = true;
  // };

  // const onStop = () => {

  // };
  // const onReset = () => {

  // };
>>>>>>> sessions-JWT-feature

  // When clicking on the AI Opponent button, set the opponent to AI and set remote input to false
  // const onAI = () => {
  //   console.log("Setting opponent to AI");
  //   settings.setOpponent('AI');
  //   game.getInputHandler().setRemote(false);
  // };
  
  // When clicking on the Local Opponent button, set the opponent to Person and set remote input to false
  // const onLocal = () => {
  //   console.log("Setting opponent to Person");
  //   settings.setOpponent('PERSON');
  //   game.getInputHandler().setRemote(false);
  // };

  // When clicking on the Remote Opponent button, set the opponent to Remote and set remote input to true
  // const onRemote = () => {
  //   console.log("Setting opponent to Remote");
  //   settings.setOpponent('REMOTE');
  //   game.getInputHandler().setRemote(true);
  // };

  // Add event listeners to the buttons
<<<<<<< HEAD
  sendBtn.addEventListener("click", onSend);
  joinBtn.addEventListener("click", onJoin);
  leaveBtn.addEventListener("click", onLeave);
  startBtn.addEventListener("click", onStart);
  stopBtn.addEventListener("click", onStop);
  aiBtn.addEventListener("click", onAI);
  localBtn.addEventListener("click", onLocal);
  remoteBtn.addEventListener("click", onRemote);
  window.addEventListener("beforeunload", onLeave, { once: true });
  window.addEventListener("unload", onLeave, { once: true });

  // Cleanup function to remove event listeners when navigating away from the page
  return () => {
    ws.send({ type: "teardown", msg: "Teared down HomeController", userId: userId });
    onLeave();
    ws.close();
    sendBtn.removeEventListener("click", onSend);
    joinBtn.removeEventListener("click", onJoin);
    leaveBtn.removeEventListener("click", onLeave);
    startBtn.removeEventListener("click", onStart);
    stopBtn.removeEventListener("click", onStop);
    aiBtn.removeEventListener("click", onAI);
    localBtn.removeEventListener("click", onLocal);

    window.removeEventListener("beforeunload", onLeave);
    window.removeEventListener("unload", onLeave);
=======
  // sendBtn.addEventListener("click", onSend);
  // joinBtn.addEventListener("click", onJoin);
  // startBtn.addEventListener("click", onStart);
  // stopBtn.addEventListener("click", onStop);
  // resetBtn.addEventListener("click", onReset);
  // aiBtn.addEventListener("click", onAI);
  // localBtn.addEventListener("click", onLocal);
  // remoteBtn.addEventListener("click", onRemote);

  // Cleanup function to remove event listeners when navigating away from the page
  return () => {
    // sendBtn.removeEventListener("click", onSend);
    // joinBtn.removeEventListener("click", onJoin);
    // startBtn.removeEventListener("click", onStart);
    // stopBtn.removeEventListener("click", onStop);
    // resetBtn.removeEventListener("click", onReset);
    // aiBtn.removeEventListener("click", onAI);
    // localBtn.removeEventListener("click", onLocal);
>>>>>>> sessions-JWT-feature
    // remote?.disconnect();
    // game.dispose();
  };
};