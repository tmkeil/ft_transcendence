import { Settings } from "./GameSettings.js";
import { PaddleLogic } from "./PaddleLogic.js";
import { GameScene, GameStatus/*, BallMesh, PaddleMesh*/ } from "../interfaces/GameInterfaces.js";
import { Derived, movePaddles, moveBall, resetBall } from "@app/shared";

export class GameLogic {
	private scene: GameScene;
	private gameStatus: GameStatus;
	private keys: { [key: string]: boolean };
	private conf!: Readonly<Derived>;
	private paddleLogic !: PaddleLogic;
	private ballV = resetBall();
	private tempState = { p1Y: 0, p2Y: 0, ballX: 0, ballY: 0, scoreL: 0, scoreR: 0, p1_spd: 0, p2_spd: 0 };
	private settings: Settings;
	//private shakeTimeout: number | null = null;

	constructor(scene: GameScene, gameStatus: GameStatus, keys: Record<string, boolean>, settings: Settings) {
		this.scene = scene;
		this.gameStatus = gameStatus;
		this.keys = keys;
		this.settings = settings;
	}

	public setScene(scene: GameScene): void {
		this.scene = scene;
	}

	public setConfig(conf: Readonly<Derived>) {
		this.conf = conf;
	}

	public setPaddleLogic(paddleLogic: PaddleLogic): void {
		this.paddleLogic = paddleLogic;
	}

	public update(): void {
		// If the opponent is remote, the paddles/ball are getting updated via applyServerState()
		// console.log("Opponent is", this.settings.getOpponent());
		if (this.settings.getOpponent() === 'REMOTE')
		{
			this.updateScores();
			return;
		}

		// console.log("test");
		// console.log(this.conf);
		// If the game is played locally and the Opponent is an AI => control p1 by dualPaddleControl
		// If the game is played locally and the Opponent is a Person => control p1 by playerPaddleControl
		const p1 = this.settings.getOpponent() === 'AI' ?
			this.paddleLogic.dualPaddleControl(this.scene.paddle1) :
			this.paddleLogic.playerPaddleControl(this.scene.paddle1);

		// If the game is played locally and the Opponent is an AI => control p2 by aiPaddleControl
		// If the game is played locally and the Opponent is a Person => control p2 by playerPaddleControl
		// 
		const p2 = this.settings.getOpponent() === 'AI' ?
			this.paddleLogic.aiPaddleControl(this.tempState, this.ballV, this.conf, this.scene.paddle2) :
			this.paddleLogic.playerPaddleControl(this.scene.paddle2);
		const inputs = {
			left: p1,
			right: p2
		};

		movePaddles(this.tempState, inputs, this.conf);
		// console.log("Ball before move:", this.tempState.ballX, this.tempState.ballY);
		moveBall(this.tempState, this.ballV, this.conf, true);

		this.scene.paddle1.position.z = this.tempState.p1Y;
		this.scene.paddle2.position.z = this.tempState.p2Y;
		this.scene.ball.position.x = this.tempState.ballX;
		this.scene.ball.position.z = this.tempState.ballY;

		this.gameStatus.scoreL = this.tempState.scoreL;
		this.gameStatus.scoreR = this.tempState.scoreR;

		this.updateScores();
	}

	private updateScores(): void {
		this.scene.scores.clear();
		this.scene.scores.drawText(this.gameStatus.scoreL + "    " + this.gameStatus.scoreR, null, 120, "bold 100px Segoe UI, monospace", "white", "#002D2D", true, true);
	}


	private screenshake(force: number): void {
		const camera = this.scene.camera;
		if (!camera)
			return;

		//	Set shake values
		const shakeMagnitude = (force * 0.04) + Math.random() * force * 0.02;
		const shakeDuration = 500;	//in milliseconds
		const startTime = performance.now();

		//	Fade shake until 'shakeDirection' fades
		const animateShake = (now: number) => {
			const progress = Math.min((now - startTime) / shakeDuration, 1);
			const fade = 1 - progress;
			const cam = camera as any;

			if (progress < 1) {
				camera.alpha = cam.og_alpha + (Math.random() - 0.5) * shakeMagnitude * fade;
				camera.beta = cam.og_beta + (Math.random() - 0.5) * shakeMagnitude * fade;
				camera.radius = cam.og_radius + (Math.random() - 0.5) * shakeMagnitude * fade;
				requestAnimationFrame(animateShake);
			} else {
				camera.alpha = cam.og_alpha;
				camera.beta = cam.og_beta;
				camera.radius = cam.og_radius;
			}
		};
		animateShake(startTime);
	}
}