import { GameManager } from "../managers/GameManager.js";
import { Settings } from "../game/GameSettings.js";
import { navigate } from "../router/router.js";

export const LocalController = (root: HTMLElement) => {
  // --- Game setup ---
  const settings = new Settings();
  const game = new GameManager(settings);

  // By default, play against another local player (can be extended to AI button later)
  settings.setOpponent("PERSON");
  game.getInputHandler().setRemote(false);

  // --- DOM elements ---
  const startBtn = root.querySelector<HTMLButtonElement>("#startBtn")!;
  const leaveBtn = root.querySelector<HTMLButtonElement>("#leaveBtn")!;

  // --- Actions ---
  const onStart = () => {
    if (!game.getGameStatus().playing)
      game.getGameStatus().playing = true;
    game.soundManager.playTheme();
  };

  const onLeave = () => {
    if (game.getGameStatus().playing)
      game.stopGame();
    game.soundManager.stopTheme();
    navigate("/");
  };

  // --- Button listeners ---
  startBtn.addEventListener("click", onStart);
  leaveBtn.addEventListener("click", onLeave);

  // --- Cleanup ---
  return () => {
    // Just stop the game.
    // Don't navigate away again because otherwise it would be an infinite loop =>
    // onLeave calls navigate which calls cleanup which calls onLeave...
    if (game.getGameStatus().playing)
      game.stopGame();
    game.soundManager.stopTheme();
    startBtn.removeEventListener("click", onStart);
    leaveBtn.removeEventListener("click", onLeave);
  };
};
