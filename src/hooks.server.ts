import { loadConfig } from '$lib/server/config';
import { getDb } from '$lib/server/db';
import { startAgent } from '$lib/server/agent';

// Initialize on server start
loadConfig();
getDb();
startAgent();

console.log('[poetry-bot] Server started, database initialized, agent running');
