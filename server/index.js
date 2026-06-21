const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, '..');
const GUESTS_FILE = path.join(__dirname, 'guests.json');
const TOKEN_TTL_MS = 5 * 60 * 1000;
const guestCountAtStartup = (() => {
  try {
    return JSON.parse(fs.readFileSync(GUESTS_FILE, 'utf8')).guests.length;
  } catch {
    return 0;
  }
})();

const MIN_GUESTS_FOR_LOCAL = Number(process.env.MIN_GUESTS_FOR_LOCAL || 50);

const LIVE_API_BASE = process.env.LIVE_API_PROXY === 'on'
  ? (process.env.LIVE_API_BASE || 'https://isaacandcorine.com')
  : process.env.LIVE_API_PROXY === 'off'
    ? null
    : guestCountAtStartup < MIN_GUESTS_FOR_LOCAL
      ? (process.env.LIVE_API_BASE || 'https://isaacandcorine.com')
      : null;

const tokens = new Map();

app.use(express.json({ limit: '32kb' }));
app.use(express.static(ROOT));

function readGuests() {
  const raw = fs.readFileSync(GUESTS_FILE, 'utf8');
  return JSON.parse(raw);
}

function writeGuests(data) {
  fs.writeFileSync(GUESTS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function normalizeName(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function issueToken() {
  const token = crypto.randomBytes(24).toString('hex');
  tokens.set(token, Date.now() + TOKEN_TTL_MS);
  return token;
}

function validateToken(headerValue) {
  if (!headerValue) return false;
  const expiresAt = tokens.get(headerValue);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    tokens.delete(headerValue);
    return false;
  }
  return true;
}

function findGuestsByName(name) {
  const target = normalizeName(name);
  const data = readGuests();

  const exact = data.guests.filter((guest) => normalizeName(guest.name) === target);
  if (exact.length === 1) return { guest: exact[0] };
  if (exact.length > 1) {
    return { error: 'Multiple guests found. Please enter your full name as it appears on your invitation.' };
  }

  const partial = data.guests.filter((guest) => {
    const guestName = normalizeName(guest.name);
    return guestName.includes(target) || target.includes(guestName);
  });

  if (partial.length === 1) return { guest: partial[0] };
  if (partial.length > 1) {
    return { error: 'Multiple guests found. Please enter your full name as it appears on your invitation.' };
  }

  return { guest: null };
}

function toGuestResponse(guest) {
  const rsvpStatus = guest.rsvp_status
    || (guest.responses?.attending === 'yes' ? 'attending' : guest.responses?.attending === 'no' ? 'declined' : null);

  return {
    id: String(guest.id),
    name: guest.name,
    prewedding: Boolean(guest.prewedding),
    plus_one: Boolean(guest.plus_one),
    plus_one_name: guest.plus_one ? (guest.plus_one_name || null) : null,
    rsvp_status: rsvpStatus,
    already_submitted: Boolean(guest.already_submitted)
  };
}

async function proxyLiveApi(endpoint, req, res) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    const token = req.get('X-RSVP-Token');
    if (token) headers['X-RSVP-Token'] = token;

    const response = await fetch(`${LIVE_API_BASE}/api/${endpoint}`, {
      method: req.method,
      headers,
      body: req.method === 'GET' ? undefined : JSON.stringify(req.body || {})
    });

    const text = await response.text();
    res.status(response.status);
    res.set('Content-Type', response.headers.get('content-type') || 'application/json');
    res.send(text);
  } catch (error) {
    res.status(502).json({ error: 'Could not reach the live RSVP service. Try again later.' });
  }
}

app.get('/api/token', (req, res) => {
  if (LIVE_API_BASE) {
    return proxyLiveApi('token.php', req, res);
  }
  res.json({ token: issueToken() });
});

app.post('/api/guest-lookup', (req, res) => {
  if (LIVE_API_BASE) {
    return proxyLiveApi('guest-lookup.php', req, res);
  }

  if (!validateToken(req.get('X-RSVP-Token'))) {
    return res.status(401).json({ error: 'Invalid or expired session. Please refresh and try again.' });
  }

  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  if (!name) {
    return res.status(400).json({ error: 'Please enter your name.' });
  }

  const result = findGuestsByName(name);
  if (result.error) {
    return res.status(200).json({ error: result.error });
  }

  if (!result.guest) {
    return res.status(200).json({ guest: null });
  }

  res.json({ guest: toGuestResponse(result.guest) });
});

app.post('/api/send-rsvp', (req, res) => {
  if (LIVE_API_BASE) {
    return proxyLiveApi('send-rsvp.php', req, res);
  }

  if (!validateToken(req.get('X-RSVP-Token'))) {
    return res.status(401).json({ error: 'Invalid or expired session. Please refresh and try again.' });
  }

  const {
    guest_id: guestId,
    name,
    attending,
    prewedding_attending: preweddingAttending,
    plus_one_name: plusOneName,
    plus_one_attending: plusOneAttending,
    plus_one_prewedding_attending: plusOnePreweddingAttending
  } = req.body || {};

  if (!guestId || !name || !attending) {
    return res.status(400).json({ error: 'Missing required RSVP fields.' });
  }

  if (!['yes', 'no'].includes(attending)) {
    return res.status(400).json({ error: 'Invalid attendance response.' });
  }

  const data = readGuests();
  const guestIndex = data.guests.findIndex((guest) => String(guest.id) === String(guestId));
  if (guestIndex === -1) {
    return res.status(404).json({ error: 'Guest not found.' });
  }

  const guest = data.guests[guestIndex];
  if (normalizeName(guest.name) !== normalizeName(name)) {
    return res.status(400).json({ error: 'Guest name mismatch.' });
  }

  if (guest.already_submitted) {
    return res.status(409).json({ error: 'RSVP already submitted for this guest.' });
  }

  if (guest.prewedding && !['yes', 'no'].includes(preweddingAttending)) {
    return res.status(400).json({ error: 'Please respond for the pre-wedding event.' });
  }

  if (guest.plus_one) {
    if (!plusOneName || !plusOneName.trim()) {
      return res.status(400).json({ error: "Please enter your plus one's name." });
    }
    if (!['yes', 'no'].includes(plusOneAttending)) {
      return res.status(400).json({ error: "Please respond for your plus one." });
    }
    if (guest.prewedding && !['yes', 'no'].includes(plusOnePreweddingAttending)) {
      return res.status(400).json({ error: "Please respond for your plus one's pre-wedding attendance." });
    }
  }

  data.guests[guestIndex] = {
    ...guest,
    already_submitted: true,
    plus_one_name: guest.plus_one ? plusOneName.trim() : guest.plus_one_name,
    rsvp_status: attending === 'yes' ? 'attending' : 'declined',
    responses: {
      attending,
      prewedding_attending: guest.prewedding ? preweddingAttending : null,
      plus_one_attending: guest.plus_one ? plusOneAttending : null,
      plus_one_prewedding_attending: guest.plus_one && guest.prewedding ? plusOnePreweddingAttending : null,
      submitted_at: new Date().toISOString()
    }
  };

  writeGuests(data);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Wedding site running at http://localhost:${PORT}`);
  if (LIVE_API_BASE) {
    console.log(`RSVP API proxied to ${LIVE_API_BASE}`);
  } else {
    console.log(`RSVP API local — ${guestCountAtStartup} guest(s) in server/guests.json`);
    if (guestCountAtStartup === 0) {
      console.log('Add guests to server/guests.json or run: npm run sync-guests');
    }
  }
});
