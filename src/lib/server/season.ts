export function getSeason(lat: number): string {
	const month = new Date().getMonth(); // 0-11
	const isNorthern = lat >= 0;

	if (isNorthern) {
		if (month >= 2 && month <= 4) return 'spring';
		if (month >= 5 && month <= 7) return 'summer';
		if (month >= 8 && month <= 10) return 'autumn';
		return 'winter';
	} else {
		if (month >= 2 && month <= 4) return 'autumn';
		if (month >= 5 && month <= 7) return 'winter';
		if (month >= 8 && month <= 10) return 'spring';
		return 'summer';
	}
}

export function getTimeOfDay(timezone: string): string {
	const now = new Date();
	let hour: number;

	try {
		const timeStr = now.toLocaleTimeString('en-US', { timeZone: timezone, hour12: false, hour: 'numeric' });
		hour = parseInt(timeStr, 10);
	} catch {
		hour = now.getHours();
	}

	if (hour >= 5 && hour < 8) return 'early morning';
	if (hour >= 8 && hour < 12) return 'morning';
	if (hour >= 12 && hour < 14) return 'midday';
	if (hour >= 14 && hour < 17) return 'afternoon';
	if (hour >= 17 && hour < 20) return 'evening';
	if (hour >= 20 && hour < 23) return 'night';
	return 'late night';
}

// createSeasonParticles is in particles.ts to avoid circular imports
