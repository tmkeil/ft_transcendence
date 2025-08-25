import { GameConfig } from "./GameConfig.js";
import { PaddleLogic } from "./PaddleLogic.js";
import { GameScene, GameStatus/*, BallMesh, PaddleMesh*/ } from "../interfaces/GameInterfaces.js";

export class GameLogic {
	private scene : GameScene;
	private paddleLogic !: PaddleLogic;
	private gameStatus : GameStatus;
	private keys : {[key : string] : boolean};
	//private shakeTimeout: number | null = null;

	constructor (scene : GameScene, gameStatus : GameStatus, keys : { [key : string] : boolean }){
		this.scene = scene;
		this.gameStatus = gameStatus;
		this.keys = keys;
	}

	public setPaddleLogic(paddleLogic: PaddleLogic) : void {
		this.paddleLogic = paddleLogic;
	}

	public update() : void {
		this.updatePaddles();
		this.updateBall(true);
		this.updateScores();
	}

	private updatePaddles() : void {
		const	paddle1 = this.scene.paddle1;
		const 	paddle2 = this.scene.paddle2;
		const	upperWall = this.scene.upperWall;
		const	bottomWall = this.scene.bottomWall;
		const	paddleSize = GameConfig.paddleSize;
		const	paddleSpeed = GameConfig.paddleSpeed;
		const	acc = GameConfig.PADDLE_ACC;
		let		p1_spd = 0;
		let		p2_spd = 0;
		
		//	Controlled by two people on the same PC
		if (GameConfig.getOpponent == 'PERSON')
		{
			p1_spd = this.paddleLogic.playerPaddleControl(paddle1);
			p2_spd = this.paddleLogic.playerPaddleControl(paddle2);
		}
		
		//	Played by one peson and one AI
		if (GameConfig.getOpponent == 'AI')
		{
			p1_spd = this.paddleLogic.aiPaddleControl(paddle1, GameConfig.getAiDifficulty);
			p2_spd = this.paddleLogic.aiPaddleControl(paddle2, "MEDIUM");
		}
		
		//	Played by one peson and one AI
		if (GameConfig.getOpponent == 'REMOTE')
		{
			p1_spd = this.paddleLogic.remotePaddleControl(paddle1);
			p2_spd = this.paddleLogic.remotePaddleControl(paddle2);
		}

		//	Move in direction
		paddle1.speed.vspd += (p1_spd - paddle1.speed.vspd) * acc;
		paddle2.speed.vspd += (p2_spd - paddle2.speed.vspd) * acc;
		paddle1.position.z += paddle1.speed.vspd;
		paddle2.position.z += paddle2.speed.vspd;

		//	Clamp left paddle between upper and lower wall
		if (paddle1.position.z < (bottomWall.position.z + paddleSize / 2))
			paddle1.position.z = bottomWall.position.z + paddleSize / 2;
		else if (paddle1.position.z > (upperWall.position.z - paddleSize / 2))
			paddle1.position.z = upperWall.position.z - paddleSize / 2;

		//	Clamp right paddle between upper and lower wall
		if (paddle2.position.z < (bottomWall.position.z + paddleSize / 2))
			paddle2.position.z = bottomWall.position.z + paddleSize / 2;
		else if (paddle2.position.z > upperWall.position.z - paddleSize / 2)
			paddle2.position.z = upperWall.position.z - paddleSize / 2;
	}

