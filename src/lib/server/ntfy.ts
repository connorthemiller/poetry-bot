import { getConfig } from './config';

export async function sendNotification(title: string, message: string): Promise<void> {
	const config = getConfig();
	const url = `${config.ntfy.server}/${config.ntfy.topic}`;

	await fetch(url, {
		method: 'POST',
		headers: {
			Title: title,
			Priority: '3'
		},
		body: message
	});
}
