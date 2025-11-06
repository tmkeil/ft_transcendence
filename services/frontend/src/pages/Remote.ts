// Remote.ts
import { ws } from "../services/ws.js";
import type { ServerState } from "../interfaces/GameInterfaces.js";
import { GameManager } from "../managers/GameManager.js";
import { Derived } from "@app/shared";
import { Settings } from "../game/GameSettings.js";
import { navigate } from "../router/router.js";

let localSide: "left" | "right" | null = null;

interface PlayerProfile {
    id: number;
    username: string;
    level: number;
    wins: number;
    losses: number;
}

function calculateWinRate(wins: number, losses: number): string {
    const total = wins + losses;
    return total > 0 ? Math.round((wins / total) * 100) + '%' : '0%';
}

async function updatePlayerProfile(side: 'left' | 'right', userId: number) {
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) return;
    
    const user = await response.json();
    
    const elements = {
        avatar: document.getElementById(`${side}-player-avatar`) as HTMLImageElement,
        name: document.getElementById(`${side}-player-name`) as HTMLDivElement,
        level: document.getElementById(`${side}-player-level`) as HTMLDivElement,
        wins: document.getElementById(`${side}-player-wins`) as HTMLElement,
        losses: document.getElementById(`${side}-player-losses`) as HTMLElement,
        winrate: document.getElementById(`${side}-player-winrate`) as HTMLElement
    };

    elements.avatar.src = `/api/users/${userId}/pfp`;
    elements.name.textContent = user.username;
    elements.level.textContent = `Level ${user.level}`;
    elements.wins.textContent = user.wins;
    elements.losses.textContent = user.losses;
    elements.winrate.textContent = calculateWinRate(user.wins, user.losses);
}

function determineLocalSide(status: any, localUserId: number): "left" | "right" | null {
    if (localSide === 'left' || localSide === 'right') return localSide;
    if (status?.mySide === 'left' || status?.mySide === 'right') return status.mySide;
    if (status?.side === 'left' || status?.side === 'right') return status.side;

    if (status?.leftPlayerId && status?.rightPlayerId) {
        if (status.leftPlayerId === localUserId) return 'left';
        if (status.rightPlayerId === localUserId) return 'right';
    }
    // p1 / p2 nested objects
    if (status?.p1?.id || status?.p2?.id) {
        if (status.p1?.id === localUserId) return 'left';
        if (status.p2?.id === localUserId) return 'right';
    }
    // players array (index 0 = left, index 1 = right) — adjust if your backend uses a different order
    if (Array.isArray(status?.players) && status.players.length >= 2) {
        if (status.players[0]?.id === localUserId) return 'left';
        if (status.players[1]?.id === localUserId) return 'right';
    }
    return null;
}

