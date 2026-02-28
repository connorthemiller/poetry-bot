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

export async function generateStream(
	prompt: string,
	options?: { temperature?: number; model?: string }
): Promise<ReadableStream<string>> {
	const config = getConfig();
	const url = `${config.ollama.url}/api/generate`;

	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			model: options?.model || config.ollama.model,
			prompt,
			stream: true,
			options: {
				temperature: options?.temperature ?? config.ollama.temperature
			}
		})
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Ollama error ${res.status}: ${text}`);
	}

	const reader = res.body!.getReader();
	const decoder = new TextDecoder();

	return new ReadableStream<string>({
		async pull(controller) {
			const { done, value } = await reader.read();
			if (done) {
				controller.close();
				return;
			}
			const chunk = decoder.decode(value, { stream: true });
			// Ollama streams newline-delimited JSON
			for (const line of chunk.split('\n')) {
				if (!line.trim()) continue;
				try {
					const obj = JSON.parse(line) as OllamaResponse;
					if (obj.response) {
						controller.enqueue(obj.response);
					}
					if (obj.done) {
						controller.close();
						return;
					}
				} catch {
					// partial JSON line, skip
				}
			}
		}
	});
}
