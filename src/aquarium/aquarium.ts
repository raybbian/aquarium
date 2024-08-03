import { Engine, Composite, Mouse, MouseConstraint, Vertices, Runner } from 'matter-js';
import { Jellyfish } from '@/aquarium/jellyfish';
import { Application } from 'pixi.js';

export default class Aquarium {
	jellyfish: Jellyfish[] = [];

	private pixiApp?: Application;
	private engine?: Engine;
	private container: HTMLDivElement;
	private initialized: boolean = false;
	private mouse?: Mouse;

	get canvas() {
		if (!this.initialized) return undefined;
		return this.pixiApp?.canvas;
	}

	constructor(container: HTMLDivElement) {
		this.container = container;
	}

	async init() {
		this.pixiApp = new Application();
		await this.pixiApp.init({
			backgroundAlpha: 0,
			resizeTo: this.container,
			antialias: true,
		});
		this.container.appendChild(this.pixiApp.canvas);

		this.engine = Engine.create({
			positionIterations: 1,
			velocityIterations: 1,
		});
		this.engine.gravity.y = 0;
		this.engine.gravity.x = 0;

		this.mouse = Mouse.create(this.pixiApp.canvas);
		let mouseConstraint = MouseConstraint.create(this.engine, {
			mouse: this.mouse,
			constraint: {
				stiffness: 0.2,
				render: {
					visible: false
				}
			}
		})
		this.pixiApp.canvas.addEventListener('mouseleave', () => {
			const ev = new Event("mouseup");
			mouseConstraint.mouse.element.dispatchEvent(ev);
		})
		Composite.add(this.engine.world, [mouseConstraint]);

		let curDeltaMS = 0;
		const tickIntervalMS = 1000 / 60;
		this.pixiApp!.ticker.add((ticker) => {
			curDeltaMS += ticker.deltaMS;

			this.jellyfish.forEach((jfish) => {
				let tmpDeltaMS = curDeltaMS;
				while (tmpDeltaMS > tickIntervalMS) {
					jfish.update(tickIntervalMS);
					tmpDeltaMS -= tickIntervalMS;
				}

				// NOTE: handle hover functionality
				if (!jfish.headHull) return;
				if (Vertices.contains(jfish.headHull, this.mouse!.position)) {
					jfish.setHovered();
				} else {
					jfish.setUnhovered();
				}
			})

			while (curDeltaMS > tickIntervalMS) {
				Engine.update(this.engine!, tickIntervalMS);
				curDeltaMS -= tickIntervalMS;
			}
		})

		// NOTE: initialize jellyfish that were added before initialization
		this.jellyfish.forEach((jfish) => {
			jfish.init(this.engine!, this.pixiApp!, this.mouse!);
		})
		this.initialized = true;
	}

	addJellyfish(jfish: Jellyfish) {
		this.jellyfish.push(jfish);
		if (this.initialized) jfish.init(this.engine!, this.pixiApp!, this.mouse!);
	}
}
