import { ServerState } from '../interfaces/GameInterfaces';
import { Derived, WorldConfig } from '@app/shared';

type ServerMsg =
	| { type: 'chat'; userId: number; content: string; }
	| { type: 'state'; state: ServerState; }
	| { type: 'join'; side: string; gameConfig: Derived; state: ServerState; }
	| { type: 'start'; timestamp: Number; }

export class RemotePlayerManager {
	private queue: unknown[] = [];
	userID: number;
	// WebSocket instance to communicate with the server.
	private ws?: WebSocket;
	// Array of callback functions to handle incoming messages.
	// private callbacks: ((msg: string) => void)[] = [];
	// Binding callbacks to state change events
	private stateHandler?: (s: ServerState) => void;
	// Binding callbacks to chat events
	private chatHandler?: (msg: { userId: number; content: string }) => void;
	// ; gameConfig: WorldConfig
	private joinHandler?: (msg: { side: string; gameConfig: Derived; state: ServerState }) => void;
	private startHandler?: (timestamp: Number) => void;

	constructor(id: number) {
		// ws/wss: WebSocket protocol, secure (wss) or insecure (ws)
		// location.protocol: 'http:' or 'https:'
		// location.host: current host and port (e.g., 'localhost:3000', 'localhost:8443')
		const WS_URL = location.protocol === 'https:'
			? `wss://${location.host}/ws`
			: `ws://${location.host}/ws`;

		this.userID = id;
		this.initialize(WS_URL);
	}

	// Initializes the WebSocket connection and sets up event listeners like onopen, onmessage, onclose, and onerror.
	private async initialize(WS_URL: string): Promise<void> {
		// Creates a WebSocket connection with the host server to receive messages from the server, send input, and receive game state updates.
		this.ws = new WebSocket(WS_URL);
		this.ws.onopen = () => {
			this.send(`User ${this.userID} connected`);

			while (this.queue.length && this.ws?.readyState === WebSocket.OPEN) {
				const obj = this.queue.shift();
				console.log("Flushing queued msg:", JSON.stringify(obj));
				this.ws!.send(JSON.stringify(obj));
			}
		}

		// When a message arrives from the server
		this.ws.onmessage = (event) => {
			// Parse it
			const msg: ServerMsg = JSON.parse(event.data);

			switch (msg.type) {
				case 'chat':
					console.log(`Chat message received from user ${msg.userId}: ${msg.content}`);
					// This will call the append_log via this.onChat
					this.chatHandler?.({ userId: msg.userId, content: msg.content });
					break;
				case 'state':
					// This will call the applyServerState via this.onState
					this.stateHandler?.(msg.state);
					break;
				case 'join':
					console.log(`Joined game, initial state received from the server`);
					// , gameConfig: msg.gameConfig
					this.joinHandler?.({ side: msg.side, gameConfig: msg.gameConfig, state: msg.state });
					break;
				case 'start':
					console.log(`Game start signal received from the server`);
					this.startHandler?.(msg.timestamp);
					break;
				default:
					console.warn(`Unknown message type received: ${(msg as any).type}`);
					break;
			}
			// Loop through all callbacks/subscribers and call the binded function:
			// (this.Chat.append_log(msg) in main.ts for this specific user) to append the message to the user's chat log.
			// for (const callback of this.callbacks) {
			// 	console.log(`Calling callback for user ${this.userID}`);
			// 	callback(content);
			// }
		}

		// When this client closes the connection:
		this.ws.onclose = () => console.log("Disconnected");

		// When there is an error with the connection:
		this.ws.onerror = () => console.error("WebSocket error");
	}

	// Registers a callback function to handle incoming messages received from the server.
	// Like a subscription in Angular/RxJS.
	// public addCallback(callback: (msg: string) => void): void {
	// 	console.log(`Adding callback for user ${this.userID}`);
	// 	this.callbacks.push(callback);
	// }

	// Registers a callback function to handle game state updates received from the server.
	public onState(callback: (s: ServerState) => void): void {
		// This triggers the applyServerState method in main.ts because it was binded in setupChatHandlers
		this.stateHandler = callback;
	}

	// Registers a callback function to handle chat messages received from the server to update the chat log.
	public onChat(callback: (msg: { userId: number; content: string }) => void): void {
		// This triggers the append_log method in main.ts because it was binded in setupChatHandlers
		this.chatHandler = callback;
	}

	// ; gameConfig: WorldConfig
	public onJoin(callback: (msg: { side: string; gameConfig: Derived; state: ServerState }) => void): void {
		this.joinHandler = callback;
	}

	public onStart(callback: (timestamp: Number) => void): void {
		this.startHandler = callback;
	}

	// Sends a chat message to the server and the lambda function that was binded to the msg-send-button was fired
	public sendChatMessage(content: string): void {
		console.log("Sending chat message to the server:", content);
		this.send({ type: 'chat', userId: this.userID, content });
	}

	// If the user pressed the "Join" button in a multiplayer game
	public join(roomId: string): void {
		// Sends a message to the server to join a game
		console.log(`User ${this.userID} joining room ${roomId}`);
		this.send({ type: 'join', roomId, userId: this.userID });
	}

	// If the sendRemoteInput method in InputHandler detects a change in direction
	public sendInput(dir: -1 | 0 | 1): void {
		// Sends the user's input direction to the server.
		console.log("Sending remote input:", dir);
		this.send({ type: 'input', userId: this.userID, direction: dir });
	}

	// If the user pressed the "Ready" button in a multiplayer game
	public ready(): void {
		// Sends a message to the server indicating that the user is ready to play
		console.log(`User ${this.userID} is ready`);
		this.send({ type: 'ready', userId: this.userID });
		console.log("Ready message sent to server");
	}

	// Sends a message to the server
	public send(obj: unknown): void {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			console.warn("WS not open yet; queueing:", obj);
			this.queue.push(obj);
			return;
		}
		console.log("Sending message to server:", JSON.stringify(obj));
		this.ws.send(JSON.stringify(obj));
	}

	// Disconnects the WebSocket connection and clears the callbacks.
	public disconnect(): void {
		this.ws?.close();
	}
}
