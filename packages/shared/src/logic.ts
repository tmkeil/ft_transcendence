import { Derived } from './config.js';

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

export function movePaddles(tempState: TmpState, inputs: { left: number; right: number }, conf: Readonly<Derived>): void {
	// console.log("Moving paddles with inputs:", inputs);
    const paddleSize = conf.paddleSize;
	const paddleSpeed = conf.paddleSpeed;
	const paddle_acc = conf.PADDLE_ACC;
	const FIELD_HEIGHT = conf.FIELD_HEIGHT;

	const target_p1_spd = inputs.left * paddleSpeed;
	const target_p2_spd = inputs.right * paddleSpeed;

    // Move paddles based on inputs and lerp to smooth the movement by accelerating towards the target speed
	tempState.p1_spd += (target_p1_spd - tempState.p1_spd) * paddle_acc;
	tempState.p2_spd += (target_p2_spd - tempState.p2_spd) * paddle_acc;
    tempState.p1Y += tempState.p1_spd;
	tempState.p2Y += tempState.p2_spd;

    // Clamp paddles within walls
    tempState.p1Y = Math.max(-FIELD_HEIGHT / 2 + paddleSize / 2,
    	Math.min(FIELD_HEIGHT / 2 - paddleSize / 2, tempState.p1Y));
    tempState.p2Y = Math.max(-FIELD_HEIGHT / 2 + paddleSize / 2,
    	Math.min(FIELD_HEIGHT / 2 - paddleSize / 2, tempState.p2Y));
}

export function moveBall(tempState: TmpState, ballV: { hspd: number; vspd: number }, conf: Readonly<Derived>, realMode: boolean): void {
	const FIELD_WIDTH = conf.FIELD_WIDTH;
	const FIELD_HEIGHT = conf.FIELD_HEIGHT;

	// Update ball position
	tempState.ballX += ballV.hspd;
	tempState.ballY += ballV.vspd;

	// Clamp ball position within walls
	tempState.ballX = Math.max(-FIELD_WIDTH / 2, Math.min(FIELD_WIDTH / 2, tempState.ballX));
	tempState.ballY = Math.max(-FIELD_HEIGHT / 2, Math.min(FIELD_HEIGHT / 2, tempState.ballY));

	// Collision with left paddle
	if (tempState.ballX <= 4 - FIELD_WIDTH / 2) {
		// Goal for player 2
		if (tempState.ballY < tempState.p1Y - conf.paddleSize / 2 ||
			tempState.ballY > tempState.p1Y + conf.paddleSize / 2) {
			tempState.scoreR += 1;
			tempState.ballX = 0;
			tempState.ballY = 0;
			const v = resetBall();
			ballV.hspd = v.hspd;
			ballV.vspd = v.vspd;
		}
		else {
			// Hit the paddle, reflect the ball
			const yhit = (tempState.ballY - tempState.p1Y) / (conf.paddleSize / 2);
			ballV.vspd += yhit * 0.5;
			// Limit vertical speed
			const maxVSpd = Math.abs(ballV.hspd) * 0.75;
			ballV.vspd = Math.max(-maxVSpd, Math.min(maxVSpd, ballV.vspd));
			// Reflect and increase horizontal speed
			ballV.hspd *= -1.1;
			// Limit horizontal speed
			const maxHSpd = 0.9;
			ballV.hspd = Math.max(-maxHSpd, Math.min(maxHSpd, ballV.hspd));
		}
	}
	// Collision with right paddle
	else if (tempState.ballX >= FIELD_WIDTH / 2 - 4) {
		// Goal for player 1
		if (tempState.ballY < tempState.p2Y - conf.paddleSize / 2 ||
			tempState.ballY > tempState.p2Y + conf.paddleSize / 2) {
			tempState.scoreL += 1;
			tempState.ballX = 0;
			tempState.ballY = 0;
			const v = resetBall();
			ballV.hspd = v.hspd;
			ballV.vspd = v.vspd;
		}
		else {
			// Hit the paddle, reflect the ball
			const yhit = (tempState.ballY - tempState.p2Y) / (conf.paddleSize / 2);
			ballV.vspd += yhit * 0.5;
			// Limit vertical speed
			const maxVSpd = Math.abs(ballV.hspd) * 0.75;
			ballV.vspd = Math.max(-maxVSpd, Math.min(maxVSpd, ballV.vspd));
			// Reflect and increase horizontal speed
			ballV.hspd *= -1.1;
			// Limit horizontal speed
			const maxHSpd = 0.9;
			ballV.hspd = Math.max(-maxHSpd, Math.min(maxHSpd, ballV.hspd));			
		}
	}
	// Collision with top and bottom wall
	if (tempState.ballY <= -FIELD_HEIGHT / 2 || tempState.ballY >= FIELD_HEIGHT / 2) {
		ballV.vspd *= -1;
	}
	console.log("Ball after move:", tempState.ballX, tempState.ballY);
}

  // Reset the ball velocity to a random horizontal direction and a randomized angle between +45 and -45 on the x-axis
  // The total speed is constant ~0.3
  export function resetBall() {
    const s = 0.3;
    const angle = (Math.random() * (Math.PI / 2)) - (Math.PI / 4);
    const dir = Math.random() < 0.5 ? -1 : 1;

    const hspd = Math.cos(angle) * s * dir;
    const vspd = Math.sin(angle) * s;

    return { hspd, vspd };
  }