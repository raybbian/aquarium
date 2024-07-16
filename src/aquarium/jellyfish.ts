import { Body, Bodies, Composite, Composites, Constraint } from 'matter-js';


export function buildJellyfish(cx: number, cy: number, width: number, length: number, color: string) {
	// funny magic numbers
	const jellyfishHeadFriction = 0.06
	const jellyfishCentralTailFriction = 0.04;
	const jellyfishTailFriction = 0.03;

	const jellyfishOpacity = 0.85;
	const jellyfishTailOpacity = 0.7;
	const jellyfishConstraintStiffness = 0.9;

	const headHeight = width * 0.6;

	const numTails = 10;
	const tailHeight = length + headHeight;
	const tailSegmentHeight = 15;
	const tailDefaultSegments = tailHeight / tailSegmentHeight;
	const tailSegmentWidth = width * 0.02;
	const tailSpaceBetween = width * 0.75 / numTails;

	const centralNumTails = 3;
	const centralCirleWidth = width / 6;
	const centralSegments = tailHeight / centralCirleWidth;
	const centralTailSpaceBetween = width * 0.1;

	let jellyfishGroup = Body.nextGroup(true);
	let jellyfish = Composite.create();
	let head = Bodies.rectangle(cx, cy, width, headHeight, {
		chamfer: { radius: [headHeight * 0.7, headHeight * 0.7, headHeight * 0.3, headHeight * 0.3] },
		collisionFilter: { group: jellyfishGroup },
		frictionAir: jellyfishHeadFriction,
		render: {
			fillStyle: color,
			opacity: jellyfishOpacity
		},
	})
	Composite.add(jellyfish, head);

	const tailRelY = headHeight * 0.45
	for (let i = 0; i < numTails; i++) {
		const tailRelX = tailSpaceBetween * (i - (numTails - 1) / 2);
		let tailSegments = tailDefaultSegments - Math.random() * (tailDefaultSegments / 3);

		let tail = Composites.stack(
			cx + tailRelX,
			cy + tailRelY,
			1,
			tailSegments,
			tailSegmentHeight,
			0,
			(x: number, y: number) => {
				let segment = Bodies.rectangle(x, y, tailSegmentWidth, tailSegmentHeight, {
					collisionFilter: { group: jellyfishGroup },
					frictionAir: jellyfishTailFriction,
					render: {
						fillStyle: color,
						opacity: jellyfishTailOpacity
					}
				});
				return segment;
			}
		);
		Composite.add(jellyfish, tail);

		[-0.5, -0.2, 0.2, 0.5].forEach((xOffset) => {
			Composites.chain(tail, xOffset, 0.5, xOffset, -0.5, {
				stiffness: jellyfishConstraintStiffness,
				length: 0,
				render: {
					visible: false
				}
			});
			Composite.add(jellyfish, Constraint.create({
				bodyA: head,
				bodyB: tail.bodies[0],
				pointA: { x: tailRelX, y: tailRelY },
				pointB: { x: xOffset * tailSegmentWidth, y: -tailSegmentHeight / 2 },
				stiffness: jellyfishConstraintStiffness,
				length: 0,
				render: {
					visible: false
				}
			}))
		})
	}

	const cTailRelY = headHeight * 0.5;
	for (let i = 0; i < centralNumTails; i++) {
		let ind = 0;
		const cTailRelX = centralTailSpaceBetween * (i - (centralNumTails - 1) / 2);
		let centralTail = Composites.stack(
			cx + cTailRelX,
			cy + cTailRelY,
			1,
			centralSegments,
			0,
			0,
			(x: number, y: number) => {
				const circleRadius = (centralCirleWidth / 2) * (centralSegments - ind) / centralSegments;
				let segment = Bodies.circle(x - circleRadius, y, circleRadius, {
					collisionFilter: { group: jellyfishGroup },
					frictionAir: jellyfishCentralTailFriction,
					render: {
						fillStyle: color,
						opacity: jellyfishTailOpacity
					}
				});
				ind++;
				return segment;
			}
		);
		Composites.chain(centralTail, 0, 0.5, 0, -0.5, {
			stiffness: jellyfishConstraintStiffness,
			length: 0,
			render: {
				visible: false
			}
		});
		Composite.add(jellyfish, centralTail);

		Composite.add(jellyfish, Constraint.create({
			bodyA: head,
			bodyB: centralTail.bodies[0],
			pointA: { x: cTailRelX, y: cTailRelY },
			pointB: { x: 0, y: -centralCirleWidth / 2 },
			stiffness: jellyfishConstraintStiffness,
			length: 0,
			render: {
				visible: false
			}
		}))
	}
	return jellyfish;
}
