import { navigate } from "../router/router.js";
type ApiUser = { id: number; username?: string; email?: string };

export class UserManager {
	private currentUser: ApiUser | null = null;

	async register(username: string, email: string, password: string): Promise<{ id: number, username: string, email: string } | null> {
		const res = await fetch(`https://${location.host}/api/register`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username, email, password }),
			credentials: "include"
		});
		if (!res.ok) return null;
		const data = await res.json();
		return data;
	}

	async login(username: string, password: string): Promise<{ tempTok: string, mfa: boolean } | null> {
		const res = await fetch(`https://${location.host}/api/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username, password }),
			credentials: "include"
		});
		if (!res.ok) return null;
		const data  = await res.json();
		if (!data.mfa_required) {
			this.currentUser = data.user;
			return { tempTok: "", mfa: false }; // No 2FA
		}
		return { tempTok: data.tempToken, mfa: true }; // Yes 2FA
	}

	async verify2FA(code: string, tempToken: string): Promise<boolean> {
		const res = await fetch(`https://${location.host}/api/verify-2fa`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ code, tempToken }),
			credentials: "include"
		});
		if (!res.ok) return false;
		const data = await res.json();
		this.currentUser = data.user;
		return true;
	}

	async loadUser(): Promise<ApiUser | null> {
		const res = await fetch(`https://${location.host}/api/me`, {
			credentials: "include"
		});
		if (!res.ok) {
			this.currentUser = null;
			return null;
		}
		const user = await res.json();
		this.currentUser = user;
		return user;
	}

	getUser() {
		return this.currentUser;
	}

	async logout() {
		await fetch(`https://${location.host}/api/logout`, {
			method: "POST",
			credentials: "include"
		});
		this.currentUser = null;
	}
}

class Login {
	constructor(private root: HTMLElement, private userManager: UserManager) {}

	init() {
		const loginForm = this.root.querySelector('#loginForm') as HTMLFormElement;
		const loginError = this.root.querySelector('#loginError') as HTMLParagraphElement;

		const registerForm = this.root.querySelector('#registerForm') as HTMLFormElement;
		const registerError = this.root.querySelector('#registerError') as HTMLParagraphElement;

		const buttons = this.root.querySelectorAll('.menu button');
		const tooltip = this.root.querySelector('.tooltip') as HTMLDivElement;

		buttons.forEach(btn => {
		   btn.addEventListener('mouseenter', () => {
			  tooltip.textContent = btn.getAttribute('data-tooltip') || "";
		   });
		   btn.addEventListener('mouseleave', () => {
			  tooltip.textContent = "";
		   });
		});


		// Login flow
		loginForm.addEventListener('submit', async (event) => {
			event.preventDefault();
			const username = (this.root.querySelector('#loginUsername') as HTMLInputElement).value.trim();
			const password = (this.root.querySelector('#loginPassword') as HTMLInputElement).value.trim();

			if (!username || !password) {
				loginError.textContent = 'Username and password are required.';
				return;
			}

			try {
				const result = await this.userManager.login(username, password);
				if (!result) {
					loginError.textContent = 'Invalid username or password.';
					return;
				}
				
				if (!result.mfa)
					navigate("/"); // Just log them in and take them to home page.
				else // If 2FA step is required, continue with it
				{
					const code = prompt("Enter your 2FA code:");
					if (!code) {
						loginError.textContent = "2FA code required.";
						return;
					}
					const ok = await this.userManager.verify2FA(code, result.tempTok);
					if (ok)
						navigate("/");
					else
						loginError.textContent = "Invalid 2FA code.";
				}
			} catch (err) {
				console.error(err);
				loginError.textContent = "Something went wrong.";
			}
		});

		// Register flow
		registerForm.addEventListener('submit', async (event) => {
			event.preventDefault();
			const username = (this.root.querySelector('#registerUsername') as HTMLInputElement).value.trim();
			const email = (this.root.querySelector('#registerEmail') as HTMLInputElement).value.trim();
			const password = (this.root.querySelector('#registerPassword') as HTMLInputElement).value.trim();

			if (!username || !email || !password) {
				registerError.textContent = "All fields are required.";
				return;
			}

			try {
				const result = await this.userManager.register(username, email, password);
				if (result) {
					registerError.textContent = "";
					alert(`Succesfully registered new user: ${result.username}#${result.id}`);
				} else {
					registerError.textContent = "Registration failed. Username or email may already exist.";
				}
			} catch (err) {
				console.error(err);
				registerError.textContent = "Something went wrong.";
			}
		});
	}
}

export const mountLogin = (root: HTMLElement) => {
	const userManager = new UserManager();
	new Login(root, userManager).init();
	return () => {
		userManager.logout();
	};
}
