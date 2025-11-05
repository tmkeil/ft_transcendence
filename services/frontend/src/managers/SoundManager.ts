import pong_p1 from "../sound/pong_p1.mp3";
import pong_p2 from "../sound/pong_p2.mp3";
import ball_scored from "../sound/ball_scored.mp3";
import theme from "../sound/Transcendence_Theme.mp3";
import bounce from "../sound/bounce.mp3";
import player_win from "../sound/player_win.mp3";
import player_loss from "../sound/player_loss.mp3";

export class SoundManager {
    private sounds: { [key: string]: HTMLAudioElement } = {};
    private musicVolume: number = 0.25;
    private sfxVolume: number = 1.0;

    constructor() {
        this.sounds['pong_p1'] = new Audio(pong_p1);
        this.sounds['pong_p2'] = new Audio(pong_p2);
        this.sounds['ball_scored'] = new Audio(ball_scored);
        this.sounds['bounce'] = new Audio(bounce);
        this.sounds['player_win'] = new Audio(player_win);
        this.sounds['player_loss'] = new Audio(player_loss);
        this.sounds['theme'] = new Audio(theme);
        this.sounds['theme'].loop = true;
        this.sounds['theme'].volume = this.musicVolume;
    }

    setMusicVolume(volume: number) {
        this.musicVolume = volume;
        this.sounds['theme'].volume = volume;
    }

    setSFXVolume(volume: number) {
        this.sfxVolume = volume;
        // Update all SFX volumes except theme
        Object.entries(this.sounds).forEach(([key, sound]) => {
            if (key !== 'theme') {
                sound.volume = volume;
            }
        });
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
