const { Pool } = require('pg');
const dns = require('dns');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
	// Fail fast with a clear message so developers know to set the env var
	throw new Error('Missing DATABASE_URL environment variable. Please set DATABASE_URL to your Postgres connection string (e.g. from Supabase)');
}

// Try to parse the host out of the connection string for better diagnostics
let dbHost = null;
try {
	const url = new URL(connectionString);
	dbHost = url.hostname;
	console.log('Database connection host:', dbHost);
	// Do a quick DNS lookup to provide a clearer early error if the host doesn't resolve
	dns.lookup(dbHost, (err, address) => {
		if (err) {
			console.error(`DNS lookup failed for DB host '${dbHost}':`, err && err.message ? err.message : err);
		} else {
			console.log(`DB host '${dbHost}' resolved to ${address}`);
		}
	});
} catch (err) {
	console.warn('Could not parse DATABASE_URL to extract host for diagnostics:', err && err.message ? err.message : err);
}

const pool = new Pool({
	connectionString,
});

module.exports = pool;