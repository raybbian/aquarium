export default class Interpolate {
	static map(fn: (_: number) => number, ind: number, loInd: number, hiInd: number, loVal: number, hiVal: number) {
		let relPos = (ind - loInd + 0.5) / (hiInd - loInd);
		let val = relPos * (hiVal - loVal) + loVal;
		return fn(val);
	}
}
