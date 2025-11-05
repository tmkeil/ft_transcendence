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
    const volumeBtn = root.querySelector<HTMLButtonElement>("#volumeBtn")!;
    const volumeModal = root.querySelector<HTMLDivElement>("#volumeModal")!;
    const closeVolumeBtn = root.querySelector<HTMLButtonElement>("#closeVolumeBtn")!;
    const musicSlider = root.querySelector<HTMLInputElement>("#musicVolume")!;
    const sfxSlider = root.querySelector<HTMLInputElement>("#sfxVolume")!;

    // --- Volume control actions ---
    const onVolumeOpen = () => {
        volumeModal.classList.remove("hidden");
    };

    const onVolumeClose = () => {
        volumeModal.classList.add("hidden");
    };

    const onMusicVolumeChange = (e: Event) => {
        const value = parseInt((e.target as HTMLInputElement).value) / 100;
        game.soundManager.setMusicVolume(value);
    };

    const onSFXVolumeChange = (e: Event) => {
        const value = parseInt((e.target as HTMLInputElement).value) / 100;
        game.soundManager.setSFXVolume(value);
    };

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

    const onBackArrow = () => {
        if (game.getGameStatus().playing)
            game.stopGame();
        game.soundManager.stopTheme();
    };

    // --- Button listeners ---
    startBtn.addEventListener("click", onStart);
    leaveBtn.addEventListener("click", onLeave);
    volumeBtn.addEventListener("click", onVolumeOpen);
    closeVolumeBtn.addEventListener("click", onVolumeClose);
    musicSlider.addEventListener("input", onMusicVolumeChange);
    sfxSlider.addEventListener("input", onSFXVolumeChange);
    window.addEventListener("popstate", onBackArrow);

    // Close modal when clicking outside
    volumeModal.addEventListener("click", (e) => {
        if (e.target === volumeModal) {
            onVolumeClose();
        }
    });

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
        volumeBtn.removeEventListener("click", onVolumeOpen);
        closeVolumeBtn.removeEventListener("click", onVolumeClose);
        musicSlider.removeEventListener("input", onMusicVolumeChange);
        sfxSlider.removeEventListener("input", onSFXVolumeChange);
        //window.removeEventListener("popstate", onBackArrow);
    };
};
