import { Page } from "@/components/Utils";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

function Project({ name, technologies, description, link }: {
	name: string;
	technologies: string;
	description: string;
	link?: string;
}) {
	return (
		<div className="w-full flex flex-col gap-2 snap-center">
			<p className="text-2xl lg:text-3xl font-semibold text-nblue">
				{link ? <Link href={link} target="_blank" className="underline underline-offset-4">{name}</Link> : name}
				<span className="text-white"> | {technologies}</span>
			</p>
			<p className="text-md lg:text-lg">{description}</p>
		</div>
	)
}

export default function Projects() {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [hasScroll, setHasScroll] = useState(false);
	const [curPage, setCurPage] = useState(0);
	const [totalPages, setTotalPages] = useState(0);

	function handleScroll() {
		if (!containerRef.current) return;
		const page = Math.round(containerRef.current!.scrollLeft / containerRef.current!.clientWidth);
		setCurPage(page);
	}

	function handleResize() {
		if (!containerRef.current) return;
		setHasScroll(containerRef.current!.scrollWidth > containerRef.current!.clientWidth);
		const numPages = Math.round(containerRef.current!.scrollWidth / containerRef.current!.clientWidth);
		setTotalPages(numPages);
	}

	function scrollToPage(page: number) {
		if (!containerRef.current) return;
		if (page < 0 || page >= totalPages) return;
		containerRef.current.scrollTo({
			left: page * containerRef.current.clientWidth,
			behavior: "smooth"
		})
	}

	useEffect(() => {
		if (!containerRef.current) return;
		handleResize();
		const resizeObserver = new ResizeObserver(() => {
			handleResize();
		});
		resizeObserver.observe(containerRef.current);
		return () => resizeObserver.disconnect();
	}, [])

	return (
		<Page
			titleLead="Here are my"
			title="Projects."
			textAccent="text-nblue"
		>
			<div
				className="flex flex-col gap-8 overflow-scroll no-scrollbar flex-wrap lg:justify-center snap-x snap-proximity"
				ref={containerRef}
				onScroll={handleScroll}
			>
				<Project
					name="iUtils"
					description="A Windows Kernel driver + WinUI 3 GUI App that expose and enable hidden but useful iDevice USB interfaces."
					technologies="WDF, WinUI3, Visual Studio"
					link="https://github.com/raybbian/iUtils"
				/>
				<Project
					name="Graphscii"
					description="Python app that utilizes Topology-Shape-Metrics and the Kandinsky model to embed graphs with ASCII characters only."
					technologies="NetworkX, Python, React"
					link="https://graphscii.raybb.dev/"
				/>
				<Project
					name="LoL CD Tracker"
					description="An external tool for League of Legends developed with ReClass, ImGUI, the Windows API, and reverse engineering techniques."
					technologies="C++, ImGUI, ReClass"
				/>
				<Project
					name="Landing"
					description="Simple full stack todo list app built with Prisma, Next.js, and Postgres. Features OAuth2 Github login and Codeforces integration."
					technologies="Prisma, Next.js, Postgres"
					link="https://landing.raybb.dev"
				/>
				<Project
					name="GT Multibooker"
					description="UI and wrapper utility that allows users to book multiple GT Library rooms at once, built with React, FastAPI, and Postman."
					technologies="FastAPI, React"
					link="https://multibooker.raybb.dev/"
				/>
				<Project
					name="USACO Checklist"
					description="Sophisticated web scraper that pulls problem progress and information from the USACO website, keeping track of and allowing you to share your progress."
					technologies="FastAPI, SQL"
				/>
				<Project
					name="Codeforces Debug"
					description="Simple C++ single header debug file that allows for a quick and easy visualization of even the most complex nested data structures."
					technologies="C++, Templates"
					link="https://github.com/raybbian/comp-programming"
				/>
				<Project
					name="Garden of Growth"
					description="My old personal portfolio, featuring a rule based procedural terrain generation algorithm (Wave Function Collapse)."
					technologies="React, Tailwind"
					link="https://old.raybb.dev"
				/>
			</div >
			{hasScroll &&
				<div className="w-full flex flex-row justify-center gap-8">
					<button
						className="text-3xl text-nblue font-semibold leading-none"
						style={{ opacity: curPage == 0 ? 0 : 1 }}
						onClick={() => scrollToPage(curPage - 1)}
					>&lt;</button>
					<button
						className="text-3xl text-nblue font-semibold leading-none"
						style={{ opacity: curPage == totalPages - 1 ? 0 : 1 }}
						onClick={() => scrollToPage(curPage + 1)}
					>&gt;</button>
				</div>
			}
		</Page>
	);
}
