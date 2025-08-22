import { ServerState } from '../interfaces/GameInterfaces';

type ServerMsg =
	| { type: 'chat'; userId: number; content: string; }
	| { type: 'input'; state: ServerState; }
	| { type: 'join'; roomId: string; userId: number; }

export class RemotePlayerManager
{
	userID: number;
	// WebSocket instance to communicate with the server.
	private ws?: WebSocket;
	// Array of callback functions to handle incoming messages.
	// private callbacks: ((msg: string) => void)[] = [];
	// Binding callbacks to state change events
	private stateHandler?: (s: ServerState) => void;
	// Binding callbacks to chat events
	private chatHandler?: (msg: { userId: number; content: string }) => void;

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
		}

		// When a message arrives from the server
		this.ws.onmessage = (event) => {
			// Parse it
			const msg: ServerMsg = JSON.parse(event.data);

			console.log(`Message received from server: ${JSON.stringify(msg)}`);
            switch (msg.type) {
              case 'chat':
                console.log(`Chat message received from user ${msg.userId}: ${msg.content}`);
                this.chatHandler?.({ userId: msg.userId, content: msg.content });
                break;
              case 'input':
                console.log(`Game state update received`);
				this.stateHandler?.(msg.state);
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
		this.stateHandler = callback;
	}

	// Registers a callback function to handle chat messages received from the server to update the chat log.
	public onChat(callback: (msg: { userId: number; content: string }) => void): void {
		this.chatHandler = callback;
	}

	// Sends a chat message to the server.
	public sendChatMessage(content: string): void {
		// Sends a chat message to the server.
		console.log(`Sending chat message from user ${this.userID}: ${content}`);
		this.send({ type: 'chat', userId: this.userID, content });
	}

	public join(roomId: string): void {
		// Sends a message to the server to join a game
		this.send({ type: 'join', roomId, userId: this.userID });
	}

	public sendInput(dir: -1 | 0 | 1): void {
		// Sends the user's input direction to the server.
		this.send({ type: 'input', userId: this.userID, direction: dir });
	}

	// Indicates that the user is ready to play.
	public ready(): void {
		// Sends a message to the server indicating that the user is ready to play.
		this.send({ type: 'ready' });
	}

	// Sends a message to the server via WebSocket.
	public send(obj: unknown): void {
		// console.log(`Sending message from user ${this.userID}: ${message}`);
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(obj));
		}
	}

	// Disconnects the WebSocket connection and clears the callbacks.
	public disconnect(): void {
		this.ws?.close();
	}
}
