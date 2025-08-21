/*
/// <reference types="babylonjs" />
*/

import { GameManager } from './managers/index.js';
import { InputHandler } from './managers/index.js';
import { RemotePlayerManager } from './managers/index.js';

class Chat {
    private form;
    private nameInput;
    private chatBox;
    private log;
    private input;
    private sendBtn;

	constructor() {
		console.log("init chat");
		// User management elements
		this.form = document.getElementById('addUserForm') as HTMLFormElement;
		this.nameInput = document.getElementById('userName') as HTMLInputElement;

		// Chat elements
		this.chatBox = document.getElementById('chat') as HTMLDivElement;
		this.log = document.getElementById('log') as HTMLTextAreaElement;
		this.input = document.getElementById('msg') as HTMLInputElement;
		this.sendBtn = document.getElementById('send') as HTMLButtonElement;
	}

	public get_username(): string {
		return this.nameInput ? this.nameInput.value.trim() : '';
	}

	public clear_name_input(): void {
		if (this.nameInput) {
			this.nameInput.value = '';
		}
	}

	public show_chatbox(): void {
		if (this.chatBox) {
			this.chatBox.style.display = 'block';
		}
	}

	public append_log(line: string): void {
		if (this.log) {
			this.log.value += line + '\n';
			this.log.scrollTop = this.log.scrollHeight;
		}
	}

	public get_form(): HTMLFormElement {
		return this.form;
	}

	public send_handler(handler: (message: string) => void): void {
		// Add event listeners to the send button and input field to fire the lambda function when the user clicks the send btn.
		this.sendBtn.addEventListener('click', () => {
			console.log("Send button clicked");
			const message = this.input.value.trim();
			if (message) {
				handler(message);
				this.input.value = '';
			}
		}
		);
		this.input.addEventListener('keypress', (e) => {
			if (e.key === 'Enter') {
				console.log("Enter key pressed in input");
				const message = this.input.value.trim();
				if (message) {
					handler(message);
					this.input.value = '';
				}
			}
		}
		);
	}
}

export class App {
	private Chat: Chat;
	private gameManager: GameManager;
	private playerManager?: RemotePlayerManager;

	constructor() {
		// For the UI and chat management and for subscribing to events on the chat (like in Angular)
		this.Chat = new Chat();
		// For the game logic and management
		this.gameManager = new GameManager();
		// Initialize the user, when submitting the form
		this.init_registration();
		// Welcome the user
		console.log('Welcome to the game!');
	}

	private async init_registration(): Promise<void> {
		const form = this.Chat.get_form();
		// Add an event listener to the form to handle user registration when the form is submitted
		form.addEventListener('submit', async (e) => {
			e.preventDefault();
			console.log('User registration form submitted');
			await this.register_user();
		});
	}

	private async register_user(): Promise<void> {
		try {
			// Get the username from the input field
			const name = this.Chat.get_username();
			if (!name) return;

			// Send a POST request to the server to register the user
			const res = await fetch('http:localhost:3000/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name })
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const user = await res.json();

			if (user)
			{
				this.setupChatHandlers(user);
				this.Chat.append_log(`Registered as "${user.name}" (id=${user.id})`);
			}
			this.Chat.clear_name_input();
		}
		catch (err) {
			this.Chat.append_log('Registration failed.');
			console.error(err);
			return;
		}
	}

	private setupChatHandlers(user: { id: number, name: string }): void {
		// Initialize the RemotePlayerManager with the user ID
		this.playerManager = new RemotePlayerManager(user.id);
		// Show the chatbox for a registered user
		this.Chat.show_chatbox();

		// Bind this (append_log) to the user's/subscriber's callback to get fire when a message arrives from the server
		this.playerManager.addCallback((msg: string) => {
			this.Chat.append_log(msg);
		});

		// Set up send handler and bind eventlistener to the send button and input field
		// Fire the lambda function when the user clicks the send button or presses Enter in the input field
		this.Chat.send_handler((msg: string) => {
			console.log(`Sending message: ${msg}`);
			this.playerManager?.send(msg);
			this.Chat.append_log(`Me: ${msg}`);
		})
	}
}

document.addEventListener('DOMContentLoaded', () => {
	new App();
});
