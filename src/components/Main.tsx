import Aquarium from "@/aquarium/aquarium";
import { useEffect, useRef, MouseEvent as ReactMouseEvent, useState, ReactNode } from "react";
import Title from "@/components/Title";
import Projects from "@/components/Projects";
import Experience from "@/components/Experience";
import About from "@/components/About";
import Contact from "@/components/Contact";
import { Jellyfish } from "@/aquarium/jellyfish";

const pageColors = [
	'#72EFDD',
	'#56CFE1',
	'#5390D9',
	'#5E60CE',
	'#6930C3',
]

export default function Main() {
	const aquarium = useRef<Aquarium | null>(null);
	const aquariumContainer = useRef<HTMLDivElement | null>(null);
	useEffect(() => {
		if (!aquariumContainer.current) return;
		aquarium.current = new Aquarium(aquariumContainer.current);
		aquarium.current.init();
		aquarium.current.addJellyfish(new Jellyfish(
			aquariumContainer.current.clientWidth / 3,
			aquariumContainer.current.clientHeight + 50,
			250, 400, '#56CFE1')
		);
	}, [aquariumContainer]);

	function passMouseEvent(e: ReactMouseEvent) {
		if (!aquarium.current?.canvas) return;
		const event = new MouseEvent(e.nativeEvent.type, {
			bubbles: false,
			clientX: e.nativeEvent.clientX,
			clientY: e.nativeEvent.clientY,
			screenX: e.nativeEvent.screenX,
			screenY: e.nativeEvent.screenY,
		});
		aquarium.current.canvas.dispatchEvent(event);
	}

	const [curPage, setCurPage] = useState(0);
	const contentContainer = useRef<HTMLDivElement | null>(null);
	function updateCurPage() {
		if (!contentContainer.current) return;
		let bestPage = -1;
		let bestOffset = Infinity;
		for (let i = 0; i < contentContainer.current.children.length; i++) {
			const page = contentContainer.current.children[i];
			const offset = Math.abs(page.getBoundingClientRect().top - contentContainer.current!.getBoundingClientRect().top);
			if (offset < bestOffset) {
				bestOffset = offset;
				bestPage = i;
			}
		}
		setCurPage(bestPage);
	}
	useEffect(() => {
		updateCurPage();
	}, [contentContainer])

	useEffect(() => {
		aquarium.current?.jellyfish.forEach((jfish) => {
			jfish.shiftColor(pageColors[curPage]);
		})
	}, [curPage])

	return (
		<div
			className="h-full w-full relative"
			onMouseUp={passMouseEvent}
			onMouseDown={passMouseEvent}
			onMouseMove={passMouseEvent}
			onMouseLeave={passMouseEvent}
		>
			<div className="fixed h-full w-full -z-10 bg-black">
				<div className="h-full w-full -z-10 opacity-40 relative" ref={aquariumContainer} />
			</div>
			<div
				className="h-full w-full overflow-y-scroll snap-y snap-proximity lg:snap-mandatory flex flex-col items-center gap-12"
				ref={contentContainer}
				onScroll={updateCurPage}
			>
				<div className="h-[100dvh] w-full max-w-screen-lg grid place-items-center snap-center flex-none">
					<Title />
				</div>
				<About />
				<Projects />
				<Experience />
				<Contact />
			</div>
		</div>
	)
}
