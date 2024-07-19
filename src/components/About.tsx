import { Page } from "@/components/Utils";
import Link from "next/link";

function AboutEntry({ title, description }: {
	title: string;
	description: string;
}) {
	return (
		<div className="flex flex-col gap-2">
			<p className="text-2xl lg:text-3xl font-semibold text-nteal"><span className="text-white">I am </span>{title}</p>
			<p className="text-md lg:text-lg">{description}</p>
		</div>
	)
}

export default function About() {
	return (
		<Page
			titleLead="This is"
			title="who I am."
			textAccent="text-nteal"
		>
			<AboutEntry
				title="a CS Major & Math Minor @ GT"
				description="Rising sophomore studying CS at Georgia Tech (Sysarch + Intel). Competitive Programming officer, Klaus invader, Panda Express enjoyer."
			/>
			<AboutEntry
				title="Passionate"
				description="... about making projects and building new things. I'm interested in game development and complexity theory, and I love to play Saxophone, Volleyball, and Tennis!"
			/>
			<AboutEntry
				title="a Gamer"
				description="Competitive game enthusiast; including but not limited to: League of Legends, TFT, Apex Legends, Valorant, CS:GO."
			/>
			<div className="w-full flex flex-row justify-center gap-8">
				<Link
					className="text-2xl text-nteal font-semibold underline underline-offset-4"
					href={'/resume.pdf'}
					target="_blank"
				>
					Resume
				</Link>
				<Link
					className="text-2xl text-nteal font-semibold underline underline-offset-4"
					href={'https://github.com/raybbian'}
					target="_blank"
				>
					Github
				</Link>
			</div>
		</Page>
	);
}
