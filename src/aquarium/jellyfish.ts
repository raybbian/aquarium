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

	// NOTE: for pixi graphics that change shape
	private pixiApp?: Application;
	private fakeHead?: Graphics;

	// NOTE: for behavior
	private head: Body;
	private headEdgePieces: (Body | null)[];
	private elapsedMS = 0;
	private runBehavior: boolean = true;

	// NOTE: tentacle information
	private width: number;
	private numTentacles: number;

	private static HEAD_FRICTION = 0.01;
	private static HEAD_OPACITY = 0.85;
	private static HEAD_NUM_SEGMENTS = 10;
	private static HEAD_SEGMENT_H_TO_WIDTH = 0.1;
	private static HEAD_CENTER_W_TO_WIDTH = 0.2;
	private static HEAD_RIM_OUTER_STIFFNESS = 0.9;
	private static HEAD_RIM_INNER_STIFFNESS = 0.1;
	private static HEAD_RIM_OUTER_DAMPING = 1;
	private static HEAD_RIM_INNER_DAMPING = 1;
	private static HEAD_RIM_CONSTRAINT_LEN = 0;
	private static HEAD_TRAPEZOID_SLOPE = 0.1;

	private static constraintStiffness = 0.4;
	private static constraintLength = 0;

	private static TENTACLE_BASE_NUM = 10;
	private static TENTACLE_SEGMENT_H = 10;
	private static TENTACLE_SEGMENT_W_TO_WIDTH = 0.01;
	private static TENTACLE_FRICTION = 0.015;
	private static TENTACLE_OPACITY = 0.7;

	private static ARM_BASE_NUM = 4;
	private static ARM_BASE_W_TO_WIDTH = 0.07;
	private static ARM_GAP_TO_WIDTH = 0.05;
	private static ARM_FRICTION = 0.02;
	private static ARM_OPACITY = 0.75;
	private static ARM_TO_TENTACLE_LENGTH = 0.6;

	private static SWIM_INTERVAL_MS = 2000;
	private static SWIM_COMPRESS_DURATION = 500;
	private static SWIM_FORCE_DURATION = 400;

	private static CAT_MOUSE = 1 << 0;
	private static CAT_HEAD_CENTER = 1 << 1;
	private static CAT_HEAD_EDGE = 1 << 2;
	private static CAT_ARM = 1 << 4;
	private static CAT_TENTACLE = 1 << 5;

	constructor(cx: number, cy: number, width: number, tentacleLen: number, color: string, group: number) {
		super();
		this.width = width;

		this.jellyfishComposite = Composite.create();

		this.jellyfishHeadSegments = Composite.create();
		// NOTE: build center
		const headSegmentHeight = width * Jellyfish.HEAD_SEGMENT_H_TO_WIDTH;
		const headCenterWidth = width * Jellyfish.HEAD_CENTER_W_TO_WIDTH;
		const headSegmentWidth = (width - headCenterWidth) / Jellyfish.HEAD_NUM_SEGMENTS - 2 * Jellyfish.HEAD_TRAPEZOID_SLOPE * headSegmentHeight;
		const trapezoidCornerLocation = 0.5 - (Jellyfish.HEAD_TRAPEZOID_SLOPE * headSegmentHeight) / headSegmentWidth;
		const headCenter = Bodies.rectangle(
			cx,
			cy,
			headCenterWidth,
			headSegmentHeight,
			{
				collisionFilter: {
					group: 0,
					category: Jellyfish.CAT_HEAD_CENTER,
					mask: Jellyfish.CAT_MOUSE
				},
				frictionAir: Jellyfish.HEAD_FRICTION,
				render: {
					fillStyle: color,
					opacity: Jellyfish.HEAD_OPACITY,
				},
				label: "Jellyfish",
			},
		);
		this.head = headCenter;
		Composite.add(this.jellyfishHeadSegments, headCenter);

		// NOTE: build edge
		this.headEdgePieces = Array(2).fill(null);
		[[-1, -(Jellyfish.HEAD_NUM_SEGMENTS + 1) * headSegmentWidth, 0], [1, 0, Jellyfish.HEAD_NUM_SEGMENTS - 1]].forEach(([dir, stOffset, endInd]) => {
			let ind = 0;
			const segments = Composites.stack(
				(cx + headCenterWidth / 2 * dir) + stOffset,
				cy - headSegmentHeight / 2,
				Jellyfish.HEAD_NUM_SEGMENTS, 1, 0, 0,
				(x: number, y: number) => {
					const chamfer = Array(4).fill(0);
					if (ind == endInd) {
						chamfer[(dir + 1)] = headSegmentHeight / 2;
						chamfer[1 + (dir + 1)] = headSegmentHeight / 2;
					}
					const segment = Bodies.trapezoid(
						x, y, headSegmentWidth, headSegmentHeight, -Jellyfish.HEAD_TRAPEZOID_SLOPE,
						{
							collisionFilter: {
								group: 0,
								category: Jellyfish.CAT_HEAD_EDGE,
								mask: Jellyfish.CAT_MOUSE
							},
							frictionAir: Jellyfish.HEAD_FRICTION,
							render: {
								fillStyle: color,
								opacity: Jellyfish.HEAD_OPACITY,
							},
							label: "Jellyfish",
							chamfer: { radius: chamfer }
						}
					);
					ind++;
					return segment;
				}
			);
			this.headEdgePieces[(dir + 1) / 2] = segments.bodies.at(-(dir + 1) / 2)!;
			Composite.add(this.jellyfishHeadSegments, segments);

			[
				[trapezoidCornerLocation, Jellyfish.HEAD_RIM_INNER_STIFFNESS, Jellyfish.HEAD_RIM_INNER_DAMPING, 0.5],
				[0.5, Jellyfish.HEAD_RIM_OUTER_STIFFNESS, Jellyfish.HEAD_RIM_OUTER_DAMPING, -0.5]
			].forEach(([loc, stiffness, damping, yRel]) => {
				Composites.chain(segments, loc, yRel, -loc, yRel, {
					stiffness: stiffness,
					damping: damping,
					length: Jellyfish.HEAD_RIM_CONSTRAINT_LEN,
					render: {
						visible: false
					}
				});
				Composite.add(this.jellyfishHeadSegments, Constraint.create({
					bodyA: headCenter,
					bodyB: segments.bodies.at((dir - 1) / 2),
					pointA: { x: headCenterWidth * 0.5 * dir, y: yRel * headSegmentHeight },
					pointB: { x: headSegmentWidth * loc * -dir, y: yRel * headSegmentHeight },
					stiffness: stiffness,
					damping: damping,
					length: Jellyfish.HEAD_RIM_CONSTRAINT_LEN,
					render: {
						visible: false
					}
				}));
			});

		});
		Composite.add(this.jellyfishComposite, this.jellyfishHeadSegments);

		this.jellyfishTentacles = [];
		this.numTentacles = Jellyfish.TENTACLE_BASE_NUM + Random.getRandomInt(-2, 2);
		const tentacleNumSegments = tentacleLen / Jellyfish.TENTACLE_SEGMENT_H;
		const tentacleSegmentWidth = width * Jellyfish.TENTACLE_SEGMENT_W_TO_WIDTH;
		const tentacleRelY = headSegmentHeight * 0.5;
		for (let i = 0; i < this.numTentacles; i++) {
			const tentacleRelX = 0;
			const tentacleSegments = tentacleNumSegments - Random.getRandomInt(0, tentacleNumSegments / 3);
			const headRimPiece = this.head;

			let ind = 0;
			let tentacle = Composites.stack(
				headRimPiece.position.x + tentacleRelX,
				headRimPiece.position.y + tentacleRelY,
				1,
				tentacleSegments,
				Jellyfish.TENTACLE_SEGMENT_H,
				0,
				(x: number, y: number) => {
					let segment = Bodies.rectangle(x, y, tentacleSegmentWidth, Jellyfish.TENTACLE_SEGMENT_H, {
						collisionFilter: {
							group: 0,
							category: Jellyfish.CAT_TENTACLE,
							mask: 0
						},
						frictionAir: Jellyfish.TENTACLE_FRICTION,
						render: {
							fillStyle: color,
							opacity: Jellyfish.TENTACLE_OPACITY,
							visible: ind != 0,
						},
						label: "Jellyfish"
					});
					ind++
					return segment;
				}
			);
			[-0.2, 0.2].forEach((xOffset) => {
				Composites.chain(tentacle, xOffset, 0.5, xOffset, -0.5, {
					stiffness: Jellyfish.constraintStiffness,
					length: Jellyfish.constraintLength,
					render: {
						visible: false
					}
				});
			});
			this.jellyfishTentacles.push(tentacle);
			Composite.add(this.jellyfishComposite, tentacle);
		}

		// INFO: INITIALIZE ARMS
		const numArms = Jellyfish.ARM_BASE_NUM + Random.getRandomInt(-1, 1);
		const armCircleWidth = width * Jellyfish.ARM_BASE_W_TO_WIDTH;
		const armSpaceBetween = width * Jellyfish.ARM_GAP_TO_WIDTH;
		const armRelY = headSegmentHeight;
		this.jellyfishArms = [];
		function armCirleRadiusFunc(x: number) {
			return armCircleWidth * (-(x ** 2) + 1);
		}
		for (let i = 0; i < numArms; i++) {
			let ind = 0;
			const armSegments = (tentacleLen * Jellyfish.ARM_TO_TENTACLE_LENGTH) / (armCircleWidth * 2 * 0.75) + Random.getRandomInt(-5, 5);
			const armRelX = armSpaceBetween * (i - (numArms - 1) / 2);
			let arm = Composites.stack(
				this.head!.position.x + armRelX,
				this.head!.position.y + armRelY,
				1, armSegments, 0, 0,
				(x: number, y: number) => {
					const circleRadius = Interpolate.map(armCirleRadiusFunc, ind, 0, armSegments, 0, 1);
					let segment = Bodies.circle(x - circleRadius, y, circleRadius, {
						collisionFilter: {
							group: 0,
							category: Jellyfish.CAT_ARM,
							mask: 0
						},
						frictionAir: Jellyfish.ARM_FRICTION,
						render: {
							fillStyle: color,
							opacity: Jellyfish.ARM_OPACITY
						},
						label: "Jellyfish"
					});
					ind++;
					Body.setMass(segment, segment.mass / 5);
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
					bodyA: this.head,
					bodyB: arm.bodies[0],
					pointA: { x: armRelX, y: armRelY },
					pointB: { x: xOffset * armCircleWidth, y: -armCircleWidth / 2 },
					stiffness: Jellyfish.HEAD_RIM_OUTER_STIFFNESS,
					length: armCircleWidth / 2,
					render: {
						visible: false
					}
				}))
			})
		}
		this.jellyfishGraphics = new Map<Graphics, Body>();
		this.jellyfishArms.forEach((arm) => {
			Matter2Pixi.compositeToGraphics(arm, this.jellyfishGraphics);
		});
		this.jellyfishTentacles.forEach((arm) => {
			Matter2Pixi.compositeToGraphics(arm, this.jellyfishGraphics);
		});
		this.updateTentacleAttachments(true);
	}

	private updateFakeHeadGraphic(pixiApp: Application) {
		const headPoints: Vector[] = [];
		Composite.allBodies(this.jellyfishHeadSegments).forEach((body) => {
			body.vertices.forEach(point => { headPoints.push(point) });
		});
		const headHull = Vertices.hull(<Vertex[]>headPoints);

		pixiApp.stage.removeChild(<any>this.fakeHead);
		this.fakeHead = new Graphics();
		this.fakeHead.alpha = Jellyfish.HEAD_OPACITY;
		this.fakeHead.fill(this.head.render.fillStyle);
		this.fakeHead.moveTo(headHull[0].x, headHull[0].y);
		for (let i = 1; i < headHull.length; i++) {
			this.fakeHead.lineTo(headHull[i].x, headHull[i].y);
		}
		this.fakeHead.closePath();
		this.fakeHead.fill();
		pixiApp.stage.addChild(this.fakeHead);
	}

	private updateTentacleAttachments(first: boolean) {
		const left = this.headEdgePieces[0]!.position;
		const right = this.headEdgePieces[1]!.position;
		const base = Vector.sub(right, left);
		for (let i = 0; i < this.numTentacles; i++) {
			const relX = Interpolate.map((x) => x, i, 0, this.numTentacles, 0, 1);
			const position = Vector.add(left, Vector.mult(base, relX));
			const dir = Vector.sub(position, this.jellyfishTentacles[i].bodies[0].position);
			if (!first) {
				Body.setVelocity(this.jellyfishTentacles[i].bodies[0], Vector.mult(dir, 0.5));
			} else {
				Composite.translate(
					this.jellyfishTentacles[i],
					Vector.sub(position, this.jellyfishTentacles[i].bodies[0].position),
					true,
				);
			}
		}
	}

	private behavior() {
		if (!this.runBehavior) return;
		if (this.elapsedMS % Jellyfish.SWIM_INTERVAL_MS < Jellyfish.SWIM_COMPRESS_DURATION) {
			const baseAngle = Vector.sub(this.headEdgePieces[1]!.position, this.headEdgePieces[0]!.position);
			const rightPushAngle = Vector.normalise(Vector.rotate(baseAngle, -Math.PI * 0.1));
			const leftPushAngle = Vector.normalise(Vector.rotate(baseAngle, -Math.PI * 0.9));
			const rightPushForce = Vector.mult(rightPushAngle, 0.00007);
			const leftPushForce = Vector.mult(leftPushAngle, 0.00007);
			Body.applyForce(this.headEdgePieces[0]!, this.headEdgePieces[0]!.position, leftPushForce);
			Body.applyForce(this.headEdgePieces[1]!, this.headEdgePieces[1]!.position, rightPushForce);
		} else if (this.elapsedMS % Jellyfish.SWIM_INTERVAL_MS < Jellyfish.SWIM_FORCE_DURATION + Jellyfish.SWIM_COMPRESS_DURATION) {
			const baseAngle = Vector.sub(this.headEdgePieces[1]!.position, this.headEdgePieces[0]!.position);
			const pushAngle = Vector.normalise(Vector.rotate(baseAngle, -Math.PI * 0.5));
			const pushForce = Vector.mult(pushAngle, 0.0001);
			Body.applyForce(this.head, this.head.position, pushForce);
		}
	}

	override init(engine: Engine, pixiApp: Application) {
		this.pixiApp = pixiApp;
		Composite.add(engine.world, this.jellyfishComposite);
		this.jellyfishGraphics.forEach((_, graphic) => {
			pixiApp.stage.addChild(graphic);
		})
	}

	override update(elapsedMS: number) {
		this.elapsedMS += elapsedMS;
		this.jellyfishGraphics.forEach((body, graphic) => {
			graphic.x = body.position.x;
			graphic.y = body.position.y;
			graphic.rotation = body.angle;
		})
		this.updateFakeHeadGraphic(this.pixiApp!);
		this.updateTentacleAttachments(false);
		this.behavior();
	}

	stopBehavior() {
		this.runBehavior = false;
	}

	startBehavior() {
		this.runBehavior = true;
	}
}