	public updateBall(real_mode: boolean) : void {
		const	ball = this.scene.ball;
		const	paddle1 = this.scene.paddle1;
		const	paddle2 = this.scene.paddle2;
		const	paddleSize = GameConfig.paddleSize;

		//	Update ball position based on speed attribute
		ball.position.x = Math.max(-GameConfig.FIELD_WIDTH, Math.min(GameConfig.FIELD_WIDTH, ball.position.x));
		ball.position.z = Math.max(-GameConfig.FIELD_HEIGHT, Math.min(GameConfig.FIELD_HEIGHT, ball.position.z));
		ball.speed.hspd = Math.max(-1.25, Math.min(1.25, ball.speed.hspd));
		ball.speed.vspd = Math.max(-1.25, Math.min(1.25, ball.speed.vspd));
		ball.position.x += ball.speed.hspd * ball.spd_damp;
		ball.position.z += ball.speed.vspd * ball.spd_damp;
		if (ball.spd_damp < 1)
			ball.spd_damp += 0.02;

		//	Collision with left paddle
		if (ball.position.x <= (paddle1.position.x - ball.speed.hspd))
		{
			if (!real_mode)
				return;
			
			//	Goal
			if (ball.position.z - 1 > (paddle1.position.z + paddleSize / 2)
			|| ball.position.z + 1 < (paddle1.position.z - paddleSize / 2))
			{
				this.resetBall();
				this.gameStatus.p2Score ++;
			}
			else	//	Block
			{
				ball.speed.hspd *= -1.01;
				this.screenshake(ball.speed.hspd);
			}
		}

		//	Collision with right paddle
		if (ball.position.x >= (paddle2.position.x - ball.speed.hspd))
		{
			if (!real_mode)
				return;
			
			//	Goal
			if (ball.position.z - 1 > (paddle2.position.z + paddleSize / 2)
			|| ball.position.z + 1 < (paddle2.position.z - paddleSize / 2))
			{
				if (!real_mode)
					return;
				this.resetBall();
				this.gameStatus.p1Score ++;
			}
			else	//	Block
			{
				ball.speed.hspd *= -1.01;
				this.screenshake(ball.speed.hspd);
			}
		}

		//	Bounce off upper and bottom wall (reverse vertical speed)
		if ((ball.position.z > (this.scene.upperWall.position.z - ball.speed.vspd - 1) && ball.speed.vspd > 0)
			|| (ball.position.z < (this.scene.bottomWall.position.z - ball.speed.vspd + 1) && ball.speed.vspd < 0))
		{
			if (real_mode)
				this.screenshake(ball.speed.vspd);
			ball.speed.vspd *= -1;
			//	Additional offset to avoid wall-clipping
			ball.position.z += ball.speed.vspd;
		}
	}

	private resetBall() : void {
		const	ball = this.scene.ball;
	
		//	Reset Ball position to origin
		ball.position.x = 0;
		ball.position.z = 0;
		ball.spd_damp = 0;

		//	Randomize direction for next serve
		ball.speed.hspd *= Math.random() < 0.5 ? 1 : -1;
		ball.speed.vspd *= Math.random() < 0.5 ? 1 : -1;

		//	Reset paddle AI cooldowns
		this.paddleLogic.lastPredictionTime[0] = 0;
		this.paddleLogic.lastPredictionTime[1] = 0;

		//	Pause game after score
		// this.gameStatus.playing = false;
	}

	private updateScores() : void {
		this.scene.scores.clear();
		this.scene.scores.drawText(this.gameStatus.p1Score + "    " + this.gameStatus.p2Score, null, 120, "bold 100px Segoe UI, monospace", "white", "#002D2D", true, true);
	}


	private screenshake(force: number) : void {
		const	camera = this.scene.camera;
		if (!camera)
			return;

		//	Set shake values
		const	shakeMagnitude = (force * 0.02) + Math.random() * force * 0.01;
		const	shakeDuration = 500;	//in milliseconds
		const	startTime = performance.now();

		//	Fade shake until 'shakeDirection' fades
		const	animateShake = (now: number) => {
			const	progress = Math.min((now - startTime) / shakeDuration, 1);
			const	fade = 1 - progress;
			const	cam = camera as any;

			if (progress < 1) {
				camera.alpha = cam.og_alpha + (Math.random() - 0.5) * shakeMagnitude * fade;
				camera.beta  = cam.og_beta  + (Math.random() - 0.5) * shakeMagnitude * fade;
				camera.radius= cam.og_radius+ (Math.random() - 0.5) * shakeMagnitude * fade;
				requestAnimationFrame(animateShake);
			} else {
				camera.alpha = cam.og_alpha;
				camera.beta  = cam.og_beta;
				camera.radius= cam.og_radius;
			}
		};

		animateShake(startTime);
	}
}