import Matter2Pixi, { PixiToMatterObjMap } from '@/utils/matter2pixi';
import Random from '@/utils/random';
import { Body, Bodies, Composite, Composites, Constraint, Engine, Vector, Vertices, Vertex, Mouse } from 'matter-js';
import { Application, ColorSource, Graphics } from 'pixi.js';
import Interpolate from '@/utils/interpolate';
import { SpringValue } from '@react-spring/web';


export class Jellyfish {
	initialized: boolean = false;
	width: number;
	get id() { return this.composite.id }

	private composite: Composite;
	private tentacles: Composite[];
	private arms: Composite[];
	private headSegments: Composite;
	private graphic2BodyMap: PixiToMatterObjMap;

	// NOTE: for hover displays
	headHull?: Vertex[];
	position?: Vector;
	direction?: Vector;
	baseAngle?: Vector;
	private isHovered: boolean = false;
	private opacitySpring: SpringValue;
	private colorSpring: SpringValue;
	onMouseEnter?: (_: Jellyfish) => void;
	onMouseLeave?: (_: Jellyfish) => void;

	// NOTE: fake head doesn't have corresponding body, so need to manage sep
	private fakeHead: Graphics;

	// NOTE: for behavior
	private head: Body;
	private headCenterWidth: number;
	private mass: number;
	private headEdgePieces: (Body | null)[];
	private elapsedMS = 0;
	private runBehavior: boolean = true;
	mouse?: Mouse;
	private swimIntervalModifier = Random.uniform(0.8, 1.2);

	// NOTE: tentacle information
	private numTentacles: number;

	private static CONSTRAINT_STIFFNESS = 0.3;
	private static CONSTRAINT_LENGTH = 0;
	private static OPACITY = 0.5;
	private static HOVER_OPACITY = 0.7;
	private static MAX_TURN_RATIO = 0.65;

	private static HEAD_FRICTION = 0.01;
	private static HEAD_NUM_SEGMENTS = 10;
	private static HEAD_SEGMENT_H_TO_WIDTH = 0.1;
	private static HEAD_CENTER_W_TO_WIDTH = 0.2;
	private static HEAD_RIM_OUTER_STIFFNESS = 0.9;
	private static HEAD_RIM_INNER_STIFFNESS = 0.1;
	private static HEAD_RIM_OUTER_DAMPING = 1;
	private static HEAD_RIM_INNER_DAMPING = 1;
	private static HEAD_RIM_CONSTRAINT_LEN = 0;
	private static HEAD_TRAPEZOID_SLOPE = 0.1;

	private static TENTACLE_BASE_NUM = 10;
	private static TENTACLE_SEGMENT_H = 20;
	private static TENTACLE_SEGMENT_W_TO_WIDTH = 0.01;
	private static TENTACLE_FRICTION = 0.03;

	private static ARM_BASE_NUM = 4;
	private static ARM_BASE_W_TO_WIDTH = 0.07;
	private static ARM_GAP_TO_WIDTH = 0.03;
	private static ARM_FRICTION = 0.02;
	private static ARM_TO_TENTACLE_LENGTH = 0.6;

	private static SWIM_INTERVAL_MS = 4000;
	private static SWIM_COMPRESS_DURATION = 400;
	private static SWIM_DECOMPRESS_DURATION = 300;
	private static SWIM_FORCE_DURATION = 500;

	private static CAT_MOUSE = 1 << 0;
	private static CAT_HEAD_CENTER = 1 << 1;
	private static CAT_HEAD_EDGE = 1 << 2;
	private static CAT_ARM = 1 << 4;
	private static CAT_TENTACLE = 1 << 5;

