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
		this.game = game;
		this.setUpEventListeners();
	}

	public bindRemote(remote: RemotePlayerManager) : void {
		this.remote = remote;
		this.isRemote = true;
	}

	private setUpEventListeners() : void {
		const startButton = document.getElementById("startButton") as HTMLButtonElement;
		
		if (startButton) {
			if (this.isRemote && this.remote) {
				this.remote.ready();
			}
			else {
				this.game.playing = true;
			}
			startButton.addEventListener("click", () => {
				this.game.playing = true;
			});
		}

		document.addEventListener("keydown", (ev) => {
			if (!this.usedKeys.includes(ev.key)) return;
			console.log("Key pressed:", ev.key);
			this.keys[ev.key] = true;
		});

		document.addEventListener("keyup", (ev) => {
			if (!this.usedKeys.includes(ev.key)) return;
			if (this.isRemote) this.sendRemoteInput();
			this.keys[ev.key] = false;
		});
	}

	private sendRemoteInput() : void {
		if (!this.remote) return;

		const up = this.keys["w"] || this.keys["ArrowUp"] || this.keys["W"];
		const down = this.keys["s"] || this.keys["ArrowDown"] || this.keys["S"];
		const dir = up && !down ? 1 : (!up && down ? -1 : 0);

		if (dir !== this.lastDir) {
			this.lastDir = dir;
			console.log("Sending remote input:", dir);
			this.remote.sendInput(dir);
		}
	}

	public getKeys() : { [key : string] : boolean } {
		return (this.keys);
	}
}
