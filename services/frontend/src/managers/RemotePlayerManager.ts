export class RemotePlayerManager
{
	userID: number;
	// WebSocket instance to communicate with the server.
	private ws?: WebSocket;
	// Array of callback functions to handle incoming messages.
	private callbacks: ((msg: string) => void)[] = [];

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
			const { userId, content } = JSON.parse(event.data);

			// Loop through all callbacks/subscribers and call the binded function:
			// (this.Chat.append_log(msg) in main.ts for this specific user) to append the message to the user's chat log.
			for (const callback of this.callbacks) {
				console.log(`Calling callback for user ${this.userID}`);
				callback(content);
			}
		}

        // When this client closes the connection:
		this.ws.onclose = () => console.log("Disconnected");

		// When there is an error with the connection:
		this.ws.onerror = () => console.error("WebSocket error");
	}

	// Registers a callback function to handle incoming messages received from the server.
	// Like a subscription in Angular/RxJS.
	public addCallback(callback: (msg: string) => void): void {
		console.log(`Adding callback for user ${this.userID}`);
		this.callbacks.push(callback);
	}

	// Sends a message to the server via WebSocket.
	public send(message: string): void {
		console.log(`Sending message from user ${this.userID}: ${message}`);
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify({
				userId: this.userID,
				content: message
			}));
		}
	}

	// Disconnects the WebSocket connection and clears the callbacks.
	public disconnect(): void {
		this.ws?.close();
		this.callbacks = [];
	}
}