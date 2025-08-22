import { GameStatus, GameScene } from "../interfaces/GameInterfaces.js";
import { GameConfig, GameLogic, PaddleLogic, SceneBuilder } from "../game/index.js";
import { InputHandler } from "./InputHandler.js";

export class GameManager {
	private	gameStatus:		GameStatus;
	private	inputHandler:	InputHandler;
	private	gameLogic:		GameLogic;
	private	sceneBuilder:	SceneBuilder;
	private	scene:			GameScene;
	private	paddleLogic:	PaddleLogic;

	constructor() {
		this.gameStatus = {
			p1Score:	0,
			p2Score:	0,
			running:	true,
			playing:	false
		};
		this.inputHandler = new InputHandler(this.gameStatus);
		this.sceneBuilder = new SceneBuilder("gameCanvas");
		this.scene = this.sceneBuilder.createScene();
		this.gameLogic = new GameLogic(this.scene, this.gameStatus, this.inputHandler.getKeys());
		this.paddleLogic = new PaddleLogic(this.scene, this.gameStatus, this.inputHandler.getKeys());

		this.paddleLogic.setGameLogic(this.gameLogic);
		this.gameLogic.setPaddleLogic(this.paddleLogic);
		this.setUpEventListeners();
		this.startGameLoop();
	}

	private setUpEventListeners() : void {
		window.addEventListener("resize", () => {
			this.sceneBuilder.getEngine().resize();
		});

		//	Handle page unload/refresh/close
		window.addEventListener('beforeunload', () => {
			this.cleanup();
		});

		//	Backup for older browsers or different scenarios
		window.addEventListener('unload', () => {
			this.cleanup();
		});

		//	Handle page visibility changes (when user switches tabs)
		document.addEventListener('visibilitychange', () => {
			if (document.hidden) {
				//	Pause the game
				console.log("Page hidden - consider pausing game");
			} else {
				//	Resume the game
				console.log("Page visible again");
			}
		});
	}

	private startGameLoop() : void {
		this.sceneBuilder.getEngine().runRenderLoop(() => {
			if (!this.gameStatus.running)
				return;
			if (this.gameStatus.playing)
				this.gameLogic.update();
			this.scene.render();
		});
        }

        private cleanup(): void {
          console.log('Cleaning up game resources...');

          //	Clean scene objects
          if (this.scene && !this.scene.isDisposed) this.scene.dispose();

          //	CLean engine
          if (this.sceneBuilder.getEngine() &&
              !this.sceneBuilder.getEngine().isDisposed)
            this.sceneBuilder.getEngine().dispose();

          //	End game
          this.gameStatus.running = false;
        }

        public applyServerState(s: {
          p1Y: number,
          p2Y: number,
          ballX: number,
          ballY: number,
          scoreL: number,
          scoreR: number,
          started: boolean
        }) {
          this.scene.paddle1.position.z = s.p1Y;
          this.scene.paddle2.position.z = s.p2Y;
          this.scene.ball.position.x = s.ballX;
          this.scene.ball.position.z = s.ballY;
          this.gameStatus.p1Score = s.scoreL;
          this.gameStatus.p2Score = s.scoreR;
          this.gameStatus.playing = s.started;
        }

		public getInputHandler(): InputHandler {
			return this.inputHandler;
		}
}