import { Speed, GameSettings } from "../interfaces/GameInterfaces.js";

export class GameConfig {
	public static readonly	FIELD_WIDTH = 100;
	public static readonly	FIELD_HEIGHT = 40;
	public static readonly	PADDLE_RATIO = 1/6;
	public static readonly	PADDLE_ACC = 0.2;

	private static settings: GameSettings = {
		ai_difficulty:	'HARD',
		opponent:		'AI'
	};

	public static get ballSpeed() : Speed {
		const base = { hspd: (Math.random() < 0.5 ? this.FIELD_WIDTH : -this.FIELD_WIDTH) / 150,
			vspd: (Math.random() < 0.5 ? this.FIELD_HEIGHT : -this.FIELD_HEIGHT) / 150};
		return { hspd: base.hspd, vspd: base.vspd };
	}

	public static get paddleSize() : number {
		return (this.FIELD_HEIGHT * this.PADDLE_RATIO);
	}
	
	public static get paddleSpeed() : number {
		return (this.FIELD_HEIGHT / 100);
	}

	public static setAiDifficulty(difficulty: 'EASY' | 'MEDIUM' | 'HARD') {
		this.settings.ai_difficulty = difficulty;
	}
	
	public static get getAiDifficulty() {
		return (this.settings.ai_difficulty);
	}

	public static setOpponent(opponent: 'PERSON' | 'REMOTE' | 'AI') {
		this.settings.opponent = opponent;
	}
	
	public static get getOpponent() {
		return (this.settings.opponent);
	}
}