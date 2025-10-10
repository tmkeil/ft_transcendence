import pong_p1 from "../sound/pong_p1.mp3";
import pong_p2 from "../sound/pong_p2.mp3";
import ball_scored from "../sound/ball_scored.mp3";
import theme from "../sound/Transcendence_Theme.mp3";
import bounce from "../sound/bounce.mp3";

export class SoundManager {
	private sounds: { [key: string]: HTMLAudioElement } = {};

	constructor() {
		this.sounds['pong_p1'] = new Audio(pong_p1);
		this.sounds['pong_p2'] = new Audio(pong_p2);
		this.sounds['ball_scored'] = new Audio(ball_scored);
		this.sounds['bounce'] = new Audio(bounce);
		this.sounds['theme'] = new Audio(theme);
		this.sounds['theme'].loop = true;
		this.sounds['theme'].volume = 0.25;
	}

	play(name: string) {
		if (this.sounds[name]) {
			this.sounds[name].currentTime = 0;
			this.sounds[name].play();
		}
	}

	playTheme() {
		this.sounds['theme'].play();
	}

	stopTheme() {
		this.sounds['theme'].pause();
		this.sounds['theme'].currentTime = 0;
	}
}
