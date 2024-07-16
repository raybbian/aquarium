import { Engine, Composite, Runner, Render, Mouse, MouseConstraint } from 'matter-js';
import { useEffect, useRef } from "react"
import { buildJellyfish } from '@/aquarium/jellyfish';

export default function Aquarium() {
	const aquariumCanvas = useRef<HTMLDivElement | null>(null);
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

	function aquariumInit() {
		if (!aquariumCanvas.current) return;
		let engine = Engine.create();
		engine.gravity.y = 0.1;
		let runner = Runner.create();

		render.current = Render.create({
			element: aquariumCanvas.current,
			engine: engine,
			options: {
				width: aquariumCanvas.current.clientWidth,
				height: aquariumCanvas.current.clientHeight,
				wireframeBackground: 'transparent',
				wireframes: false,
				background: 'transparent'
			}
		});

		let jellyfish = buildJellyfish(400, 200, 125, 400, 'rgb(255, 13, 134)');
		Composite.add(engine.world, jellyfish)

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

		render.current.mouse = mouse;

		Render.run(render.current);
		Runner.run(runner, engine);
	}


	return (
		<div id="aquarium" className="w-full h-full bg-gray-950" ref={aquariumCanvas} />
	)
}
