import { GameSettings } from "../interfaces/GameInterfaces.js";

export class Settings {

	private static settings: GameSettings = {
		ai_difficulty:	'HARD',
		opponent:		'REMOTE'
	};

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