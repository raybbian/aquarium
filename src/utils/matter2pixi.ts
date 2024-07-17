import { Body, Composite } from "matter-js";
import { Graphics } from "pixi.js";

export type PixiToMatterObjMap = Map<Graphics, Body>;

export default class Matter2Pixi {
	static bodyToGraphics(body: Body): Graphics | null {
		if (!body.render.visible) return null;
		const graphic = new Graphics();
		const vertices = body.vertices.map(vertex => {
			return {
				x: vertex.x - body.position.x,
				y: vertex.y - body.position.y
			}
		})

		graphic.alpha = body.render.opacity ?? 1;
		graphic.fill(body.render.fillStyle);
		graphic.moveTo(vertices[0].x, vertices[0].y);

		for (let i = 1; i < vertices.length; i++) {
			graphic.lineTo(vertices[i].x, vertices[i].y);
		}
		graphic.closePath();
		graphic.fill();

		return graphic;
	}

	static compositeToGraphics(composite: Composite, output?: PixiToMatterObjMap): PixiToMatterObjMap {
		let graphics: PixiToMatterObjMap;
		if (output) graphics = output;
		else graphics = new Map<Graphics, Body>();
		Composite.allBodies(composite).forEach((body) => {
			const graphic = this.bodyToGraphics(body);
			if (graphic == null) return;
			graphics.set(graphic, body);
		})
		return graphics;
	}
}

