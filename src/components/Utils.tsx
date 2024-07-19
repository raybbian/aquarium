import { ReactNode } from "react";

export function Page({ children, titleLead, title, textAccent }: {
	children?: ReactNode;
	titleLead: string;
	title: string;
	textAccent: string;
}) {
	return (
		<div className={`h-auto min-h-[100dvh] lg:h-[100dvh] w-full max-w-screen-lg flex flex-col items-center lg:justify-center snap-start lg:snap-center flex-none px-8 py-12`}>
			<div className={`flex flex-col lg:flex-row gap-8 lg:gap-16 lg:items-center select-none`}>
				<div>
					<p className={`text-3xl lg:text-5xl font-bold ${textAccent}`}>{titleLead}</p>
					<h1 className="text-[3rem] lg:text-[5rem] text-white font-bold leading-none whitespace-nowrap">{title}</h1>
				</div>
				<div className={`flex flex-col gap-8 lg:max-h-[80dvh] overflow-hidden justify-center`}>
					{children}
				</div>
			</div>
		</div>
	);
}
