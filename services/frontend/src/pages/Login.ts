import { navigate } from "../router/router.js";
type ApiUser = { id: number; username?: string; name?: string }; // name??? is it used?

export class UserManager {
	private currentUser: ApiUser | null = null;
	private accessToken: string | null = null;

	async register(username: string, email: string, password: string): Promise<boolean> {
		const res = await fetch(`https://${location.host}/api/register`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username, email, password }),
			credentials: "include"
		});
		if (!res.ok) return false;
		const data = await res.json();
		this.accessToken = data.accessToken ?? null;
		this.currentUser = data.user;
		localStorage.setItem("userId", String(data.user.id));
		localStorage.setItem("userName", data.user.username ?? data.user.name ?? username);
		return true;
	}

	async login(username: string, password: string): Promise<boolean> {
		const res = await fetch(`https://${location.host}/api/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username, password }),
			credentials: "include"
		});
		if (!res.ok) return false;

		const data  = await res.json();
		if (!data.mfa_required || !data.tempToken) return false;
		sessionStorage.setItem("temp_token", data.tempToken);
		return true;
	}

	async verify2FA(code: string): Promise<boolean> {
		const tempToken = sessionStorage.getItem("temp_token");
		if (!tempToken) return false;

		const res = await fetch(`https://${location.host}/api/verify-2fa`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ code, tempToken }),
			credentials: "include"
		});
		if (!res.ok) return false;

		const data = await res.json();
		this.accessToken = data.accessToken;
		this.currentUser = data.user;
		localStorage.setItem("userId", String(data.userID));
		localStorage.setItem("userName", data.username ?? data.user.name ?? "");
		sessionStorage.removeItem("temp_token");
		return true;
	}

	getUser() {
		return this.currentUser;
	}

	getAccessToken() {
		return this.accessToken;
	}

	logout() {
		this.currentUser = null;
		this.accessToken = null;
		localStorage.removeItem("userId");
		localStorage.removeItem("userName");
		fetch(`https://${location.host}/api/logout`, {
			method: "POST",
			credentials: "include"
		});
	}
}


class Login { // This class handles the whole user login and registration process

	private isLogin = true;

	constructor(private root: HTMLElement, private userManager: UserManager) {}
	// Constructor takes the UserManager as a parameter

	init() {
		console.log("init login");
		const accountButton = this.root.querySelector('#accountButton') as HTMLButtonElement;
		const accountModal = this.root.querySelector('#accountModal') as HTMLDivElement;
		const closeModal = this.root.querySelector('#closeModal') as HTMLButtonElement;
		const modalTitle = this.root.querySelector('#modalTitle') as HTMLHeadingElement;
		const accountForm = this.root.querySelector('#accountForm') as HTMLFormElement;
		const loginBtn = this.root.querySelector('#loginBtn') as HTMLButtonElement;
		const switchToRegister = this.root.querySelector('#switchToRegister') as HTMLButtonElement;
		const modalError = this.root.querySelector('#modalError') as HTMLDivElement;

		const setMode = (login: boolean) => {
			this.isLogin = login;
			modalTitle.textContent = login ? 'Login' : 'Register';
			loginBtn.textContent = login ? 'Login' : 'Register';
			modalError.textContent = '';
		};


		accountButton.addEventListener('click', () => {
			accountModal.style.display = 'block';
			setMode(true);
		});

		closeModal.addEventListener('click', () => {
			accountModal.style.display = 'none';
		});

		switchToRegister.addEventListener('click', () => {
			setMode(!this.isLogin);
		});

		accountForm.addEventListener('submit', async (event) => {
			event.preventDefault();
			const usernamel = this.root.querySelector('#modalUsername') as HTMLInputElement;
			const passwordl = this.root.querySelector('#modalPassword') as HTMLInputElement;

			const username = usernamel.value.trim();
			const password = passwordl.value.trim();
			if (!username || !password) {
				modalError.textContent = 'Username and password are required.';
				return;
			}
			try {
				const step1 = await this.userManager.login(username, password);
				if (!step1) {
					modalError.textContent = "Invalid username or password.";
					return;
				}

				// Prompt for 2FA code every time
				const code = prompt("Enter your 2FA code:");
				if (code && await this.userManager.verify2FA(code)) {
					accountModal.style.display = "none";
					alert("Login successful (with 2FA)!");
					navigate("/");
				} else {
					modalError.textContent = "Invalid 2FA code.";
				}
			} catch (err) {
				console.error(err);
				modalError.textContent = "Something went wrong.";
			}
		});
	}
}

export function mountLogin(root: HTMLElement): () => void {
	const userManager = new UserManager();
	new Login(root, userManager).init();
	return () => {
		userManager.logout();
	};
}
