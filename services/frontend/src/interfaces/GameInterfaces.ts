//	import * as BABYLON from 'babylonjs';

//	Game Status

export interface ServerState {
	started: boolean;
	p1Y: number;
	p2Y: number;
	ballX: number;
	ballY: number;
	scoreL: number;
	scoreR: number;
	vx: number;
	vy: number;
}

export interface GameStatus {
	p1Score:	number,
	p2Score:	number,
	running:	boolean,
	playing:	boolean,
}

//	Speed values
export interface Speed {
	hspd:	number,
	vspd:	number
}

//	Ball Info
export interface BallMesh extends BABYLON.Mesh {
	speed:		Speed;
	position:	BABYLON.Vector3;
}

//	Paddle Info
export interface PaddleMesh extends BABYLON.Mesh {
	speed:		Speed;
	position:	BABYLON.Vector3;
}

//	Game Settings
export interface GameSettings {
	opponent:		'PERSON' | 'REMOTE' | 'AI';
	ai_difficulty:	'EASY' | 'MEDIUM' | 'HARD';
}

export interface GameScene extends BABYLON.Scene {
	//	Game objects
	ball:		BallMesh;
	paddle1:	PaddleMesh;
	paddle2:	PaddleMesh;
	leftWall:	BABYLON.Mesh;
	rightWall:	BABYLON.Mesh;
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