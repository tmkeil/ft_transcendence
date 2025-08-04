//	import * as BABYLON from 'babylonjs';

//	Game Status
export interface GameStatus {
	p1Score:	number,
	p2Score:	number,
	running:	boolean,
	playing:	boolean
}

//	Speed values
export interface Speed {
	hspd:	number,
	vspd:	number
}

//	Ball Info
export interface BallMesh extends BABYLON.Mesh {
	speed:		Speed;
}

//	Paddle Info
export interface PaddleMesh extends BABYLON.Mesh {
	speed:		Speed;
}

//	Game Settings
export interface GameSettings {
	opponent:		'PERSON' | 'REMOTE' | 'AI';
	ai_difficulty:	'EASY' | 'MEDIUM' | 'HARD';
	player_one_ai:	false | true;
	player_two_ai:	false | true;
}

export interface GameScene extends BABYLON.Scene {
	//	Game objects
	ball:		BallMesh;
	paddle1:	PaddleMesh;
	paddle2:	PaddleMesh;
	upperWall:	BABYLON.Mesh;
	bottomWall:	BABYLON.Mesh;
	scores:		BABYLON.DynamicTexture;

	//	Static scene elements
	ground:		BABYLON.Mesh;
	midline:	BABYLON.Mesh;
	camera:		BABYLON.ArcRotateCamera;

	// Lighting
	defaultLight: BABYLON.Light;
}