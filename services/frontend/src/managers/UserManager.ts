export class UserManager {
	private currentUser: { id: number, username: string } | null = null;

	public async register(username: string, password: string): Promise<boolean> {
		const res = await fetch(`http://${location.host}:3000/api/register`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username, password })
		});
		if (!res.ok) return false;
		const user = await res.json();
		this.currentUser = user;
		return true;
	}

	public async login(username: string, password: string): Promise<boolean> {
		const res = await fetch(`http://${location.host}:3000/api/login`, {
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
