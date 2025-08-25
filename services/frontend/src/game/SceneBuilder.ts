import { GameScene , BallMesh, PaddleMesh } from "../interfaces/GameInterfaces.js";
import { GameConfig } from "./GameConfig.js";
//	import * as BABYLON from 'babylonjs';

export class SceneBuilder {
	private canvas:	HTMLCanvasElement;
	private engine:	BABYLON.Engine;

	constructor(canvasId: string) {
		const canvasElement = document.getElementById(canvasId) as HTMLCanvasElement;
		if (!canvasElement || !(canvasElement instanceof HTMLCanvasElement)) {
			console.error(`Canvas element '${canvasId}' not found or invalid`);
			this.canvas = document.createElement('canvas'); //fallback canvas
			document.body.appendChild(this.canvas);
		} else
			this.canvas = canvasElement;
		this.engine = new BABYLON.Engine(this.canvas, true);
	}

	public createScene() : GameScene {
		const scene = new BABYLON.Scene(this.engine) as GameScene;
		
		this.setUpLights(scene);
		this.setUpCamera(scene);
		this.createGameObjects(scene);
		this.setUpMaterials(scene);
		this.positionObjects(scene);
		return (scene);
	}

	public getEngine() : BABYLON.Engine {
		return (this.engine);
	}

	private setUpLights(scene: GameScene) : void{
		scene.createDefaultLight();
		scene.defaultLight = scene.lights[scene.lights.length - 1];
	}

	private setUpCamera(scene: GameScene) : void {
		
		//	Store initial camera values
		const alpha = -Math.PI/2;
		const beta = Math.PI/5;
		const radius = Math.max(GameConfig.FIELD_WIDTH, GameConfig.FIELD_HEIGHT) * 0.85;

		//	Create default camera
		scene.camera = new BABYLON.ArcRotateCamera("camera", alpha, beta, radius, BABYLON.Vector3.Zero(), scene);

		//	Save values to camera
		(scene.camera as any).og_alpha = alpha;
		(scene.camera as any).og_beta = beta;
		(scene.camera as any).og_radius = radius;

		//	Move the camera using mouse. Maybe for cool battle intro? (Disabled manual movement)
		//scene.camera.attachControl(this.canvas, true);
	}
	
	private createGameObjects(scene: GameScene) : void {
		const paddleSize = GameConfig.paddleSize;

		//	Ground
		scene.ground = BABYLON.MeshBuilder.CreateGround("ground", {
			width:	GameConfig.FIELD_WIDTH,
			height:	GameConfig.FIELD_HEIGHT
		}, scene);

		//	Score display
		const groundMaterial = new BABYLON.StandardMaterial("groundMaterial", scene);
		const dynamicTexture = new BABYLON.DynamicTexture("score", {width: 1024, height: 512}, scene);
		groundMaterial.diffuseTexture = dynamicTexture;
		dynamicTexture.drawText("0    0", null, 120, "bold 100px Segoe UI, monospace", "white", "#002D2D", true, true);
		scene.ground.material = groundMaterial;
		scene.scores = dynamicTexture;

		//	Midline
		const midlinePoints = [
			new BABYLON.Vector3(0, 0.1, -GameConfig.FIELD_HEIGHT / 2),
			new BABYLON.Vector3(0, 0.1, GameConfig.FIELD_HEIGHT / 2)
		];
		
		scene.midline = BABYLON.MeshBuilder.CreateDashedLines("midline", {
			points: midlinePoints,
			dashSize: 1,
			gapSize: 1,
			dashNb: 24
		}, scene);

		//	Ball
		const ballMesh = BABYLON.MeshBuilder.CreateBox("ball", {
			height : 1,
			width : 1,
			depth : 1,
		}, scene);
		scene.ball = Object.assign(ballMesh, {
			speed: GameConfig.ballSpeed,
			spd_damp: 0
		}) as BallMesh;

		// Left Paddle
		const paddle1Mesh = BABYLON.MeshBuilder.CreateBox("paddle1", {
			height: 1,
			width: 1,
			depth: paddleSize,
		}, scene);
		scene.paddle1 = Object.assign(paddle1Mesh, {
			speed: { hspd: 0, vspd: 0 }, // Unique speed object for paddle1
		}) as PaddleMesh;
	
		// Right Paddle
		const paddle2Mesh = BABYLON.MeshBuilder.CreateBox("paddle2", {
			height: 1,
			width: 1,
			depth: paddleSize,
		}, scene);
		scene.paddle2 = Object.assign(paddle2Mesh, {
			speed: { hspd: 0, vspd: 0 }, // Unique speed object for paddle2
		}) as PaddleMesh;

		//	Left Wall
		scene.leftWall = BABYLON.MeshBuilder.CreateBox("leftWall", {
			height : 1,
			width : 1,
			depth : GameConfig.FIELD_HEIGHT,
		}, scene)

		//	Right Wall
		scene.rightWall = BABYLON.MeshBuilder.CreateBox("rightWall", {
			height : 1,
			width : 1,
			depth : GameConfig.FIELD_HEIGHT,
		}, scene)

		//	Upper Wall
		scene.upperWall = BABYLON.MeshBuilder.CreateBox("upperWall", {
			height : 1,
			width : GameConfig.FIELD_WIDTH,
			depth : 1,
		}, scene)

		//	Bottom Wall
		scene.bottomWall = BABYLON.MeshBuilder.CreateBox("bottomWall", {
			height : 1,
			width : GameConfig.FIELD_WIDTH,
			depth : 1,
		}, scene)
	}

	//	Materials (As of now there is only one (cyan-esk color))
	private setUpMaterials(scene : GameScene) : void {
		const mainMaterial = new BABYLON.StandardMaterial("mainMaterial", scene);
		mainMaterial.diffuseColor = new BABYLON.Color3(0.62, 0.85, 0.8);

		scene.ball.material = mainMaterial;
		scene.paddle1.material = mainMaterial;
		scene.paddle2.material = mainMaterial;
		scene.leftWall.material = mainMaterial;
		scene.rightWall.material = mainMaterial;
		scene.upperWall.material = mainMaterial;
		scene.bottomWall.material = mainMaterial;
	}

	//	Set origin for all Scene objects
	private positionObjects(scene : GameScene) : void {
		//	Positions as vector3 (x, y, z) / (width, height, depth)
		scene.ball.position = new BABYLON.Vector3(0, 0.5, 0);
		scene.paddle1.position = new BABYLON.Vector3(-GameConfig.FIELD_WIDTH / 2 + 5, 0.5, 0);
		scene.paddle2.position = new BABYLON.Vector3(GameConfig.FIELD_WIDTH / 2 - 5, 0.5, 0);
		scene.leftWall.position = new BABYLON.Vector3(-GameConfig.FIELD_WIDTH / 2, 0.5, 0);
		scene.rightWall.position = new BABYLON.Vector3(GameConfig.FIELD_WIDTH / 2, 0.5, 0);
		scene.upperWall.position = new BABYLON.Vector3(0, 0.5, GameConfig.FIELD_HEIGHT / 2);
		scene.bottomWall.position = new BABYLON.Vector3(0, 0.5, -GameConfig.FIELD_HEIGHT / 2);
	}
}