export const RemoteController = (root: HTMLElement) => {

    // --- DOM elements from Remote.html ---
    const joinBtn = root.querySelector<HTMLButtonElement>("#joinBtn")!;
    const leaveBtn = root.querySelector<HTMLButtonElement>("#leaveBtn")!;
    const startBtn = root.querySelector<HTMLButtonElement>("#startBtn")!;
    const volumeBtn = root.querySelector<HTMLButtonElement>("#volumeBtn")!;
    const volumeModal = root.querySelector<HTMLDivElement>("#volumeModal")!;
    const closeVolumeBtn = root.querySelector<HTMLButtonElement>("#closeVolumeBtn")!;
    const musicSlider = root.querySelector<HTMLInputElement>("#musicVolume")!;
    const sfxSlider = root.querySelector<HTMLInputElement>("#sfxVolume")!;
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
    const onState = (m: { type: "state"; state: ServerState }) => {
        game.applyServerState(m.state);
    };

    const onJoinRoom = (m: {
        type: "join"; roomId: string; roomName: string; side: string; gameConfig: Derived; state: ServerState
    }) => {
        console.log("Joined room:", m.roomId, "as", m.side);
        game.setConfig(m.gameConfig);
        game.applyServerState(m.state);
        tournamentStatus.textContent = `Joined ${m.roomName} as ${m.side === "left" ? "P1 (left)" : "P2 (right)"}`;
        if (m.side === 'left' || m.side === 'right') {
            localSide = m.side;
            updatePlayerProfile(m.side, userId);
        }
    };

    const onReset = () => {
        game.resetServerState();
        game.stopGame();
        tournamentStatus.textContent = "Game reset.";
        game.soundManager.stopTheme();
    };

    const onGameStart = (m: { type: "start"; timestamp: number }) => {
        game.setTimestamp(m.timestamp);
        tournamentStatus.textContent = "Game started!";
        game.soundManager.playTheme();
    };

    ws.on("playerJoined", (m: { side: 'left' | 'right', userId: number }) => {
        updatePlayerProfile(m.side, m.userId);
    });
    ws.on("playerLeft", (m: { side: 'left' | 'right' }) => {
        const elements = {
            avatar: document.getElementById(`${m.side}-player-avatar`) as HTMLImageElement,
            name: document.getElementById(`${m.side}-player-name`) as HTMLDivElement,
            level: document.getElementById(`${m.side}-player-level`) as HTMLDivElement,
            wins: document.getElementById(`${m.side}-player-wins`) as HTMLElement,
            losses: document.getElementById(`${m.side}-player-losses`) as HTMLElement,
            winrate: document.getElementById(`${m.side}-player-winrate`) as HTMLElement
        };

        elements.avatar.src = '/api/public/user_pfps/default.png';
        elements.name.textContent = 'Waiting...';
        elements.level.textContent = 'Level 0';
        elements.wins.textContent = '0';
        elements.losses.textContent = '0';
        elements.winrate.textContent = '0%';
    });
    ws.on("state", onState);
    ws.on("join", onJoinRoom);
    ws.on("reset", onReset);
    ws.on("start", onGameStart);

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

    // --- Outgoing actions ---
    const onJoin = () => {
        const roomId = roomInput.value.trim();
        ws.send({ type: "join", userId, roomId: roomId || undefined });
    };

    const onLeave = () => {
        try {
            ws.send({ type: "leave", userId });
            tournamentStatus.textContent = "Left room.";
            ws.close();
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

    let prevPlaying = !!game.getGameStatus().playing;
    let matchHandled = false;
    let endWatcher = window.setInterval(() => {
        const status: any = game.getGameStatus();
        const playing = !!status.playing;
        const reachedScoreLimit = (status.scoreL >= 5 || status.scoreR >= 5);

        if (playing) matchHandled = false;

        if (!matchHandled && prevPlaying && (!playing || reachedScoreLimit)) {
            matchHandled = true;
            const winnerSide = (status.scoreL ?? 0) > (status.scoreR ?? 0) ? 'left' : 'right';
            const localSide = determineLocalSide(status, userId);
            const youWon = localSide && localSide === winnerSide;
            if (youWon) {
                game.soundManager.play("player_win");
                alert("You won!");
                clearInterval(endWatcher);
            } else {
                game.soundManager.play("player_loss");
                alert("You lost.");
                clearInterval(endWatcher);
            }
        }
        prevPlaying = playing;
    }, 250);

    // --- Event listeners ---
    joinBtn.addEventListener("click", onJoin);
    leaveBtn.addEventListener("click", onHome);
    startBtn.addEventListener("click", onStart);
    volumeBtn.addEventListener("click", onVolumeOpen);
    closeVolumeBtn.addEventListener("click", onVolumeClose);
    musicSlider.addEventListener("input", onMusicVolumeChange);
    sfxSlider.addEventListener("input", onSFXVolumeChange);
    window.addEventListener("beforeunload", onLeave, { once: true });
    window.addEventListener("unload", onLeave, { once: true });

    // Close modal when clicking outside
    volumeModal.addEventListener("click", (e) => {
        if (e.target === volumeModal) {
            onVolumeClose();
        }
    });

    // --- Cleanup ---
    return () => {
        onLeave();
        clearInterval(endWatcher);

        // Remove all WebSocket event listeners
        ws.off("state", onState);
        ws.off("join", onJoinRoom);
        ws.off("reset", onReset);
        ws.off("start", onGameStart);

        // Force cleanup GameManager BEFORE closing WebSocket
        game.forceCleanup();

        // ws.close();

        joinBtn.removeEventListener("click", onJoin);
        leaveBtn.removeEventListener("click", onHome);
        startBtn.removeEventListener("click", onStart);
        volumeBtn.removeEventListener("click", onVolumeOpen);
        closeVolumeBtn.removeEventListener("click", onVolumeClose);
        musicSlider.removeEventListener("input", onMusicVolumeChange);
        sfxSlider.removeEventListener("input", onSFXVolumeChange);
        window.removeEventListener("beforeunload", onLeave);
        window.removeEventListener("unload", onLeave);
    };
};
