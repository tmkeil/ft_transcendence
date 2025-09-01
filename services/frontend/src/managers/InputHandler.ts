import { GameStatus } from "../interfaces/GameInterfaces.js";
import { RemotePlayerManager } from "./RemotePlayerManager.js";

export class InputHandler {
	private keys:		Record<string, boolean> = {};
	private usedKeys:	string[] = ["w", "s", "ArrowUp", "ArrowDown", "W", "S"];
	private game:		GameStatus;

	private remote?: RemotePlayerManager;
	private isRemote: Boolean = false;
	private lastDir: -1 | 0 | 1 = 0;

	constructor (game: GameStatus) {
		// The game status object to update based on user input
		this.game = game;
		// Set up event listeners for key presses and releases
		this.setUpEventListeners();
	}

	// This is called from the GameManager when a RemotePlayerManager is created to bind the remote player to the input handler
	public bindRemote(remote: RemotePlayerManager) : void {
		this.remote = remote;
	}

	public setRemote(isRemote: Boolean) : void {
		this.isRemote = isRemote;
	}

	private setUpEventListeners() : void {
		const startBtn = document.getElementById("startBtn") as HTMLButtonElement;
		
		if (startBtn) {
			startBtn.addEventListener("click", () => {
				if (this.isRemote && this.remote) {
					console.log("Remote game: Player is ready, sending to server");
					// Send via the remote player manager to the server, that the player is ready. It sets the ready state for this player in a room to true
					this.remote.ready();
				} else {
					console.log("Local game: Player is ready, setting game to playing");
					// In case of local players just set GameStatus.playing to true, so the GameLoop updates the GameStatus (ball/paddles/score-texture) continuously
					this.game.playing = true;
				}
			});
		}

		document.addEventListener("keydown", (ev) => {
			if (!this.usedKeys.includes(ev.key)) return;
			console.log("Key pressed:", ev.key);
			this.keys[ev.key] = true;
			if (this.isRemote) this.sendRemoteInput();
		});

		document.addEventListener("keyup", (ev) => {
			if (!this.usedKeys.includes(ev.key)) return;
			this.keys[ev.key] = false;
			if (this.isRemote) this.sendRemoteInput();
		});
	}

	private sendRemoteInput() : void {
		if (!this.remote) return;

		const up = this.keys["w"] || this.keys["ArrowUp"] || this.keys["W"];
		const down = this.keys["s"] || this.keys["ArrowDown"] || this.keys["S"];
		const dir = up && !down ? 1 : (!up && down ? -1 : 0);
		if (dir !== this.lastDir) {
			this.lastDir = dir;
			this.remote.sendInput(dir);
		}
	}

	public getKeys() : { [key : string] : boolean } {
		return (this.keys);
	}
}
