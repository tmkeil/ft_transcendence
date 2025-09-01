import { GameLogic } from "./GameLogic.js";
import { GameScene, GameStatus, BallMesh, PaddleMesh } from "../interfaces/GameInterfaces.js";
import { Derived, movePaddles, moveBall } from "@app/shared";
import { Settings } from "./GameSettings.js";

type TmpState = {
	p1Y: number;
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

// // Predicts the Z position of the ball when it reaches a given X coordinate
// public static predictBallZAtX(
// 	startX: number,
// 	startZ: number,
// 	hspd: number,
// 	vspd: number,
// 	targetX: number,
// 	conf: Derived,
// 	maxSteps = 5000
// ): number {
// 	let x = startX, z = startZ, hx = hspd, vz = vspd;
// 	const halfH = conf.FIELD_HEIGHT / 2;

// 	// add difficulty noise HERE (nicht an scene.ball!)
// 	// if (difficulty === 'MEDIUM') { hx += 0.05 - Math.random()*0.1; vz += 0.05 - Math.random()*0.1; }

// 	// Simuliere, bis der Ball die senkrechte des Paddles erreicht hat
// 	while (((hx > 0) ? x < targetX : x > targetX) && maxSteps-- > 0) {
// 		x += hx;
// 		z += vz;
// 		if (z <= -halfH || z >= halfH) { vz *= -1; }
// 	}
// 	return z;
// }

// public aiPaddleControl(paddle: PaddleMesh): number {
//   const ball = this.scene.ball;
//   const paddleSpeed = this.conf.paddleSpeed;
//   const targetX = paddle.position.x;
//   const predictedZ = PaddleLogic.predictBallZAtX(
// 	ball.position.x,
// 	ball.position.z,
// 	ball.speed.hspd,
// 	ball.speed.vspd,
// 	targetX,
// 	this.conf
//   );

//   const dz = predictedZ - paddle.position.z;
//   if (Math.abs(dz) <= paddleSpeed / 2) return 0;
//   return Math.sign(dz) * paddleSpeed;
// }

	// export function moveBall(tempState: TmpState, ballV: { hspd: number; vspd: number }, conf: Readonly<Derived>, realMode: boolean): void {
// 
	//	AI controls paddle
	// public aiPaddleControl(tempState: TmpState, ballV: { hspd: number; vspd: number }, conf: Readonly<Derived>, paddle: PaddleMesh): number {
	// 	// console.log("AI controlling paddle");
	// 	const ball = this.scene.ball;
	// 	const paddle_side = (paddle.position.x < 0) ? 0 : 1;

	// 	//	Update AI's view of the field once per second
	// 	if (performance.now() - this.lastPredictionTime[paddle_side] > 1000)
	// 	/*&& ((paddle_side == 0 && this.scene.ball.speed.hspd < 0)
	// 	|| (paddle_side == 1 && this.scene.ball.speed.hspd > 0)))*/ {
	// 		let failsafe = conf.FIELD_WIDTH * 1.5;
	// 		let ball_xx = ball.position.x;
	// 		let ball_zz = ball.position.z;
	// 		let ball_hh = ball.speed.hspd;
	// 		let ball_vv = ball.speed.vspd;

	// 		//	Cut prediction path short
	// 		if (this.settings.getAiDifficulty() == 'EASY')
	// 			failsafe /= 3;

	// 		//	Offset ball direciton a bit to make it less accurate on MEDIUM difficulty
	// 		if (this.settings.getAiDifficulty() == 'MEDIUM') {
	// 			ball.speed.hspd += 0.05 - (Math.random() * 0.1);
	// 			ball.speed.vspd += 0.05 - (Math.random() * 0.1);
	// 		}

	// 		//	Simulate ball movement
	// 		if (paddle.position.x < 0) {
	// 			while (ball.position.x > paddle.position.x + 5 && failsafe > 0) {
	// 				moveBall(tempState, ballV, conf, false);
	// 				this.scene.ball.position.x = tempState.ballX;
	// 				this.scene.ball.position.z = tempState.ballY;



	// 				failsafe--;
	// 			}
	// 		}
	// 		else if (paddle.position.x > 0) {
	// 			while (ball.position.x < paddle.position.x - 5 && failsafe > 0) {
	// 				moveBall(tempState, ballV, conf, false);
	// 									this.scene.ball.position.x = tempState.ballX;
	// 				this.scene.ball.position.z = tempState.ballY;
	// 				failsafe--;
	// 			}
	// 		}

	// 		//	Reset ball to original conditions
	// 		this.paddle_goal_pos[paddle_side] = this.scene.ball.position.z;
	// 		this.scene.ball.position.x = ball_xx;
	// 		this.scene.ball.position.z = ball_zz;
	// 		this.scene.ball.speed.hspd = ball_hh;
	// 		this.scene.ball.speed.vspd = ball_vv;

	// 		//	Update the to new prediction time
	// 		this.lastPredictionTime[paddle_side] = performance.now();
	// 	}

	// 	//	Return direction for paddle to move
	// 	if (Math.abs(this.paddle_goal_pos[paddle_side] - paddle.position.z) > this.conf.paddleSpeed / 2)
	// 		return (Math.sign(this.paddle_goal_pos[paddle_side] - paddle.position.z));

	// 	//	Paddle is close to goal, don't move
	// 	return (0);
	// }
	public aiPaddleControl(tempState: TmpState, ballV: { hspd: number; vspd: number },
                       conf: Readonly<Derived>, paddle: PaddleMesh): number {
  const side = (paddle.position.x < 0) ? 0 : 1;

  if (performance.now() - this.lastPredictionTime[side] > 1000) {
    let sim: TmpState = { ...tempState };
    let vh = ballV.hspd;
    let vv = ballV.vspd;

    if (this.settings.getAiDifficulty() === 'MEDIUM') {
      vh += 0.05 - (Math.random() * 0.1);
      vv += 0.05 - (Math.random() * 0.1);
    }

    let failsafe = conf.FIELD_WIDTH * (this.settings.getAiDifficulty()==='EASY' ? 0.5 : 1.5);

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