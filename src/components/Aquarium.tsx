import { Engine, Composite, Render, Mouse, MouseConstraint, Body, Runner, Events } from 'matter-js';
import { useEffect, useRef } from "react"
import { Jellyfish } from '@/aquarium/jellyfish';
import { Application } from 'pixi.js';
import { Animal } from '@/aquarium/animal';

export default function Aquarium() {
	const aquariumCanvas = useRef<HTMLDivElement | null>(null);
	const pixiApp = useRef<Application | null>(null);
	const render = useRef<Render | null>(null);

	useEffect(() => {
		window.addEventListener('resize', () => {
			aquariumResize();
		});
		aquariumInit();
		return () => {
			window.removeEventListener('resize', () => {
				aquariumResize();
			});
		}
	}, []);

	function aquariumResize() {
		if (!aquariumCanvas.current || !render.current) return;
		let width = aquariumCanvas.current.clientWidth;
		let height = aquariumCanvas.current.clientHeight;
		render.current.bounds.max.x = width;
		render.current.bounds.max.y = height;
		render.current.options.width = width;
		render.current.options.height = height;
		render.current.canvas.width = width;
		render.current.canvas.height = height;
	}

	async function aquariumInit() {
		if (!aquariumCanvas.current) return;
		let engine = Engine.create();
		engine.gravity.y = 0.001;
		engine.gravity.x = 0.001;

		pixiApp.current = new Application();
		await pixiApp.current.init({
			backgroundAlpha: 0,
			resizeTo: aquariumCanvas.current,
			antialias: true,
		});
		aquariumCanvas.current.appendChild(pixiApp.current.canvas);

		let mouse = Mouse.create(pixiApp.current.canvas);
		let mouseConstraint = MouseConstraint.create(engine, {
			mouse: mouse,
			constraint: {
				stiffness: 0.2,
				render: {
					visible: false
				}
			}
		})
		Composite.add(engine.world, [mouseConstraint]);

		let animals = Array<Animal>();
		let aquariumGroup = Body.nextGroup(true);

		let jellyfish = new Jellyfish(400, 500, 150, 300, 'rgb(255, 13, 134)', aquariumGroup);

		animals.push(jellyfish);
		animals.forEach((animal) => {
			animal.init(engine, pixiApp.current!);
		})

		Events.on(mouseConstraint, 'mousedown', event => {
			if (mouseConstraint.body) {
				let body = mouseConstraint.body;
				if (body.label == "Jellyfish") {
					jellyfish.stopBehavior();
				}
			}
		})
		Events.on(mouseConstraint, 'mouseup', event => {
			jellyfish.startBehavior();
		})

		pixiApp.current!.ticker.add((ticker) => {
			animals.forEach((animal) => {
				animal.update(ticker.elapsedMS);
			})
			Engine.update(engine);
		})
	}

	async function aquariumInitDebug() {
		if (!aquariumCanvas.current) return;
		let engine = Engine.create();
		engine.gravity.y = 0;

		render.current = Render.create({
			element: aquariumCanvas.current,
			engine: engine,
			options: {
				width: aquariumCanvas.current.clientWidth,
				height: aquariumCanvas.current.clientHeight
			}
		})

		let mouse = Mouse.create(render.current.canvas);
		let mouseConstraint = MouseConstraint.create(engine, {
			mouse: mouse,
			constraint: {
				stiffness: 0.2,
				render: {
					visible: false
				}
			}
		})
		Composite.add(engine.world, [mouseConstraint]);

		let aquariumGroup = Body.nextGroup(true);

		let jellyfish = new Jellyfish(400, 200, 200, 400, 'rgb(255, 13, 134)', aquariumGroup);
		Composite.add(engine.world, jellyfish.jellyfishComposite);

		render.current.mouse = mouse;

		Render.run(render.current);
		let runner = Runner.create();

		Runner.run(runner, engine);
	}


	return (
		<div id="aquarium" className="w-full h-full bg-gray-950" ref={aquariumCanvas} />
	)
}
