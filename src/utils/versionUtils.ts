export function incrementVersion(version: string): string {
	const parts = version.split(".").map(Number);
	parts[parts.length - 1]++;
	return parts.join(".");
}

export function compareVersions(a: string, b: string): number {
	const partsA = a.split(".").map(Number);
	const partsB = b.split(".").map(Number);
	for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
		const partA = partsA[i] || 0;
		const partB = partsB[i] || 0;
		if (partA > partB) return 1;
		if (partA < partB) return -1;
	}
	return 0;
}
