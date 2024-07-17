import Matter2Pixi, { PixiToMatterObjMap } from '@/utils/matter2pixi';
import Random from '@/utils/random';
import { Body, Bodies, Composite, Composites, Constraint, Engine, Vector, Vertices, Vertex } from 'matter-js';
import { Application, Graphics, VideoSource } from 'pixi.js';
import { Animal } from './animal';
import Interpolate from '@/utils/interpolate';


export class Jellyfish extends Animal {
	jellyfishComposite: Composite;
	jellyfishGraphics: PixiToMatterObjMap;

	jellyfishTentacles: Composite[];
	jellyfishArms: Composite[];
	jellyfishHeadSegments: Composite;

	private pixiApp?: Application;

	private headTop: Body;
	private headBottom: Body;
	private headTopMass: number;
	private headBottomMass: number;
	private elapsedMS = 0;
	private runBehavior: boolean = true;
	private fakeHeadGraphic!: Graphics;
	private fakeHeadBody: Body;

	private static headFriction = 0.01;
	private static headOpacity = 1;
	private static headNumSegments = 15;
	private static headHeightToWidthRatio = 0.7;
	private static headStiffness = 0.02;
	private static headRoundedFactor = 0.5;

	private static constraintStiffness = 0.4;
	private static constraintLength = 0;

	private static tentacleBaseNum = 10;
	private static tentacleSegmentHeight = 10;
	private static tentacleSegmentWidthToWidthRatio = 0.02;
	private static tentacleSectionToWidthRatio = 0.70;
	private static tentacleFriction = 0.015;
	private static tentacleOpacity = 0.7;

	private static armBaseNum = 4;
	private static armBaseWidthToWidthRatio = 0.07;
	private static armSpaceBetweenToWidthRatio = 0.04;
	private static armFriction = 0.02;
	private static armOpacity = 0.75;
	private static armToTentacleLengthRatio = 0.6;

	private static swimIntervalMS = 4000;
	private static swimCompressDuration = 500;
	private static swimForceDuration = 500;

