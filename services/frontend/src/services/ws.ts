// Improved version of RemotePlayerManager.ts
import { ServerState } from "src/interfaces";
import { Derived } from "@app/shared";

// Msg types that can be received from the server
type Msg = 
  | { type: "hello"; userId: number }
  | { type: 'chat'; userId: number; content: string; }
  | { type: 'state'; state: ServerState; }
  | { type: 'join'; side: string; gameConfig: Derived; state: ServerState; }
  | { type: 'start'; timestamp: Number; }

class WSClient {
  // WebSocket connection
  private ws?: WebSocket;
  // Message queue for messages sent before the connection is open
  private queue: string[] = [];
  // This stores the lambda funcs/callbacks for each message type, which are functions of type (m: any) => void
  private listeners: Map<string, Set<(m: any) => void>> = new Map();
  private connected = false;
  // ws/wss: WebSocket protocol, secure (wss) or insecure (ws)
	// location.protocol: 'http:' or 'https:'
	// location.host: current host and port (e.g., 'localhost:3000', 'localhost:8443')
  private WS_URL = location.protocol === "https:"
    ? `wss://${location.host}/ws`
    : `ws://${location.host}/ws`;
  private userId?: number;

  connect(userId: number) {
    // If this ws is already connected
    if (this.connected && this.ws)
      return;
    this.userId = userId;

    // Create a new WebSocket connection
    this.ws = new WebSocket(this.WS_URL);
    this.connected = true;
    // When the connection is open, flush the message queue, which is sending the messages that were queued before the connection was established
    this.ws.onopen = () => {
      this.flush();
      this.send({ type: "hello", userId });
    };

    // Handle messages received from the server
    this.ws.onmessage = (event) => {
      // Parse the incoming message into a Msg object
      const msg: Msg = JSON.parse(event.data);
      const listeners = this.listeners.get(msg.type);
      if (listeners) {
        for (const cb of listeners)
          cb(msg);
      }
    };

    this.ws.onclose = () => {
      this.connected = false;
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  // Subscribe to messages of a specific type, which are received from the server
  // The handler is a callback or lambda function, which is called when a message of the given type is received
  on(type: string, handler: (m: any) => void) {
    // Types: 'hello', 'chat', 'state', 'join', 'start'
    // Set: Lambda functions to be called when a message of the given type is received
    if (!this.listeners.has(type))
      this.listeners.set(type, new Set());
    // Add the handler to the set of listeners
    this.listeners.get(type)!.add(handler);
  }

  // Unsubscribe from messages again
  off(type: string, handler: (m: any) => void) {
    this.listeners.get(type)?.delete(handler);
  }

  // Responsible for sending messages to the server
  send(obj: any) {
    const s = JSON.stringify(obj);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(s);
    } else {
      this.queue.push(s);
    }
  }

  // Responsible for closing the WebSocket connection
  close() {
    this.userId = undefined;
    this.ws?.close();
    this.connected = false;
  }

  // Flush the message queue by sending all queued messages to the server
  private flush() {
    while (this.queue.length && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(this.queue.shift()!);
    }
  }
}

// Export an instance of the WSClient to be used in the home page for handling WebSocket communication (Sending chat messages, joining a room, readying up, receiving game state updates)
export const ws = new WSClient();
