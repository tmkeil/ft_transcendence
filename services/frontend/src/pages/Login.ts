// import { navigate } from "../router/router.js";

// // This function is called, when the navigator goes to /login. It sets up the login page and its event listeners.
// export function mountLogin(root: HTMLElement): () => void {
//   // Elements from the DOM
//   const form = root.querySelector("#loginForm") as HTMLFormElement | null;
//   const input = root.querySelector("#userName") as HTMLInputElement | null;
//   const err = root.querySelector("#loginError") as HTMLElement | null;

//   // Handle form submission to create a new user
//   form?.addEventListener("submit", async (e) => {
//     // Avoid page refresh
//     e.preventDefault();
//     const name = input?.value.trim();
//     if (!name)
//       return;
//     // Send a POST request to create a new user
//     const res = await fetch("http://localhost:3000/users", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ name })
//     });
//     if (!res.ok) {
//       return;
//     }
//     const user = await res.json();
//     // Store user ID and name in local storage for session management
//     localStorage.setItem("userId", String(user.id));
//     localStorage.setItem("userName", user.name);
//     // Redirect to the home page after successful login
//     navigate("/");
//   });

//   // Cleanup function to remove event listener when navigating away from the page
//   return () => {
//     form?.removeEventListener("submit", () => {});
//   };
// }

class Login { // This class handles the whole user login and registration process
	private accountButton;
	private accountModal;
	private closeModal;
	private modalTitle;
	private accountForm;
	private loginBtn;
	private switchToRegister;
	private modalError;
	private isLogin: boolean = true;

	constructor(private userManager: UserManager) { // Constructor takes the UserManager as a parameter
		console.log("init login");
		this.accountButton = document.getElementById('accountButton') as HTMLButtonElement;
		this.accountModal = document.getElementById('accountModal') as HTMLDivElement;
		this.closeModal = document.getElementById('closeModal') as HTMLButtonElement;
		this.modalTitle = document.getElementById('modalTitle') as HTMLHeadingElement;
		this.accountForm = document.getElementById('accountForm') as HTMLFormElement;
		this.loginBtn = document.getElementById('loginBtn') as HTMLButtonElement;
		this.switchToRegister = document.getElementById('switchToRegister') as HTMLButtonElement;
		this.modalError = document.getElementById('modalError') as HTMLDivElement;
	}

	public init_registration(): void { // Initialize event listeners for the login/register modal
		this.accountButton.addEventListener('click', this.onAccountButtonClick.bind(this));
		this.closeModal.addEventListener('click', this.onCloseModalClick.bind(this));
		this.switchToRegister.addEventListener('click', this.onSwitchToRegisterClick.bind(this));
		this.accountForm.addEventListener('submit', this.onAccountFormSubmit.bind(this));
	}

	private onAccountButtonClick(): void {
		this.accountModal.style.display = 'block';
		this.modalTitle.textContent = 'Login';
		this.loginBtn.textContent = 'Login';
		this.isLogin = true;
		this.modalError.textContent = '';
	}

	private onCloseModalClick(): void {
		this.accountModal.style.display = 'none';
	}

	private onSwitchToRegisterClick(): void {
		this.isLogin = !this.isLogin;
		if (this.isLogin) {
			this.modalTitle.textContent = 'Login';
			this.loginBtn.textContent = 'Login';
		} else {
			this.modalTitle.textContent = 'Register';
			this.loginBtn.textContent = 'Register';
		}
		this.modalError.textContent = '';
	}

	private async onAccountFormSubmit(event: Event): Promise<void> {
		event.preventDefault();
		const usernameInput = document.getElementById('modalUsername') as HTMLInputElement;
		const passwordInput = document.getElementById('modalPassword') as HTMLInputElement;
		const username = usernameInput.value.trim();
		const password = passwordInput.value.trim();
		if (!username || !password) {
			this.modalError.textContent = 'Username and password are required.';
			return;
		}
		if (this.isLogin) { // Call the login method from UserManager
			const success = await this.userManager.login(username, password);
			if (success) {
				this.accountModal.style.display = 'none';
				alert('Login successful!');
				// From this point we might have a user session used in the chat and game
			} else {
				this.modalError.textContent = 'Login failed. Please check your credentials.';
			}
		} else { // Call the register method from UserManager
			const success = await this.userManager.register(username, 'epicgamer@gmail.com', password);
			if (success) {
				this.accountModal.style.display = 'none';
				alert('Registration successful!');
				// This calls eventually reaches the backend and creates a new user in the database
				// (I hardcoded the email field for now bcs there is no UI for it yet)
			} else {
				this.modalError.textContent = 'Registration failed. Username may already be taken.';
			}
		}
	}
}

export class UserManager {
	private currentUser: { id: number, username: string } | null = null;

	public async register(username: string, email: string, password: string): Promise<boolean> {
		const res = await fetch(`https://${location.host}/api/register`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username, email, password })
		});
		if (!res.ok) return false;
		const user = await res.json();
		this.currentUser = user;
		return true;
	}

	public async login(username: string, password: string): Promise<boolean> {
		const res = await fetch(`https://${location.host}/api/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username, password })
		});
		if (!res.ok) return false;
		const user = await res.json();
		this.currentUser = user;
		return true;
	}

	public getUser() {
		return this.currentUser;
	}

	public logout() {
		this.currentUser = null;
	}
}
