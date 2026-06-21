/**
 * Sync guest list from isaacandcorine.com RSVP API into server/guests.json.
 * Run: npm run sync-guests
 */
const fs = require('fs');
const path = require('path');

const LIVE_BASE = process.env.LIVE_API_BASE || 'https://isaacandcorine.com';
const GUESTS_FILE = path.join(__dirname, 'guests.json');
const CHARSET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ -&.\'';
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const MIN_QUERY_LEN = 2;
const MAX_QUERY_LEN = 48;
const TOKEN_REFRESH_MS = 4 * 60 * 1000;
const MAX_REQUESTS = Number(process.env.SYNC_MAX_REQUESTS || 20000);

let token = null;
let tokenIssuedAt = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function initialQueries() {
  const queries = new Set();

  for (let i = 0; i < LETTERS.length; i += 1) {
    for (let j = 0; j < LETTERS.length; j += 1) {
      queries.add(LETTERS[i] + LETTERS[j]);
      queries.add(UPPER[i] + LETTERS[j]);
      for (let k = 0; k < LETTERS.length; k += 1) {
        queries.add(LETTERS[i] + LETTERS[j] + LETTERS[k]);
      }
    }
  }

  return [...queries];
}

async function getToken(force = false) {
  if (!force && token && Date.now() - tokenIssuedAt < TOKEN_REFRESH_MS) {
    return token;
  }

  const res = await fetch(`${LIVE_BASE}/api/token.php`);
  if (!res.ok) throw new Error(`Token request failed: ${res.status}`);
  const data = await res.json();
  token = data.token;
  tokenIssuedAt = Date.now();
  return token;
}

async function lookup(name) {
  await getToken();
  const res = await fetch(`${LIVE_BASE}/api/guest-lookup.php`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-RSVP-Token': token
    },
    body: JSON.stringify({ name })
  });

  const data = await res.json();
  if (data.error && data.error.includes('valid name')) return { kind: 'invalid' };
  if (data.error && data.error.includes('expired')) {
    await getToken(true);
    return lookup(name);
  }
  if (data.guest) return { kind: 'guest', guest: data.guest };
  if (data.error && data.error.includes('Multiple')) return { kind: 'multiple' };
  return { kind: 'none' };
}

function toStoredGuest(guest) {
  const alreadySubmitted = Boolean(guest.already_submitted);
  const attending = guest.rsvp_status === 'attending'
    ? 'yes'
    : guest.rsvp_status === 'declined'
      ? 'no'
      : null;

  return {
    id: Number(guest.id) || guest.id,
    name: guest.name.trim(),
    prewedding: Boolean(guest.prewedding),
    plus_one: Boolean(guest.plus_one),
    plus_one_name: guest.plus_one_name || '',
    already_submitted: alreadySubmitted,
    rsvp_status: guest.rsvp_status || null,
    responses: alreadySubmitted && attending
      ? {
          attending,
          prewedding_attending: guest.prewedding ? attending : null,
          plus_one_attending: guest.plus_one ? attending : null,
          plus_one_prewedding_attending: null,
          submitted_at: null
        }
      : null
  };
}

function shouldExtend(query, kind) {
  if (query.length >= MAX_QUERY_LEN) return false;
  if (kind === 'multiple') return true;
  if (kind === 'none' && query.length < 6) return true;
  return false;
}

function writeGuestsFile(byId) {
  const guests = [...byId.values()]
    .map(toStoredGuest)
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  fs.writeFileSync(GUESTS_FILE, JSON.stringify({ guests }, null, 2), 'utf8');
}

async function discoverGuests() {
  const byId = new Map();
  const queue = initialQueries();
  const seenQueries = new Set();
  let requests = 0;

  while (queue.length > 0 && requests < MAX_REQUESTS) {
    const query = queue.shift();
    if (!query || seenQueries.has(query) || query.length < MIN_QUERY_LEN) continue;
    seenQueries.add(query);

    const result = await lookup(query);
    requests += 1;

    if (result.kind === 'guest') {
      byId.set(String(result.guest.id), result.guest);
      process.stdout.write(`\rDiscovered ${byId.size} guests (${requests} lookups, queue ${queue.length})...`);
      if (byId.size % 25 === 0) {
        writeGuestsFile(byId);
      }
    }

    if (shouldExtend(query, result.kind)) {
      for (const ch of CHARSET) {
        queue.push(query + ch);
      }
    }

    if (requests % 500 === 0) {
      process.stdout.write(`\rDiscovered ${byId.size} guests (${requests} lookups, queue ${queue.length})...`);
    }
  }

  return byId;
}

async function main() {
  console.log(`Syncing guests from ${LIVE_BASE}...`);
  await getToken(true);
  const discovered = await discoverGuests();
  writeGuestsFile(discovered);
  console.log(`\nWrote ${discovered.size} guests to ${GUESTS_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
