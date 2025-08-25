export class LoginPopup {
	private popup: HTMLDivElement;

	constructor(onLogin: (name: string, password: string) => void) {
		this.popup = document.createElement('div');
		this.popup.className = 'popup';
		this.popup.innerHTML = `
			<h2>Login</h2>
			<input type="text" id="loginName" placeholder="Username" required />
			<input type="password" id="loginPass" placeholder="Password" required />
			<button id="loginBtn">Login</button>
		`;
		document.body.appendChild(this.popup);

		this.popup.querySelector('#loginBtn')?.addEventListener('click', () => {
			const name = (this.popup.querySelector('#loginName') as HTMLInputElement).value;
			const pass = (this.popup.querySelector('#loginPass') as HTMLInputElement).value;
			onLogin(name, pass);
		});
	}

	public show() {
		this.popup.style.display = 'block';
	}

	public hide() {
		this.popup.style.display = 'none';
	}
}
