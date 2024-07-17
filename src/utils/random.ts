export default class Random {
	static getRandomInt(min: number, max: number) {
		const minCeiled = Math.ceil(min);
		const maxFloored = Math.floor(max);
		return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled);
	}

	static uniform(min: number, max: number) {
		return Math.random() * (max - min) + min;
	}
}

