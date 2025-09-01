/*
/// <reference types="babylonjs" />
*/

import { GameManager } from './managers/index.js';
import { InputHandler } from './managers/index.js';
import { RemotePlayerManager } from './managers/index.js';
import { GameSettings, ServerState } from './interfaces/GameInterfaces';
import { WorldConfig, Derived, buildWorld } from '@app/shared';
import { Settings } from './game/GameSettings.js';

// <!DOCTYPE html>
// <html lang="en">

// <head>
// 	<meta charset="UTF-8" />
// 	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
// 	<title>Transcendence Pong</title>
// 	<link rel="stylesheet" href="styles.css" />
// </head>

// <body>
// 	<h1>Transcendence Pong</h1>
// 	<canvas id="gameCanvas"></canvas>
// 	<!-- Game Control Buttons. StartBtn to start the chosen game mode, StopBtn to stop the game, and ResetBtn to reset the game -->
// 	<div id="gameControls">
// 		<button id="startBtn">Start Game</button>
// 		<button id="stopBtn">Stop Game</button>
// 		<button id="resetBtn">Reset Game</button>
// 	</div>
// 	<!-- Choose the Opponent by clicking on a button. Choose between AI and Local Player -->
// 	<div id="opponentSelection">
// 		<button id="aiOpponentButton">Play vs AI</button>
// 		<button id="localOpponentButton">Play vs Local Player</button>
// 		<button id="remoteOpponentButton">Play vs Remote Player</button>
// 	</div>
// 	<!-- In case the user wants to play remotely, there is an input field for the room name he wants to join -->
// 	<div id="roomSelection">
// 		<input type="text" id="roomName" placeholder="Enter room name" />
// 		<button id="joinRoomButton">Join Room</button>
// 	</div>

// 	<h2>User Management</h2>
// 	<form id="addUserForm">
// 		<input type="text" id="userName" placeholder="Enter name" required />
// 		<button type="submit">Register</button>
// 	</form>

// 	<div id="chat">
// 		<textarea id="log" cols="50" rows="10" readonly></textarea><br />
// 		<input id="msg" type="text" placeholder="Type a message..." />
// 		<button id="send">Send</button>
// 	</div>
// 	<script src="https://cdn.babylonjs.com/babylon.js"></script>
// 	<script type="module" src="/db_web_api.js"></script>
// 	<script type="module" src="src/main.ts"></script>
// </body>

// </html>

// export class Settings {

// 	private static settings: GameSettings = {
// 		ai_difficulty:	'HARD',
// 		opponent:		'REMOTE'
// 	};

// 	public static setAiDifficulty(difficulty: 'EASY' | 'MEDIUM' | 'HARD') {
// 		this.settings.ai_difficulty = difficulty;
// 	}
	
// 	public static get getAiDifficulty() {
// 		return (this.settings.ai_difficulty);
// 	}

// 	public static setOpponent(opponent: 'PERSON' | 'REMOTE' | 'AI') {
// 		this.settings.opponent = opponent;
// 	}
	
// 	public static get getOpponent() {
// 		return (this.settings.opponent);
// 	}
// }

class Chat {
	// User registration elements
    private form;
    private nameInput;

	// Chat elements
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
	// private startBtn = document.getElementById("startBtn") as HTMLButtonElement;

	constructor() {
		// For the UI and chat management and for subscribing to events on the chat (like in Angular)
		this.Chat = new Chat();
		// Initialize the user, when submitting the form
		this.init_registration();
		// After registering a user the game manager will be initialized for setting up the game
		this.gameManager = new GameManager();
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
			const res = await fetch('http://localhost:3000/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name })
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const user = await res.json();

			if (user)
			{
				this.Chat.show_chatbox();
				this.setupRemoteEvents(user);
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

	private setupRemoteEvents(user: { id: number, name: string }): void {
		// Initialize the RemotePlayerManager with the user ID
		this.playerManager = new RemotePlayerManager(user.id);
		// Bind this (append_log) to the user's/subscriber's callback to get fire when a message arrives from the server
		// this.playerManager.addCallback((msg: string) => {
		// 	this.Chat.append_log(msg);
		// });
		this.playerManager.onChat((msg: { userId: number, content: string }) => {
			this.Chat.append_log(`${user.name}: ${msg.content}`);
		});

		// Bind applyServerState to the RemotePlayerManager to update the game state when a state message arrives from the server
		this.playerManager.onState((state) => {
			this.gameManager.applyServerState(state);
		});

		// Bind the game config and state to the game manager
		this.playerManager.onJoin((msg: { side: string; gameConfig: Derived; state: ServerState }) => {
			this.gameManager.setConfig(msg.gameConfig);
			this.gameManager.applyServerState(msg.state);
			this.Chat.append_log(`Joined the game as Player ${msg.side === "left" ? '1 (left)' : '2 (right)'}!`);
		});

		this.playerManager.onStart((timestamp: Number) => {
			this.gameManager.setTimestamp(timestamp);
			this.Chat.append_log('Game started!');
		});

		// Set up send handler and bind eventlistener to the send button and input field
		// Fire the lambda function when the user clicks the send button or presses Enter in the input field
		this.Chat.send_handler((msg: string) => {
			console.log("Sending chat message");
			this.playerManager?.sendChatMessage(msg);
			this.Chat.append_log(`Me: ${msg}`);
		});

		// Bind the RemotePlayerManager to the InputHandler for remote input handling
		this.gameManager.getInputHandler().bindRemote(this.playerManager);
		this.playerManager.join('room1');
	}
}

document.addEventListener('DOMContentLoaded', () => {
	new App();
});
