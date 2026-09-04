const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const port = Number(process.env.PORT) || 4173;
const root = __dirname;
const dataDirectory = path.join(root, 'data');
const participantFile = process.env.PARTICIPANT_FILE || path.join(dataDirectory, 'participants.xml');
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.obj': 'text/plain; charset=utf-8',
  '.png': 'image/png'
};

function escapeXml(value) {
  return String(value).replace(/[<>&'\"]/g, character => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;'
  }[character]));
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

function getClientIp(request) {
  const address = request.socket.remoteAddress || 'unknown';

  return address.startsWith('::ffff:') ? address.slice(7) : address;
}

function normalizeName(value) {
  return value.normalize('NFC').trim().replace(/\s+/gu, ' ');
}

function normalizeEmail(value) {
  return value.normalize('NFC').trim().toLowerCase();
}

function hasExistingParticipant(xml, name, email, ipAddress) {
  const entries = xml.match(/<participant>[\s\S]*?<\/participant>/g) || [];

  return entries.some(entry => {
    const storedName = entry.match(/<name>([\s\S]*?)<\/name>/)?.[1];
    const storedEmail = entry.match(/<email>([\s\S]*?)<\/email>/)?.[1];
    const storedIpAddress = entry.match(/<ipAddress>([\s\S]*?)<\/ipAddress>/)?.[1];

    return storedName && storedEmail && storedIpAddress &&
      normalizeName(storedName) === name &&
      normalizeEmail(storedEmail) === email &&
      storedIpAddress.trim() === ipAddress;
  });
}

function saveParticipant(request, response) {
  let body = '';

  request.on('data', chunk => {
    body += chunk;
    if (body.length > 10000) {
      request.destroy();
    }
  });

  request.on('end', () => {
    try {
      const participant = JSON.parse(body);
      const name = typeof participant.name === 'string' ? normalizeName(participant.name) : '';
      const email = typeof participant.email === 'string' ? normalizeEmail(participant.email) : '';
      const ipAddress = getClientIp(request);

      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        sendJson(response, 400, { error: 'Ungültige Teilnahme-Daten.' });
        return;
      }

      fs.mkdirSync(dataDirectory, { recursive: true });
      if (!fs.existsSync(participantFile)) {
        fs.writeFileSync(participantFile, '<?xml version="1.0" encoding="UTF-8"?>\n<participants>\n</participants>\n');
      }

      const xml = fs.readFileSync(participantFile, 'utf8');

      if (hasExistingParticipant(xml, name, email, ipAddress)) {
        sendJson(response, 409, { error: 'Diese Teilnahme wurde bereits gespeichert.' });
        return;
      }

      const entry = [
        '  <participant>',
        `    <id>${crypto.randomUUID()}</id>`,
        `    <name>${escapeXml(name)}</name>`,
        `    <email>${escapeXml(email)}</email>`,
        `    <ipAddress>${escapeXml(ipAddress)}</ipAddress>`,
        `    <completedAt>${escapeXml(new Date().toISOString())}</completedAt>`,
        '  </participant>\n'
      ].join('\n');
      fs.writeFileSync(participantFile, xml.replace('</participants>', `${entry}</participants>`));

      sendJson(response, 201, { message: 'Teilnahme gespeichert.' });
    } catch (error) {
      sendJson(response, 400, { error: 'Die Teilnahme konnte nicht gespeichert werden.' });
    }
  });
}

function serveFile(request, response) {
  const requestedPath = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  const relativePath = requestedPath === '/' ? 'index.html' : requestedPath.slice(1);
  const filePath = path.resolve(root, relativePath);

  if (
    !filePath.startsWith(root) ||
    relativePath === 'data' ||
    relativePath.startsWith('data/') ||
    !fs.existsSync(filePath) ||
    fs.statSync(filePath).isDirectory()
  ) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }

  response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(response);
}

function createServer() {
  return http.createServer((request, response) => {
    if (request.method === 'POST' && request.url === '/api/participants') {
      saveParticipant(request, response);
      return;
    }

    if (request.method === 'GET') {
      serveFile(request, response);
      return;
    }

    response.writeHead(405);
    response.end('Method not allowed');
  });
}

if (require.main === module) {
  createServer().listen(port, () => {
    console.log(`SynergyQuest läuft auf http://localhost:${port}`);
  });
}

module.exports = {
  createServer,
  hasExistingParticipant,
  normalizeEmail,
  normalizeName
};