	constructor(cx: number, cy: number, width: number, tentacleLen: number, color: string) {
		this.width = width;
		this.composite = Composite.create();
		this.headSegments = Composite.create();
		// NOTE: build center
		const headSegmentHeight = width * Jellyfish.HEAD_SEGMENT_H_TO_WIDTH;
		this.headCenterWidth = width * Jellyfish.HEAD_CENTER_W_TO_WIDTH;
		const headSegmentWidth = (width - this.headCenterWidth) / Jellyfish.HEAD_NUM_SEGMENTS - 2 * Jellyfish.HEAD_TRAPEZOID_SLOPE * headSegmentHeight;
		const trapezoidCornerLocation = 0.5 - (Jellyfish.HEAD_TRAPEZOID_SLOPE * headSegmentHeight) / headSegmentWidth;
		const headCenter = Bodies.rectangle(
			cx,
			cy,
			this.headCenterWidth,
			headSegmentHeight,
			{
				collisionFilter: {
					group: 0,
					category: Jellyfish.CAT_HEAD_CENTER,
					mask: Jellyfish.CAT_MOUSE
				},
				frictionAir: Jellyfish.HEAD_FRICTION,
				render: { fillStyle: 'white' },
				label: "Jellyfish",
			},
		);
		this.head = headCenter;
		Composite.add(this.headSegments, headCenter);

		// NOTE: build edge
		this.headEdgePieces = Array(2).fill(null);
		[[-1, -(Jellyfish.HEAD_NUM_SEGMENTS + 1) * headSegmentWidth], [1, 0]].forEach(([dir, stOffset]) => {
			let ind = 0;
			const segments = Composites.stack(
				(cx + this.headCenterWidth / 2 * dir) + stOffset,
				cy - headSegmentHeight / 2,
				Jellyfish.HEAD_NUM_SEGMENTS, 1, 0, 0,
				(x: number, y: number) => {
					const segment = Bodies.trapezoid(
						x, y, headSegmentWidth, headSegmentHeight, -Jellyfish.HEAD_TRAPEZOID_SLOPE,
						{
							collisionFilter: {
								group: 0,
								category: Jellyfish.CAT_HEAD_EDGE,
								mask: Jellyfish.CAT_MOUSE
							},
							frictionAir: Jellyfish.HEAD_FRICTION,
							label: "Jellyfish",
						}
					);
					ind++;
					return segment;
				}
			);
			this.headEdgePieces[(dir + 1) / 2] = segments.bodies.at(-(dir + 1) / 2)!;
			Composite.add(this.headSegments, segments);

			[
				[trapezoidCornerLocation, Jellyfish.HEAD_RIM_INNER_STIFFNESS, Jellyfish.HEAD_RIM_INNER_DAMPING, 0.5],
				[0.5, Jellyfish.HEAD_RIM_OUTER_STIFFNESS, Jellyfish.HEAD_RIM_OUTER_DAMPING, -0.5]
			].forEach(([loc, stiffness, damping, yRel]) => {
				Composites.chain(segments, loc, yRel, -loc, yRel, {
					stiffness: stiffness,
					damping: damping,
					length: Jellyfish.HEAD_RIM_CONSTRAINT_LEN,
					render: { visible: false }
				});
				Composite.add(this.headSegments, Constraint.create({
					bodyA: headCenter,
					bodyB: segments.bodies.at((dir - 1) / 2),
					pointA: { x: this.headCenterWidth * 0.5 * dir, y: yRel * headSegmentHeight },
					pointB: { x: headSegmentWidth * loc * -dir, y: yRel * headSegmentHeight },
					stiffness: stiffness,
					damping: damping,
					length: Jellyfish.HEAD_RIM_CONSTRAINT_LEN,
					render: { visible: false }
				}));
			});

		});
		Composite.add(this.composite, this.headSegments);

		this.tentacles = [];
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
						render: { fillStyle: 'white' },
						label: "Jellyfish",
					});
					ind++
					return segment;
				}
			);
			[-0.2, 0.2].forEach((xOffset) => {
				Composites.chain(tentacle, xOffset, 0.5, xOffset, -0.5, {
					stiffness: Jellyfish.CONSTRAINT_STIFFNESS,
					length: Jellyfish.CONSTRAINT_LENGTH,
					render: { visible: false }
				});
			});
			this.tentacles.push(tentacle);
			Composite.add(this.composite, tentacle);
		}

		// INFO: INITIALIZE ARMS
		const numArms = Jellyfish.ARM_BASE_NUM + Random.getRandomInt(-1, 1);
		const armCircleWidth = width * Jellyfish.ARM_BASE_W_TO_WIDTH;
		const armSpaceBetween = width * Jellyfish.ARM_GAP_TO_WIDTH;
		const armRelY = headSegmentHeight;
		this.arms = [];
		function armCirleRadiusFunc(x: number) {
			return armCircleWidth * (-(x ** 2) + 1);
		}
		for (let i = 0; i < numArms; i++) {
			let ind = 0;
			const yOffset = Random.uniform(0, width * 0.1);
			const armSegments = (tentacleLen * Jellyfish.ARM_TO_TENTACLE_LENGTH) / (armCircleWidth * 2 * 0.75) + Random.getRandomInt(-3, 3);
			const armRelX = armSpaceBetween * (i - (numArms - 1) / 2);
			let arm = Composites.stack(
				this.head!.position.x + armRelX,
				this.head!.position.y + armRelY + yOffset,
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
						label: "Jellyfish",
						render: { fillStyle: 'white' },

					}, 10);
					ind++;
					Body.setMass(segment, segment.mass / 5);
					return segment;
				}
			);
			Composites.chain(arm, 0, 0.5, 0, -0.5, {
				stiffness: Jellyfish.CONSTRAINT_STIFFNESS,
				length: Jellyfish.CONSTRAINT_LENGTH,
				render: { visible: false }
			});
			this.arms.push(arm)
			Composite.add(this.composite, arm);

			[-0.5, 0.5].forEach((xOffset) => {
				Composite.add(this.composite, Constraint.create({
					bodyA: this.head,
					bodyB: arm.bodies[0],
					pointA: { x: armRelX, y: armRelY + yOffset },
					pointB: { x: xOffset * armCircleWidth, y: -armCircleWidth / 2 },
					stiffness: Jellyfish.HEAD_RIM_OUTER_STIFFNESS,
					length: armCircleWidth / 2,
					render: { visible: false }
				}))
			})
		}
		this.graphic2BodyMap = new Map<Graphics, Body>();
		this.arms.forEach((arm) => {
			Matter2Pixi.compositeToGraphics(arm, this.graphic2BodyMap);
		});
		this.tentacles.forEach((arm) => {
			Matter2Pixi.compositeToGraphics(arm, this.graphic2BodyMap);
		});
		this.mass = 0;
		Composite.allBodies(this.composite).forEach((body) => {
			this.mass += body.mass;
		});
		this.baseAngle = Vector.normalise(Vector.sub(this.headEdgePieces[1]!.position, this.headEdgePieces[0]!.position));
		this.direction = Vector.normalise(Vector.perp(this.baseAngle, true));
		this.updateTentacleAttachments(true);
		this.fakeHead = new Graphics();
		this.setOpacity(Jellyfish.OPACITY);
		this.setTint(color);
		this.opacitySpring = new SpringValue(Jellyfish.OPACITY);
		this.colorSpring = new SpringValue(color);
	}

	private updateFakeHeadGraphic() {
		const headPoints: Vector[] = [];
		Composite.allBodies(this.headSegments).forEach((body) => {
			body.vertices.forEach(point => { headPoints.push(point) });
		});
		this.headHull = Vertices.hull(<Vertex[]>headPoints);
		this.position = Vertices.centre(this.headHull);

		this.fakeHead.clear();
		this.fakeHead.fill(0xffffff);
		this.fakeHead.moveTo(this.headHull[0].x, this.headHull[0].y);
		for (let i = 1; i < this.headHull.length; i++) {
			this.fakeHead.lineTo(this.headHull[i].x, this.headHull[i].y);
		}
		this.fakeHead.closePath();
		this.fakeHead.fill();
	}

	private updateTentacleAttachments(first: boolean) {
		const left = this.headEdgePieces[0]!.vertices[1];
		const right = this.headEdgePieces[1]!.vertices[2];
		const totLen = Vector.magnitude(Vector.sub(right, left));
		for (let i = 0; i < this.numTentacles; i++) {
			const relX = Interpolate.map((x) => x, i, 0, this.numTentacles, 0, totLen);
			const position = Vector.add(left, Vector.mult(this.baseAngle!, relX));
			const tentacleBase = this.tentacles[i].bodies[0];
			const tentaclePoint = Vector.mult(Vector.add(tentacleBase.vertices[0], tentacleBase.vertices[1]), 0.5);
			const dir = Vector.sub(position, tentaclePoint);
			if (!first) {
				Body.setVelocity(tentacleBase, Vector.mult(dir, 0.5));
			} else {
				Composite.translate(
					this.tentacles[i],
					Vector.sub(position, tentacleBase.position),
					true,
				);
			}
		}
	}

	private setTint(color: ColorSource) {
		if (this.fakeHead.tint == color) return;
		this.graphic2BodyMap.forEach((_, graphic) => {
			graphic.tint = color;
		});
		if (this.fakeHead)
			this.fakeHead.tint = color;
	}

	private setOpacity(opacity: number) {
		if (this.fakeHead.alpha == opacity) return;
		this.graphic2BodyMap.forEach((_, graphic) => {
			graphic.alpha = opacity;
		});
		if (this.fakeHead)
			this.fakeHead.alpha = opacity;
	}

	private behavior() {
		if (!this.runBehavior) return;
		if (!this.mouse) return;

		if (this.elapsedMS * this.swimIntervalModifier % Jellyfish.SWIM_INTERVAL_MS < Jellyfish.SWIM_COMPRESS_DURATION) {
			const rightPushAngle = Vector.normalise(Vector.rotate(this.direction!, Math.PI * 0.4));
			const leftPushAngle = Vector.normalise(Vector.rotate(this.direction!, Math.PI * -0.4));
			const rightPushF = Vector.mult(rightPushAngle, 0.00003 * this.mass);
			const leftPushF = Vector.mult(leftPushAngle, 0.00003 * this.mass);
			Body.applyForce(this.headEdgePieces[0]!, this.headEdgePieces[0]!.position, leftPushF);
			Body.applyForce(this.headEdgePieces[1]!, this.headEdgePieces[1]!.position, rightPushF);
		} else if (this.elapsedMS * this.swimIntervalModifier % Jellyfish.SWIM_INTERVAL_MS < Jellyfish.SWIM_DECOMPRESS_DURATION + Jellyfish.SWIM_FORCE_DURATION + Jellyfish.SWIM_COMPRESS_DURATION) {
			const pushForce = Vector.mult(this.direction!!, 0.00005 * this.mass);
			const toTarget = Vector.sub(this.mouse!.position, this.position!);

			// NOTE: positive means turn right
			let angleToTarget = Math.atan2(toTarget.y, toTarget.x) - Math.atan2(this.direction!.y, this.direction!.x);
			if (angleToTarget > Math.PI) angleToTarget -= 2 * Math.PI;
			if (angleToTarget < -Math.PI) angleToTarget += 2 * Math.PI;
			angleToTarget = -Math.sign(angleToTarget) * Jellyfish.MAX_TURN_RATIO * this.headCenterWidth;
			const headOffset = Vector.add(this.head.position, Vector.mult(this.baseAngle!, angleToTarget));
			Body.applyForce(this.head, headOffset, pushForce);
		}
	}

	init(engine: Engine, pixiApp: Application, mouse: Mouse) {
		Composite.add(engine.world, this.composite);
		this.graphic2BodyMap.forEach((_, graphic) => {
			pixiApp.stage.addChild(graphic);
		})
		pixiApp.stage.addChild(this.fakeHead);
		this.mouse = mouse;
		this.initialized = true;
	}

	update(elapsedMS: number) {
		this.elapsedMS += elapsedMS;
		this.graphic2BodyMap.forEach((body, graphic) => {
			graphic.x = body.position.x;
			graphic.y = body.position.y;
			graphic.rotation = body.angle;
		})
		this.baseAngle = Vector.normalise(Vector.sub(this.headEdgePieces[1]!.position, this.headEdgePieces[0]!.position));
		this.direction = Vector.normalise(Vector.perp(this.baseAngle, true));
		this.updateFakeHeadGraphic();
		this.updateTentacleAttachments(false);
		this.setOpacity(this.opacitySpring.get());
		this.setTint(this.colorSpring.get());
		this.behavior();
	}

	setHovered() {
		if (this.isHovered) return;
		this.isHovered = true;
		if (this.onMouseEnter) this.onMouseEnter(this);
		this.opacitySpring.stop();
		this.opacitySpring.start(Jellyfish.HOVER_OPACITY);
	}

	setUnhovered() {
		if (!this.isHovered) return;
		this.isHovered = false;
		if (this.onMouseLeave) this.onMouseLeave(this);
		this.opacitySpring.stop();
		this.opacitySpring.start(Jellyfish.OPACITY);
	}

	shiftColor(color: string) {
		this.colorSpring.stop();
		this.colorSpring.start(color);
	}
}
