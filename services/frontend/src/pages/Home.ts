import { ws } from "../services/ws.js";
import type { ServerState } from "../interfaces/GameInterfaces.js";
import { GameManager } from "../managers/GameManager.js";
import { Derived } from "@app/shared";
import { Settings } from "../game/GameSettings.js";
import { navigate } from "../router/router.js";

export const HomeController = async (root: HTMLElement) => {

	// Game
	const settings = new Settings();
	const game = new GameManager(settings);

	const userId = (await fetch(`https://${location.host}/api/me`, { method: "GET" }).then(r => r.json())).id;
	if (!userId) {
		console.error("User not authenticated");
	}
	ws.connect(userId);
	game.getInputHandler().bindRemoteSender((dir) => {
		if (game.getInputHandler().isInputRemote() && ws)
		ws.send({ type: "input", direction: dir, userId: userId });
	});

	// When the ws receives the message type state from the server, subscribe these callback/lambda functions to the message type via ws.ts
	ws.on("state", (m: { type: "state"; state: ServerState }) => {
		game.applyServerState(m.state);
	});

	const tournamentBnt = root.querySelector<HTMLButtonElement>(".tournament_play");
	if (tournamentBnt) {
		tournamentBnt.addEventListener('click', () => {
			navigate("/tournament");
		});
	}

	const buttons = root.querySelectorAll<HTMLButtonElement>('.menu button');
	const tooltip = root.querySelector<HTMLDivElement>('.tooltip');
	buttons.forEach(btn => {
		btn.addEventListener('mouseenter', () => {
			if (tooltip)
				tooltip.textContent = btn.getAttribute('data-tooltip') || "";
		});
		btn.addEventListener('mouseleave', () => {
			if (tooltip)
				tooltip.textContent = "";
		});
	});

	const logoutBtn = root.querySelector<HTMLButtonElement>(".logout");
	if (logoutBtn) {
		logoutBtn.addEventListener("click", () => {
			fetch(`https://${location.host}/api/logout`, {
				method: "POST",
				credentials: "include"
			});
			navigate("/login");
		});
	}

	// Settings modal logic
	const settingsBtn = root.querySelector<HTMLButtonElement>("#settingsBtn");
	const settingsModal = root.querySelector<HTMLDivElement>("#settingsModal");
	const closeSettingsBtn = root.querySelector<HTMLButtonElement>("#closeSettingsBtn");
	const enable2faBtn = root.querySelector<HTMLButtonElement>("#enable2faBtn");
	const qrContainer = root.querySelector<HTMLDivElement>("#qrContainer");

	if (settingsBtn && settingsModal && closeSettingsBtn && enable2faBtn && qrContainer) {
			settingsBtn.addEventListener("click", () => {
			settingsModal.classList.remove("hidden");
			qrContainer.innerHTML = "";
		});

		closeSettingsBtn.addEventListener("click", () => {
			settingsModal.classList.add("hidden");
			qrContainer.innerHTML = "";
		});

		enable2faBtn.addEventListener("click", async () => {
			enable2faBtn.disabled = true;
			enable2faBtn.textContent = "Loading...";
			qrContainer.innerHTML = "";
			try {
				const res = await fetch(`https://${location.host}/api/2fa-setup?userId=${userId}`);
				if (res.ok) {
					const { qr } = await res.json();
					qrContainer.innerHTML = `<div class="text-white mb-2">
						Scan this QR code with your Authenticator app:
						</div><img src="${qr}" alt="2FA QR" style="max-width:220px;">`;
				} else {
					qrContainer.innerHTML = `<div class="text-red-400">Failed to load QR code.</div>`;
				}
			} catch {
				qrContainer.innerHTML = `<div class="text-red-400">Error loading QR code.</div>`;
			}
				enable2faBtn.disabled = false;
				enable2faBtn.textContent = "Enable 2FA";
		});
	}

	// Cleanup function to remove event listeners when navigating away from the page
	return () => {
		buttons.forEach(btn => {
			btn.removeEventListener('mouseenter', () => {});
			btn.removeEventListener('mouseleave', () => {});
		});
		if (settingsBtn)
			settingsBtn.removeEventListener("click", () => {});
		if (closeSettingsBtn)
			closeSettingsBtn.removeEventListener("click", () => {});
		if (enable2faBtn)
			enable2faBtn.removeEventListener("click", () => {});
	};
};
