export class RegistrationPopup {
	private popup: HTMLDivElement;

	constructor(onRegister: (name: string, password: string) => void) {
		this.popup = document.createElement('div');
		this.popup.className = 'popup';
		this.popup.innerHTML = `
			<h2>Register</h2>
			<input type="text" id="regName" placeholder="Username" required />
			<input type="password" id="regPass" placeholder="Password" required />
			<button id="regBtn">Register</button>
		`;
		document.body.appendChild(this.popup);

		this.popup.querySelector('#regBtn')?.addEventListener('click', () => {
			const name = (this.popup.querySelector('#regName') as HTMLInputElement).value;
			const pass = (this.popup.querySelector('#regPass') as HTMLInputElement).value;
			onRegister(name, pass);
		});
	}

	public show() {
		this.popup.style.display = 'block';
	}

	public hide() {
		this.popup.style.display = 'none';
	}
}
