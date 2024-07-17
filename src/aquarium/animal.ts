import { Engine } from "matter-js";
import { Application } from "pixi.js";

export abstract class Animal {
	init(_: Engine, __: Application): void {
		throw new Error("init not implemented!");
	};
	update(delta: number): void {
		throw new Error("update not implemented!");
	}
}
