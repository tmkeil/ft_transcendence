import { GameManager } from "../managers/GameManager.js";
import { Settings } from "../game/GameSettings.js";
import { navigate } from "../router/router.js";

export const AIController = (root: HTMLElement) => {
    // --- Game setup ---
    const settings = new Settings();
    const game = new GameManager(settings);

    // By default, play against another local player (can be extended to AI button later)
    settings.setOpponent("AI");
    settings.setAiDifficulty("MEDIUM");
    game.getInputHandler().setRemote(false);

    // --- DOM elements ---
    const startBtn = root.querySelector<HTMLButtonElement>("#startBtn")!;
    const leaveBtn = root.querySelector<HTMLButtonElement>("#leaveBtn")!;
    const easyBtn = root.querySelector<HTMLButtonElement>("#easyBtn")!;
    const mediumBtn = root.querySelector<HTMLButtonElement>("#mediumBtn")!;
    const hardBtn = root.querySelector<HTMLButtonElement>("#hardBtn")!;
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

    const onEasy = () => {
        if (!game.getGameStatus().playing)
            settings.setAiDifficulty("EASY");
    };
    const onMedium = () => {
        if (!game.getGameStatus().playing)
            settings.setAiDifficulty("MEDIUM");
    };
    const onHard = () => {
        if (!game.getGameStatus().playing)
            settings.setAiDifficulty("HARD");
    };
    // --- Difficulty ---
    easyBtn.addEventListener("click", onEasy);

    mediumBtn.addEventListener("click", onMedium);

    hardBtn.addEventListener("click", onHard);

    // --- Cleanup ---
    return () => {
        // Just stop the game.
        // Don't navigate away again because otherwise it would be an infinite loop =>
        // onLeave calls navigate which calls cleanup which calls onLeave...
        if (game.getGameStatus().playing) {
            game.stopGame();
        }
        game.soundManager.stopTheme();
        startBtn.removeEventListener("click", onStart);
        leaveBtn.removeEventListener("click", onLeave);
        volumeBtn.removeEventListener("click", onVolumeOpen);
        closeVolumeBtn.removeEventListener("click", onVolumeClose);
        musicSlider.removeEventListener("input", onMusicVolumeChange);
        sfxSlider.removeEventListener("input", onSFXVolumeChange);
        easyBtn.removeEventListener("click", onEasy);
        mediumBtn.removeEventListener("click", onMedium);
        hardBtn.removeEventListener("click", onHard);
        //window.removeEventListener("popstate", onBackArrow);
    };
};
