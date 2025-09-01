import { GameLogic } from "./GameLogic.js";
import { GameScene, GameStatus, BallMesh, PaddleMesh } from "../interfaces/GameInterfaces.js";
import { Derived, movePaddles, moveBall } from "@app/shared";
import { Settings } from "./GameSettings.js";

type TmpState = {
	p1X: number;
	p1Y: number;
	p2X: number;
	p2Y: number;
	ballX: number;
	ballY: number;
	scoreL: number;
	scoreR: number;
	p1_spd: number;
	p2_spd: number;
}

export class PaddleLogic {
	private scene: GameScene;
	private gameStatus: GameStatus;
	private gameLogic !: GameLogic;
	private keys: { [key: string]: boolean };
	private lastPredictionTime: number[] = [0, 0];
	private paddle_goal_pos: number[] = [0, 0];
	private conf!: Readonly<Derived>;
	private settings: Settings;

	constructor(scene: GameScene, gameStatus: GameStatus, keys: { [key: string]: boolean }, settings: Settings) {
		this.scene = scene;
		this.gameStatus = gameStatus;
		this.keys = keys;
		this.settings = settings;
	}

	public setGameLogic(gameLogic: GameLogic): void {
		this.gameLogic = gameLogic;
	}

	public setConfig(conf: Readonly<Derived>) {
		this.conf = conf;
	}

	public setScene(scene: GameScene): void {
		this.scene = scene;
	}

	//	Player controls left (W:S) or right (Up:Down) paddle
	public playerPaddleControl(paddle: PaddleMesh): number {
		// console.log("Player controlling paddle");
		let move_dir = 0;

		//	Left paddle
		if (paddle.position.x < 0) {
			if (this.keys["w"] || this.keys["W"])
				move_dir = 1;
			else if (this.keys["s"] || this.keys["S"])
				move_dir = -1;
		}

		//	Right Paddle
		if (paddle.position.x > 0) {
			if (this.keys["ArrowUp"])
				move_dir = 1;
			else if (this.keys["ArrowDown"])
				move_dir = -1;
		}

		//	Return direction and speed to move at
		return (move_dir);
	}


	//	Player controls paddle (W:S / Up:Down)
	public dualPaddleControl(paddle: PaddleMesh): number {
		// console.log("Dual controlling paddle");
		let move_dir = 0;

		//	Move paddle
		if (this.keys["w"] || this.keys["W"]
			|| this.keys["ArrowUp"])
			move_dir = 1;
		else if (this.keys["s"] || this.keys["S"]
			|| this.keys["ArrowDown"])
			move_dir = -1;

		//	Return direction and speed to move at
		return (move_dir);
	}

	//	AI paddle Control
		public aiPaddleControl(tempState: TmpState, ballV: { hspd: number; vspd: number },
						conf: Readonly<Derived>, paddle: PaddleMesh): number {
		const side = (paddle.position.x < 0) ? 0 : 1;

		if (performance.now() - this.lastPredictionTime[side] > 1000)
		{
			let sim: TmpState = { ...tempState };
			let vh = ballV.hspd;
			let vv = ballV.vspd;

			if (this.settings.getAiDifficulty() === 'MEDIUM') {
				vh += 0.15 - (Math.random() * 0.3);
				vv += 0.15 - (Math.random() * 0.3);
			}

			let failsafe = conf.FIELD_WIDTH * (this.settings.getAiDifficulty()==='EASY' ? 1/4.5 : 1.5);

			const targetX = paddle.position.x + (side === 0 ? 5 : -5);
			while (((side === 0 && sim.ballX > targetX) || (side === 1 && sim.ballX < targetX))
				&& failsafe-- > 0) {
			moveBall(sim, { hspd: vh, vspd: vv }, conf, false);
			}

			this.paddle_goal_pos[side] = sim.ballY;
			this.lastPredictionTime[side] = performance.now();
		}

		if (Math.abs(this.paddle_goal_pos[side] - paddle.position.z) > this.conf.paddleSpeed / 2) {
			return Math.sign(this.paddle_goal_pos[side] - paddle.position.z);
		}
		return 0;
	}

	
}