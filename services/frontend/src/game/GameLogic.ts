import { Settings } from "./GameSettings.js";
import { PaddleLogic } from "./PaddleLogic.js";
import { GameScene, GameStatus/*, BallMesh, PaddleMesh*/ } from "../interfaces/GameInterfaces.js";
import { Derived, movePaddles, moveBall } from "@app/shared";

export class GameLogic {
	private scene: GameScene;
	private gameStatus: GameStatus;
	private keys: { [key: string]: boolean };
	private conf!: Readonly<Derived>;
	private paddleLogic !: PaddleLogic;
	private ballV = { hspd: 0, vspd: 0 };
	//private shakeTimeout: number | null = null;

	constructor(scene: GameScene, gameStatus: GameStatus, keys: Record<string, boolean>) {
		this.scene = scene;
		this.gameStatus = gameStatus;
		this.keys = keys;
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
		if (Settings.getOpponent === 'REMOTE')
		{
			this.updateScores();
			return;
		}
		const p1 = Settings.getOpponent === 'AI' ?
			this.paddleLogic.dualPaddleControl(this.scene.paddle1) :
			this.paddleLogic.playerPaddleControl(this.scene.paddle1);

		const p2 = Settings.getOpponent === 'AI' ?
			this.paddleLogic.aiPaddleControl(this.scene.paddle2) :
			this.paddleLogic.playerPaddleControl(this.scene.paddle2);

		const inputs = {
			left: p1 > 0 ? 1 : (p1 < 0 ? -1 : 0),
			right: p2 > 0 ? 1 : (p2 < 0 ? -1 : 0)
		}

		movePaddles(this.gameStatus, inputs, this.conf);
		moveBall(this.gameStatus, this.ballV, this.conf);

		this.scene.paddle1.position.z = this.gameStatus.p1Y;
		this.scene.paddle2.position.z = this.gameStatus.p2Y;
		this.scene.ball.position.x = this.gameStatus.ballX;
		this.scene.ball.position.z = this.gameStatus.ballY;

		this.gameStatus.scoreL = this.gameStatus.scoreL;
		this.gameStatus.scoreR = this.gameStatus.scoreR;

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