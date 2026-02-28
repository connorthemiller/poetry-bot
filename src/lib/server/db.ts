import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { getConfig } from './config';

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
	if (_db) return _db;

	const dbPath = resolve(getConfig().database.path);
	mkdirSync(dirname(dbPath), { recursive: true });

	_db = new Database(dbPath);
	_db.pragma('journal_mode = WAL');
	_db.pragma('foreign_keys = ON');

	initSchema(_db);
	return _db;
}

function initSchema(db: Database.Database) {
	db.exec(`
		CREATE TABLE IF NOT EXISTS poems (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			title TEXT NOT NULL DEFAULT '',
			body TEXT NOT NULL DEFAULT '',
			chain_of_thought TEXT NOT NULL DEFAULT '[]',
			particle_snapshot TEXT NOT NULL DEFAULT '[]',
			status TEXT NOT NULL DEFAULT 'complete',
			triggered_by TEXT NOT NULL DEFAULT 'manual',
			weather_context TEXT,
			season TEXT,
			time_of_day TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		CREATE TABLE IF NOT EXISTS feedback (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			poem_id INTEGER NOT NULL REFERENCES poems(id),
			note TEXT NOT NULL,
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		CREATE TABLE IF NOT EXISTS references_ (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			title TEXT NOT NULL DEFAULT '',
			body TEXT NOT NULL,
			source_type TEXT NOT NULL DEFAULT 'other',
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		CREATE TABLE IF NOT EXISTS particles (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			label TEXT NOT NULL,
			category TEXT NOT NULL,
			content TEXT NOT NULL DEFAULT '',
			strength REAL NOT NULL DEFAULT 1.0,
			source TEXT NOT NULL DEFAULT '',
			connections TEXT NOT NULL DEFAULT '[]',
			used_in_poem_id INTEGER,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		CREATE TABLE IF NOT EXISTS interests (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			topic TEXT NOT NULL,
			origin TEXT NOT NULL DEFAULT '',
			research_notes TEXT,
			strength REAL NOT NULL DEFAULT 1.0,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		CREATE TABLE IF NOT EXISTS agent_log (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			event_type TEXT NOT NULL,
			detail TEXT NOT NULL DEFAULT '{}',
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
		);
	`);
}

// -- Helper functions --

export function insertPoem(data: {
	title: string;
	body: string;
	chain_of_thought?: string;
	particle_snapshot?: string;
	triggered_by?: string;
	weather_context?: string | null;
	season?: string | null;
	time_of_day?: string | null;
}) {
	const db = getDb();
	const stmt = db.prepare(`
		INSERT INTO poems (title, body, chain_of_thought, particle_snapshot, triggered_by, weather_context, season, time_of_day)
		VALUES (@title, @body, @chain_of_thought, @particle_snapshot, @triggered_by, @weather_context, @season, @time_of_day)
	`);
	return stmt.run({
		title: data.title,
		body: data.body,
		chain_of_thought: data.chain_of_thought || '[]',
		particle_snapshot: data.particle_snapshot || '[]',
		triggered_by: data.triggered_by || 'manual',
		weather_context: data.weather_context || null,
		season: data.season || null,
		time_of_day: data.time_of_day || null
	});
}

export function getPoems(limit = 20, offset = 0) {
	const db = getDb();
	return db.prepare('SELECT * FROM poems ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
}

export function getPoemById(id: number) {
	const db = getDb();
	return db.prepare('SELECT * FROM poems WHERE id = ?').get(id);
}

export function insertFeedback(poemId: number, note: string) {
	const db = getDb();
	return db.prepare('INSERT INTO feedback (poem_id, note) VALUES (?, ?)').run(poemId, note);
}

export function getFeedbackForPoem(poemId: number) {
	const db = getDb();
	return db.prepare('SELECT * FROM feedback WHERE poem_id = ? ORDER BY created_at DESC').all(poemId);
}

export function getRecentFeedback(limit = 10) {
	const db = getDb();
	return db.prepare('SELECT * FROM feedback ORDER BY created_at DESC LIMIT ?').all(limit);
}

export function insertReference(data: { title: string; body: string; source_type: string }) {
	const db = getDb();
	return db.prepare('INSERT INTO references_ (title, body, source_type) VALUES (@title, @body, @source_type)').run(data);
}

export function getReferences(limit = 20, offset = 0) {
	const db = getDb();
	return db.prepare('SELECT * FROM references_ ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
}

export function insertParticle(data: {
	label: string;
	category: string;
	content: string;
	strength?: number;
	source: string;
	connections?: string;
}) {
	const db = getDb();
	return db.prepare(`
		INSERT INTO particles (label, category, content, strength, source, connections)
		VALUES (@label, @category, @content, @strength, @source, @connections)
	`).run({
		label: data.label,
		category: data.category,
		content: data.content,
		strength: data.strength ?? 1.0,
		source: data.source,
		connections: data.connections || '[]'
	});
}

export function getActiveParticles() {
	const db = getDb();
	return db.prepare('SELECT * FROM particles WHERE used_in_poem_id IS NULL AND strength > 0 ORDER BY strength DESC').all();
}

export function markParticlesUsed(particleIds: number[], poemId: number) {
	const db = getDb();
	const stmt = db.prepare('UPDATE particles SET used_in_poem_id = ? WHERE id = ?');
	const tx = db.transaction(() => {
		for (const pid of particleIds) {
			stmt.run(poemId, pid);
		}
	});
	tx();
}

export function decayParticles(halfLifeMs: number, minStrength: number) {
	const db = getDb();
	// Exponential decay: new_strength = strength * 0.5^(elapsed / half_life)
	// We approximate by applying a decay factor based on time since last update
	const factor = Math.pow(0.5, 300_000 / halfLifeMs); // decay per 5-min tick
	db.prepare(`
		UPDATE particles
		SET strength = strength * ?, updated_at = datetime('now')
		WHERE used_in_poem_id IS NULL AND strength > ?
	`).run(factor, minStrength);
	// Prune dead particles
	db.prepare('DELETE FROM particles WHERE used_in_poem_id IS NULL AND strength <= ?').run(minStrength);
}

export function insertInterest(data: { topic: string; origin: string }) {
	const db = getDb();
	return db.prepare('INSERT INTO interests (topic, origin) VALUES (@topic, @origin)').run(data);
}

export function getActiveInterests() {
	const db = getDb();
	return db.prepare('SELECT * FROM interests WHERE strength > 0 ORDER BY strength DESC').all();
}

export function updateInterestResearch(id: number, notes: string) {
	const db = getDb();
	return db.prepare("UPDATE interests SET research_notes = ?, updated_at = datetime('now') WHERE id = ?").run(notes, id);
}

export function logAgentEvent(eventType: string, detail: Record<string, any> = {}) {
	const db = getDb();
	return db.prepare('INSERT INTO agent_log (event_type, detail) VALUES (?, ?)').run(eventType, JSON.stringify(detail));
}

export function getLastEvent(eventType: string) {
	const db = getDb();
	return db.prepare('SELECT * FROM agent_log WHERE event_type = ? ORDER BY created_at DESC LIMIT 1').get(eventType);
}
