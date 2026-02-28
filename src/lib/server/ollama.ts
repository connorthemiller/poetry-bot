import { getConfig } from './config';

interface OllamaResponse {
	model: string;
	response: string;
	done: boolean;
}

export async function generate(prompt: string, options?: { temperature?: number; model?: string }): Promise<string> {
	const config = getConfig();
	const url = `${config.ollama.url}/api/generate`;

	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			model: options?.model || config.ollama.model,
			prompt,
			stream: false,
			options: {
				temperature: options?.temperature ?? config.ollama.temperature
			}
		})
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Ollama error ${res.status}: ${text}`);
	}

	const data = (await res.json()) as OllamaResponse;
	return data.response.trim();
}
