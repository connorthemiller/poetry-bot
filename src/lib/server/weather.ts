import { getConfig } from './config';
import { insertParticle, logAgentEvent } from './db';

interface WeatherData {
	current: {
		temperature_2m: number;
		weather_code: number;
		wind_speed_10m: number;
		relative_humidity_2m: number;
	};
}

const weatherCodes: Record<number, string> = {
	0: 'clear sky',
	1: 'mainly clear',
	2: 'partly cloudy',
	3: 'overcast',
	45: 'fog',
	48: 'depositing rime fog',
	51: 'light drizzle',
	53: 'moderate drizzle',
	55: 'dense drizzle',
	61: 'slight rain',
	63: 'moderate rain',
	65: 'heavy rain',
	71: 'slight snow',
	73: 'moderate snow',
	75: 'heavy snow',
	80: 'slight rain showers',
	81: 'moderate rain showers',
	82: 'violent rain showers',
	85: 'slight snow showers',
	86: 'heavy snow showers',
	95: 'thunderstorm',
	96: 'thunderstorm with slight hail',
	99: 'thunderstorm with heavy hail'
};

export async function fetchWeather(): Promise<WeatherData> {
	const config = getConfig();
	const { lat, lon, timezone } = config.location;

	const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&timezone=${encodeURIComponent(timezone)}`;

	const res = await fetch(url);
	if (!res.ok) throw new Error(`Open-Meteo error ${res.status}`);
	return (await res.json()) as WeatherData;
}

export async function getCurrentWeatherContext(): Promise<string> {
	const data = await fetchWeather();
	const c = data.current;
	const desc = weatherCodes[c.weather_code] || `code ${c.weather_code}`;
	return `${desc}, ${c.temperature_2m}C, wind ${c.wind_speed_10m}km/h, humidity ${c.relative_humidity_2m}%`;
}

export async function createWeatherParticles(): Promise<void> {
	try {
		const data = await fetchWeather();
		const c = data.current;
		const desc = weatherCodes[c.weather_code] || `code ${c.weather_code}`;

		insertParticle({
			label: desc,
			category: 'weather',
			content: `The sky is ${desc}. Temperature: ${c.temperature_2m}C. Wind: ${c.wind_speed_10m}km/h. Humidity: ${c.relative_humidity_2m}%.`,
			source: 'open-meteo',
			strength: 0.8
		});

		logAgentEvent('weather_fetch', { description: desc, temp: c.temperature_2m });
	} catch (err) {
		logAgentEvent('weather_error', { error: String(err) });
	}
}