	constructor(cx: number, cy: number, width: number, tentacleLen: number, color: string, group: number) {
		super();
		this.jellyfishComposite = Composite.create();

		// INFO: INITIALIZE HEAD SEGMENTS
		const headHeight = width * Jellyfish.headHeightToWidthRatio;
		this.jellyfishHeadSegments = Composite.create();
		let headSegmentHeight = headHeight / Jellyfish.headNumSegments;
		function headSegmentFunction(x: number) {
			if (x > 0) return (-(x ** 2) + width ** 2) ** 0.5;
			else return ((-(x ** 2) + (width * Jellyfish.headRoundedFactor) ** 2) ** 0.5) + width / 2;
		}
		for (let i = 0; i < Jellyfish.headNumSegments; i++) {
			const segWidth = Interpolate.map(headSegmentFunction, i, 0, Jellyfish.headNumSegments, -width * Jellyfish.headRoundedFactor, width);
			let headPiece = Bodies.rectangle(
				cx,
				cy - (i - (Jellyfish.headNumSegments - 1) / 2) * headSegmentHeight,
				segWidth,
				headSegmentHeight,
				<any>{
					collisionFilter: { group: group },
					frictionAir: Jellyfish.headFriction,
					render: {
						fillStyle: color,
						opacity: Jellyfish.headOpacity
					},
					label: "Jellyfish",
					// NOTE: store extra fields for my use
					width: segWidth,
					height: headSegmentHeight,
				}
			)
			Composite.add(this.jellyfishHeadSegments, headPiece);
		}
		[-0.5, 0.5].forEach((xOffset) => {
			Composites.chain(this.jellyfishHeadSegments, xOffset, -0.5, xOffset, 0.5, {
				stiffness: Jellyfish.headStiffness,
				damping: 1,
				length: 1,
				render: {
					visible: false
				}
			})
		})
		Composite.add(this.jellyfishComposite, this.jellyfishHeadSegments);
		// NOTE: used for behavior
		this.headTop = this.jellyfishHeadSegments.bodies[this.jellyfishHeadSegments.bodies.length - 1];
		this.headTopMass = this.headTop.mass;
		this.headBottom = this.jellyfishHeadSegments.bodies[0];
		this.headBottomMass = this.headBottom.mass;

		// NOTE: used to attack arms and find bind center
		let headArmSegment = this.jellyfishHeadSegments.bodies[Jellyfish.headNumSegments - 1];
		let headTentacleSegment = this.jellyfishHeadSegments.bodies[1];

		// INFO: INITIALIZE TENTACLES
		const numTentacles = Jellyfish.tentacleBaseNum + Random.getRandomInt(-2, 2);
		const tentacleNumSegments = tentacleLen / Jellyfish.tentacleSegmentHeight;
		const tentacleSegmentWidth = width * Jellyfish.tentacleSegmentWidthToWidthRatio;
		const tentacleSpaceBetween = width * Jellyfish.tentacleSectionToWidthRatio / numTentacles;
		this.jellyfishTentacles = [];
		const tentacleRelY = headSegmentHeight * 0.45
		for (let i = 0; i < numTentacles; i++) {
			const tentacleRelX = tentacleSpaceBetween * (i - (numTentacles - 1) / 2);
			let tentacleSegments = tentacleNumSegments - Random.getRandomInt(0, tentacleNumSegments / 3);

			let tentacle = Composites.stack(
				headTentacleSegment.position.x + tentacleRelX,
				headTentacleSegment.position.y + tentacleRelY,
				1,
				tentacleSegments,
				Jellyfish.tentacleSegmentHeight,
				0,
				(x: number, y: number) => {
					let segment = Bodies.rectangle(x, y, tentacleSegmentWidth, Jellyfish.tentacleSegmentHeight, {
						collisionFilter: { group: group },
						frictionAir: Jellyfish.tentacleFriction,
						render: {
							fillStyle: color,
							opacity: Jellyfish.tentacleOpacity
						},
						label: "Jellyfish"
					});
					return segment;
				}
			);
			this.jellyfishTentacles.push(tentacle);
			Composite.add(this.jellyfishComposite, tentacle);

			[-0.2, 0.2].forEach((xOffset) => {
				Composites.chain(tentacle, xOffset, 0.5, xOffset, -0.5, {
					stiffness: Jellyfish.constraintStiffness,
					length: Jellyfish.constraintLength,
					render: {
						visible: false
					}
				});
				Composite.add(this.jellyfishComposite, Constraint.create({
					bodyA: headTentacleSegment,
					bodyB: tentacle.bodies[0],
					pointA: { x: tentacleRelX, y: tentacleRelY },
					pointB: { x: xOffset * tentacleSegmentWidth, y: -Jellyfish.tentacleSegmentHeight / 2 },
					stiffness: Jellyfish.constraintStiffness,
					length: Jellyfish.constraintLength,
					render: {
						visible: false
					}
				}));
			});
		}

		// INFO: INITIALIZE ARMS
		const numArms = Jellyfish.armBaseNum + Random.getRandomInt(-1, 1);
		const armCircleWidth = width * Jellyfish.armBaseWidthToWidthRatio;
		const armSpaceBetween = width * Jellyfish.armSpaceBetweenToWidthRatio;
		const armRelY = headSegmentHeight * 0.5;
		this.jellyfishArms = [];
		function armCirleRadiusFunc(x: number) {
			return armCircleWidth * (-(x ** 2) + 1);
		}
		for (let i = 0; i < numArms; i++) {
			let ind = 0;
			const armSegments = tentacleLen / armCircleWidth * Jellyfish.armToTentacleLengthRatio + Random.getRandomInt(-5, 5);
			const armRelX = armSpaceBetween * (i - (numArms - 1) / 2);
			let arm = Composites.stack(
				headArmSegment.position.x + armRelX,
				headArmSegment.position.y + armRelY,
				1,
				armSegments,
				0,
				0,
				(x: number, y: number) => {
					const circleRadius = Interpolate.map(armCirleRadiusFunc, ind, 0, armSegments, 0, 1);
					let segment = Bodies.circle(x - circleRadius, y, circleRadius, {
						collisionFilter: { group: group },
						frictionAir: Jellyfish.armFriction,
						render: {
							fillStyle: color,
							opacity: Jellyfish.armOpacity
						},
						label: "Jellyfish"
					});
					ind++;
					return segment;
				}
			);
			Composites.chain(arm, 0, 0.5, 0, -0.5, {
				stiffness: Jellyfish.constraintStiffness,
				length: Jellyfish.constraintLength,
				render: {
					visible: false
				}
			});
			this.jellyfishArms.push(arm)
			Composite.add(this.jellyfishComposite, arm);

			[-0.5, 0.5].forEach((xOffset) => {
				Composite.add(this.jellyfishComposite, Constraint.create({
					bodyA: headArmSegment,
					bodyB: arm.bodies[0],
					pointA: { x: armRelX, y: armRelY },
					pointB: { x: xOffset * armCircleWidth, y: -armCircleWidth / 2 },
					stiffness: 1,
					length: armCircleWidth / 2,
					render: {
						visible: false
					}
				}))
			})
		}

		this.jellyfishGraphics = new Map<Graphics, Body>();
		this.jellyfishTentacles.forEach((tentacle) => {
			Matter2Pixi.compositeToGraphics(tentacle, this.jellyfishGraphics);
		});
		this.jellyfishArms.forEach((arm) => {
			Matter2Pixi.compositeToGraphics(arm, this.jellyfishGraphics);
		});

		// NOTE: add new head
		this.fakeHeadBody = Body.create({
			collisionFilter: { group: group },
			render: {
				fillStyle: color,
				opacity: Jellyfish.headOpacity
			}
		})
	}

