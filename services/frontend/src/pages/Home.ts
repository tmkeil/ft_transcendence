import { ws } from "../services/ws.js";
import type { ServerState } from "../interfaces/GameInterfaces.js";
import { GameManager } from "../managers/GameManager.js";
import { Derived } from "@app/shared";
import { Settings } from "../game/GameSettings.js";
import { navigate } from "../router/router.js";

// Function to dynamically update enable/disable 2FA button depending on the current user's settings.
async function update2FAButton(userId: number, enable2faBtn: HTMLButtonElement, qrContainer: HTMLDivElement) {
	const userDetailsRes = await fetch(`https://${location.host}/api/users?id=${userId}`);
	const userDetailsArr = await userDetailsRes.json();
	const userDetails = Array.isArray(userDetailsArr) ? userDetailsArr[0] : null;
	const mfaEnabled = userDetails?.mfa_enabled === 1;

	// Remove previous click listeners
	enable2faBtn.onclick = null;
	const btn = enable2faBtn;

	if (mfaEnabled) {
		btn.textContent = "Disable 2FA";
		btn.classList.remove("bg-teal-400");
		btn.onclick = async () => {
			const code = prompt("Enter your current 2FA code to disable:");
			if (!code) return;
			btn.disabled = true;
			btn.textContent = "Disabling...";
			try {
				const res = await fetch(`https://${location.host}/api/disable-2fa`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ userId, code }),
					credentials: "include"
				});
				if (res.ok) {
					alert("2FA disabled.");
					await update2FAButton(userId, btn, qrContainer);
				} else {
					alert("Invalid code or error disabling 2FA.");
					btn.textContent = "Disable 2FA";
				}
			} finally {
				btn.disabled = false;
			}
		};
	} else {
		btn.textContent = "Enable 2FA";
		btn.classList.add("bg-teal-400");
		btn.onclick = async () => {
			btn.disabled = true;
			btn.textContent = "Loading...";
			qrContainer.innerHTML = "";
			try {
				const res = await fetch(`https://${location.host}/api/2fa-setup?userId=${userId}`);
				if (res.ok) {
					const { qr } = await res.json();
					qrContainer.innerHTML = `<div class="text-white mb-2">
						Scan this QR code with your Authenticator app:
						</div><img src="${qr}" alt="2FA QR" style="max-width:220px;">`;
					await update2FAButton(userId, btn, qrContainer);
				} else {
					qrContainer.innerHTML = `<div class="text-red-400">Failed to load QR code.</div>`;
				}
			} catch {
				qrContainer.innerHTML = `<div class="text-red-400">Error loading QR code.</div>`;
			}
			btn.disabled = false;
			btn.textContent = "Enable 2FA";
		};
	}
}

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

	// Settings modal logic
	const settingsBtn = root.querySelector<HTMLButtonElement>("#settingsBtn");
	const settingsModal = root.querySelector<HTMLDivElement>("#settingsModal");
	const closeSettingsBtn = root.querySelector<HTMLButtonElement>("#closeSettingsBtn");
	const enable2faBtn = root.querySelector<HTMLButtonElement>("#enable2faBtn");
	const qrContainer = root.querySelector<HTMLDivElement>("#qrContainer");
	const logoutBtn = root.querySelector<HTMLButtonElement>("#logoutBtn");
	const deleteAccountBtn = root.querySelector<HTMLButtonElement>("#deleteAccountBtn");
	const deletionForm = root.querySelector<HTMLFormElement>("#deletionForm");
	const deletePasswordInput = root.querySelector<HTMLInputElement>("#deletePassword");
	const confirmDeleteBtn = root.querySelector<HTMLButtonElement>("#confirmDeleteBtn");

	if (settingsBtn && settingsModal && closeSettingsBtn && enable2faBtn && qrContainer && logoutBtn
		&& deleteAccountBtn && deletionForm && deletePasswordInput && confirmDeleteBtn) {

		settingsBtn.addEventListener("click", () => {
			settingsModal.classList.remove("hidden");
			qrContainer.innerHTML = "";
			if (enable2faBtn)
        		update2FAButton(userId, enable2faBtn, qrContainer);
		});

		closeSettingsBtn.addEventListener("click", () => {
			settingsModal.classList.add("hidden");
			qrContainer.innerHTML = "";
		});

		logoutBtn.addEventListener("click", async () => {
			await fetch(`https://${location.host}/api/logout`, { method: "POST" });
			navigate("/login");
		});

		deleteAccountBtn.addEventListener("click", () => {
			deletionForm.classList.remove("hidden");
			deletePasswordInput.value = "";
			deletePasswordInput.focus();
		});

		deletionForm.addEventListener("submit", async (event) => {
			event.preventDefault();
			const password = deletePasswordInput.value.trim();
			if (password) {
				try {
					const res = await fetch(`https://${location.host}/api/delete-account`, {
						method: "POST",
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ userId, password }),
						credentials: "include"
					});
					if (res.ok)
						navigate("/login");
					else {
						deletePasswordInput.value = "";
						deletePasswordInput.placeholder = "Invalid password";
					}
				} catch (err) {
					console.error("Something went wrong");
				}
			} else {
				deletePasswordInput.value = "";
				deletePasswordInput.placeholder = "Please enter your password";
			}
		});

		closeSettingsBtn.addEventListener("click", () => {
			settingsModal.classList.add("hidden");
			qrContainer.innerHTML = "";
			deletionForm.classList.add("hidden");
			deletePasswordInput.value = "";
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
		if (logoutBtn)
			logoutBtn.removeEventListener("click", () => {});
		if (deleteAccountBtn)
			deleteAccountBtn.removeEventListener("click", () => {});
	};
};
