		// movePaddles(this.gameStatus, inputs, this.conf);
		// moveBall(this.gameStatus, this.ballV, this.conf);
import { Derived } from './config.js';


export function movePaddles(gameStatus, inputs: { left: number; right: number }, conf: Readonly<Derived>): void {
    const paddle1 = gameStatus.paddle1;
    const paddle2 = gameStatus.paddle2;
    const upperWall = gameStatus.upperWall;
    const bottomWall = gameStatus.bottomWall;
    const paddleSize = conf.paddleSize;

    // Move paddles based on inputs
    paddle1.position.z += inputs.left * conf.paddleSpeed;
    paddle2.position.z += inputs.right * conf.paddleSpeed;

    // Clamp paddles within walls
    paddle1.position.z = Math.max(bottomWall.position.z + paddleSize / 2, Math.min(upperWall.position.z - paddleSize / 2, paddle1.position.z));
    paddle2.position.z = Math.max(bottomWall.position.z + paddleSize / 2, Math.min(upperWall.position.z - paddleSize / 2, paddle2.position.z));
}


export function moveBall(gameStatus, ballV: { hspd: number; vspd: number }, conf: Readonly<Derived>): void {
}


	// These functions will be moved to shared

	// private updatePaddles(): void {
	// 	const paddle1 = this.scene.paddle1;
	// 	const paddle2 = this.scene.paddle2;
	// 	const upperWall = this.scene.upperWall;
	// 	const bottomWall = this.scene.bottomWall;
	// 	const paddleSize = GameConfig.paddleSize;
	// 	const paddleSpeed = GameConfig.paddleSpeed;
	// 	const acc = this.conf.PADDLE_ACC;
	// 	let p1_spd = 0;
	// 	let p2_spd = 0;

	// 	//	Controlled by two people on the same PC
	// 	if (GameConfig.getOpponent == 'PERSON') {
	// 		p1_spd = this.paddleLogic.playerPaddleControl(paddle1);
	// 		p2_spd = this.paddleLogic.playerPaddleControl(paddle2);
	// 	}

	// 	//	Played by one peson and one AI
	// 	if (GameConfig.getOpponent == 'AI') {
	// 		p1_spd = this.paddleLogic.dualPaddleControl(paddle1);
	// 		p2_spd = this.paddleLogic.aiPaddleControl(paddle2);
	// 	}

	// 	// //	Played Remotely against another person
	// 	// if (GameConfig.getOpponent == 'REMOTE')
	// 	// {
	// 	// 	// p1_spd = this.paddleLogic.remotePaddleControl(paddle1);
	// 	// 	// p2_spd = this.paddleLogic.remotePaddleControl(paddle2);
	// 	// 	// p1_spd/p2_spd are continuously broadcasted from the server loop.
	// 	// 	// p1_spd = this.serverStatus.p1_spd;
	// 	// 	// p2_spd = this.serverStatus.p2_spd;
	// 	// }

	// 	//	Move in direction
	// 	paddle1.speed.vspd += (p1_spd - paddle1.speed.vspd) * acc;
	// 	paddle2.speed.vspd += (p2_spd - paddle2.speed.vspd) * acc;
	// 	paddle1.position.z += paddle1.speed.vspd;
	// 	paddle2.position.z += paddle2.speed.vspd;

	// 	//	Clamp left paddle between upper and lower wall
	// 	if (paddle1.position.z < (bottomWall.position.z + paddleSize / 2))
	// 		paddle1.position.z = bottomWall.position.z + paddleSize / 2;
	// 	else if (paddle1.position.z > (upperWall.position.z - paddleSize / 2))
	// 		paddle1.position.z = upperWall.position.z - paddleSize / 2;

	// 	//	Clamp right paddle between upper and lower wall
	// 	if (paddle2.position.z < (bottomWall.position.z + paddleSize / 2))
	// 		paddle2.position.z = bottomWall.position.z + paddleSize / 2;
	// 	else if (paddle2.position.z > upperWall.position.z - paddleSize / 2)
	// 		paddle2.position.z = upperWall.position.z - paddleSize / 2;
	// }





	// public updateBall(real_mode: boolean): void {
	// 	const ball = this.scene.ball;
	// 	const paddle1 = this.scene.paddle1;
	// 	const paddle2 = this.scene.paddle2;
	// 	const paddleSize = GameConfig.paddleSize;

	// 	//	Update ball position based on speed attribute
	// 	ball.position.x = Math.max(-this.conf.FIELD_WIDTH, Math.min(this.conf.FIELD_WIDTH, ball.position.x));
	// 	ball.position.z = Math.max(-this.conf.FIELD_HEIGHT, Math.min(this.conf.FIELD_HEIGHT, ball.position.z));
	// 	ball.speed.hspd = Math.max(-1.25, Math.min(1.25, ball.speed.hspd));
	// 	ball.speed.vspd = Math.max(-1.25, Math.min(1.25, ball.speed.vspd));
	// 	ball.position.x += ball.speed.hspd;
	// 	ball.position.z += ball.speed.vspd;

	// 	//	Collision with left paddle
	// 	if (ball.position.x <= (paddle1.position.x - ball.speed.hspd)) {
	// 		if (!real_mode)
	// 			return;

	// 		//	Goal
	// 		if (ball.position.z - 1 > (paddle1.position.z + paddleSize / 2)
	// 			|| ball.position.z + 1 < (paddle1.position.z - paddleSize / 2)) {
	// 			this.resetBall();
	// 			this.gameStatus.scoreR++;
	// 		}
	// 		else	//	Block
	// 		{
	// 			ball.speed.hspd *= -1.01;
	// 			this.screenshake(ball.speed.hspd);
	// 		}
	// 	}

	// 	//	Collision with right paddle
	// 	if (ball.position.x >= (paddle2.position.x - ball.speed.hspd)) {
	// 		if (!real_mode)
	// 			return;

	// 		//	Goal
	// 		if (ball.position.z - 1 > (paddle2.position.z + paddleSize / 2)
	// 			|| ball.position.z + 1 < (paddle2.position.z - paddleSize / 2)) {
	// 			if (!real_mode)
	// 				return;
	// 			this.resetBall();
	// 			this.gameStatus.scoreL++;
	// 		}
	// 		else	//	Block
	// 		{
	// 			ball.speed.hspd *= -1.01;
	// 			this.screenshake(ball.speed.hspd);
	// 		}
	// 	}

	// 	//	Bounce off upper and bottom wall (reverse vertical speed)
	// 	if ((ball.position.z > (this.scene.upperWall.position.z - ball.speed.vspd - 1) && ball.speed.vspd > 0)
	// 		|| (ball.position.z < (this.scene.bottomWall.position.z - ball.speed.vspd + 1) && ball.speed.vspd < 0)) {
	// 		if (real_mode)
	// 			this.screenshake(ball.speed.vspd);
	// 		ball.speed.vspd *= -1;
	// 		//	Additional offset to avoid wall-clipping
	// 		ball.position.z += ball.speed.vspd;
	// 	}
	// }

	// private resetBall(): void {
	// 	const ball = this.scene.ball;

	// 	//	Reset Ball position to origin
	// 	ball.position.x = 0;
	// 	ball.position.z = 0;

	// 	//	Randomize direction for next serve
	// 	ball.speed.hspd *= Math.random() < 0.5 ? 1 : -1;
	// 	ball.speed.vspd *= Math.random() < 0.5 ? 1 : -1;

	// 	//	Pause game after score
	// 	// this.gameStatus.playing = false;
	// }
