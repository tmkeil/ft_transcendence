import { GameConfig } from "./GameConfig.js";
import { GameScene, GameStatus, BallMesh } from "../interfaces/GameInterfaces.js";

export class GameLogic {
	private scene : GameScene;
	private gameStatus : GameStatus;
	private keys : {[key : string] : boolean};
	private shakeTimeout: number | null = null;

	constructor (scene : GameScene, gameStatus : GameStatus, keys : { [key : string] : boolean }){
		this.scene = scene;
		this.gameStatus = gameStatus;
		this.keys = keys;
	}

	public update() : void {
		this.updatePaddles();
		this.updateBall();
		this.updateScores();
	}

	private updatePaddles() : void {
		const paddle1 = this.scene.paddle1;
		const paddle2 = this.scene.paddle2;
		const ball = this.scene.ball;
		const upperWall = this.scene.upperWall;
		const bottomWall = this.scene.bottomWall;
		const paddleSpeed = GameConfig.paddleSpeed;
		const paddleSize = GameConfig.paddleSize;
		
		//	Mock AI
		if (ball.position.x < 0 && ball.speed.hspd < 0)
			paddle1.position.z += Math.sign(ball.position.z - paddle1.position.z) * paddleSpeed;
		if (ball.position.x > 0 && ball.speed.hspd > 0)
			paddle2.position.z += Math.sign(ball.position.z - paddle2.position.z) * paddleSpeed;

		//	Move left paddle with [W]:[S]
		/*if (this.keys["w"] || this.keys["W"])
			paddle1.position.z += paddleSpeed;
		if (this.keys["s"] || this.keys["S"])
			paddle1.position.z -= paddleSpeed;*/

		//	Clamp left paddle between upper and lower wall
		if (paddle1.position.z < (bottomWall.position.z + paddleSize / 2))
			paddle1.position.z = bottomWall.position.z + paddleSize / 2;
		else if (paddle1.position.z > (upperWall.position.z - paddleSize / 2))
			paddle1.position.z = upperWall.position.z - paddleSize / 2;

		//	Move left paddle with [up]:[down]
		/*if (this.keys["ArrowUp"]) 
			paddle2.position.z += paddleSpeed;
		if (this.keys["ArrowDown"])
			paddle2.position.z -= paddleSpeed;*/

		//	Clamp right paddle between upper and lower wall
		if (paddle2.position.z < (bottomWall.position.z + paddleSize / 2))
			paddle2.position.z = bottomWall.position.z + paddleSize / 2;
		else if (paddle2.position.z > upperWall.position.z - paddleSize / 2)
			paddle2.position.z = upperWall.position.z - paddleSize / 2;
	}

	private updateBall() : void {
		const ball = this.scene.ball;
		const paddle1 = this.scene.paddle1;
		const paddle2 = this.scene.paddle2;
		const paddleSize = GameConfig.paddleSize;

		//	Update ball position based on speed attribute
		ball.position.x += ball.speed.hspd;
		ball.position.z += ball.speed.vspd;
		
		//	Collision with left paddle
		if (ball.position.x <= (paddle1.position.x + 2))
		{
			//	Goal
			if (ball.position.z > (paddle1.position.z + paddleSize / 2) || ball.position.z < (paddle1.position.z - paddleSize / 2))
			{
				this.resetBall();
				this.gameStatus.p2Score ++;
			}
			else	//	Block
			{
				ball.speed.hspd = -ball.speed.hspd;
				this.screenshake(ball.speed.hspd);
			}
		}
		//	Collision with right paddle
		else if (ball.position.x >= (paddle2.position.x - 2))
		{
			//	Goal
			if (ball.position.z > (paddle2.position.z + paddleSize / 2) || ball.position.z < (paddle2.position.z - paddleSize / 2))
			{
				this.resetBall();
				this.gameStatus.p1Score ++;
			}
			else	//	Block
			{
				ball.speed.hspd = -ball.speed.hspd;
				this.screenshake(ball.speed.hspd);
			}
		}
		//	Bounce off upper and bottom wall (reverse vertical speed)
		else if ((ball.position.z > (this.scene.upperWall.position.z - 1) && ball.speed.vspd > 0)
			|| (ball.position.z < (this.scene.bottomWall.position.z + 1) && ball.speed.vspd < 0))
		{
			this.screenshake(ball.speed.vspd);
			ball.speed.vspd = -ball.speed.vspd;
			//	Additional offset to avoid wall-clipping
			ball.position.y += ball.speed.vspd;
		}
	}

	private resetBall() : void {
		const ball = this.scene.ball;
	
		//	Reset Ball position to origin
		ball.position.x = 0;
		ball.position.z = 0;

		//	Randomize direction for next serve
		ball.speed.hspd = 0;//Math.random() < 0.5 ? ball.speed.hspd : -ball.speed.hspd;
		ball.speed.vspd = Math.random() < 0.5 ? ball.speed.vspd : -ball.speed.vspd;

		//	Pause game after score
		// this.gameStatus.playing = false;
	}

	private updateScores() : void {
		this.scene.scores.clear();
		this.scene.scores.drawText(this.gameStatus.p1Score + "    " + this.gameStatus.p2Score, null, 120, "bold 100px Segoe UI, monospace", "white", "#002D2D", true, true);
	}


	private screenshake(force: number) : void {
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