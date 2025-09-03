import { navigate } from "../router/router.js";
type ApiUser = { id: number; username?: string; name?: string };

export class UserManager {
	private currentUser: ApiUser | null = null;

	async register(username: string, email: string, password: string): Promise<boolean> {
		const res = await fetch(`https://${location.host}/api/register`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username, email, password })
		});
		if (!res.ok) return false;
		const user: ApiUser = await res.json();
		this.currentUser = user;
    localStorage.setItem("userId", String(user.id));
    localStorage.setItem("userName", user.username ?? user.name ?? username);
		return true;
	}

	async login(username: string, password: string): Promise<boolean> {
		const res = await fetch(`https://${location.host}/api/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username, password })
		});
		if (!res.ok) return false;
		const user: ApiUser = await res.json();
		this.currentUser = user;
    localStorage.setItem("userId", String(user.id));
    localStorage.setItem("userName", user.username ?? user.name ?? username);
		return true;
	}

	getUser() {
		return this.currentUser;
	}

	logout() {
		this.currentUser = null;
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
	}
}


class Login { // This class handles the whole user login and registration process

  private isLogin = true;

	constructor(private root: HTMLElement, private userManager: UserManager) { // Constructor takes the UserManager as a parameter

	}

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
        let success = false;
        if (this.isLogin) {
          success = await this.userManager.login(username, password);
        } else {
          success = await this.userManager.register(username, `${username}@gmail.com`, password);
        }

        if (success) {
          accountModal.style.display = 'none';
          alert('Login successful!');
          navigate("/");
        } else {
          modalError.textContent = this.isLogin ?
          'Login failed. Please check your credentials.' :
          'Registration failed. Username may already be taken.';
        }

      } catch (error) {
        console.error(error);
        modalError.textContent = 'Registration failed. Username may already be taken.';
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
