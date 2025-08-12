import { GameConfig } from "./GameConfig.js";
import { GameLogic } from "./GameLogic.js";
import { GameScene, GameStatus, BallMesh, PaddleMesh } from "../interfaces/GameInterfaces.js";

export class PaddleLogic {
	private	scene : GameScene;
	private	gameStatus : GameStatus;
	private	gameLogic !: GameLogic;
	private	keys : {[key : string] : boolean};
	private	lastPredictionTime: number[] = [0, 0];
	private	paddle_goal_pos: number[] = [0, 0];

	constructor (scene : GameScene, gameStatus : GameStatus, keys : { [key : string] : boolean }){
		this.scene = scene;
		this.gameStatus = gameStatus;
		this.keys = keys;
	}

	public setGameLogic(gameLogic: GameLogic) : void {
		this.gameLogic = gameLogic;
	}


	public playerPaddleControl(paddle: PaddleMesh) : number {
		let		move_dir = 0;
		const	paddleSpeed = GameConfig.paddleSpeed;

		//	Left paddle
		if (paddle.position.x < 0)
		{
			if (this.keys["w"] || this.keys["W"])
				move_dir = 1;
			else if (this.keys["s"] || this.keys["S"])
				move_dir = -1;
		}

		//	Right Paddle
		if (paddle.position.x > 0)
		{
			if (this.keys["ArrowUp"])
				move_dir = 1;
			else if (this.keys["ArrowDown"])
				move_dir = -1;
		}
		
		//	Return direction and speed to move at
		return (move_dir * paddleSpeed);
	}



	public aiPaddleControl(paddle: PaddleMesh) : number {
		const	ball = this.scene.ball;
		const	paddleSpeed = GameConfig.paddleSpeed;
		const	paddle_side = (paddle.position.x < 0) ? 0 : 1;
	
		//	Update AI's view of the field once per second
		if (performance.now() - this.lastPredictionTime[paddle_side] > 1000
		&& (paddle_side == 0 && this.scene.ball.speed.hspd < 0) || (paddle_side == 1 && this.scene.ball.speed.hspd > 0))
		{
			let	failsafe = GameConfig.FIELD_WIDTH;
			let	goal_z = 0;
			let	ball_xx = ball.position.x;
			let	ball_zz = ball.position.z;
			let	ball_hh = ball.speed.hspd;
			let	ball_vv = ball.speed.vspd;
	
			//	Cut prediction path short
			if (GameConfig.getAiDifficulty == 'EASY')
				failsafe /= 3;
	
			//	Offset ball direciton a bit to make it less accurate on MEDIUM difficulty
			if (GameConfig.getAiDifficulty == 'MEDIUM')
			{
				ball.speed.hspd += 0.1 - (Math.random() * 0.2);
				ball.speed.vspd += 0.1 - (Math.random() * 0.2);
			}
	
			//	Simulate ball movement
			if (paddle.position.x < 0)
			{
				while (ball.position.x > paddle.position.x + 5 && failsafe > 0)
				{
					this.gameLogic.updateBall(false);
					failsafe --;
				}
			}
			else if (paddle.position.x > 0)
			{
				while (ball.position.x < paddle.position.x - 5 && failsafe > 0)
				{
					this.gameLogic.updateBall(false);
					failsafe --;
				}
			}
	
			//	Reset ball to original conditions
			this.paddle_goal_pos[paddle_side] = this.scene.ball.position.z;
			this.scene.ball.position.x = ball_xx;
			this.scene.ball.position.z = ball_zz;
			this.scene.ball.speed.hspd = ball_hh;
			this.scene.ball.speed.vspd = ball_vv;
	
			//	Update the to new prediction time
			this.lastPredictionTime[paddle_side] = performance.now();
		}
	
		//	Paddle is close to goal, don't move
		if (Math.abs(this.paddle_goal_pos[paddle_side] - paddle.position.z) < GameConfig.paddleSpeed)
			return (0);
	
		//	Return direction for paddle to move
		return (Math.sign(this.paddle_goal_pos[paddle_side] - paddle.position.z) * paddleSpeed);
	}
}