	private updateFakeHeadBodyAndGraphic(pixiApp: Application) {
		// NOTE: remove old graphic
		pixiApp.stage.removeChild(this.fakeHeadGraphic);

		// NOTE: build new graphic
		const headPoints: Vector[] = [];
		Composite.allBodies(this.jellyfishHeadSegments).forEach((body) => {
			body.vertices.forEach(point => { headPoints.push(point) });
		});
		const headHull = Vertices.hull(<Vertex[]>headPoints);
		Body.setVertices(this.fakeHeadBody, headHull);

		this.fakeHeadGraphic = Matter2Pixi.bodyToGraphics(this.fakeHeadBody);

		// NOTE: add new graphic
		pixiApp.stage.addChild(this.fakeHeadGraphic);

		// NOTE: set graphic positioning
		const center = Vertices.centre(headHull);
		this.fakeHeadGraphic.x = center.x;
		this.fakeHeadGraphic.y = center.y;
		this.fakeHeadGraphic.alpha = Jellyfish.headOpacity;
	}

	override init(engine: Engine, pixiApp: Application) {
		this.pixiApp = pixiApp;
		Composite.add(engine.world, this.jellyfishComposite);
		this.jellyfishGraphics.forEach((_, graphic) => {
			pixiApp.stage.addChild(graphic);
		})
		this.updateFakeHeadBodyAndGraphic(pixiApp);
	}

	override update(elapsedMS: number) {
		this.elapsedMS += elapsedMS;
		this.jellyfishGraphics.forEach((body, graphic) => {
			graphic.x = body.position.x;
			graphic.y = body.position.y;
			graphic.rotation = body.angle;
		})
		this.updateFakeHeadBodyAndGraphic(this.pixiApp!);
		this.behavior();
	}

	stopBehavior() {
		this.runBehavior = false;
		Body.setMass(this.headTop, this.headTopMass);
		Body.setMass(this.headBottom, this.headBottomMass);
	}

	startBehavior() {
		this.runBehavior = true;
	}

	private behavior() {
		if (!this.runBehavior) return;
		if (this.elapsedMS % Jellyfish.swimIntervalMS < Jellyfish.swimCompressDuration) {
			Body.setMass(this.headTop, this.headTopMass * 100);
			Body.setMass(this.headBottom, this.headBottomMass);
			let velocity = Vector.rotate({ x: 0, y: -Random.uniform(1, 2) }, this.headTop.angle);
			Body.setVelocity(this.headBottom, velocity);
		} else if (this.elapsedMS % Jellyfish.swimIntervalMS < Jellyfish.swimForceDuration + Jellyfish.swimCompressDuration) {
			Body.setMass(this.headTop, this.headTopMass);
			Body.setMass(this.headBottom, this.headBottomMass * 100);
		}
	}
}
