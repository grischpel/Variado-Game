const fs = require('fs');
const os = require('os');
const path = require('path');

const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'synergyquest-test-'));
const participantFile = path.join(temporaryDirectory, 'participants.xml');
process.env.PARTICIPANT_FILE = participantFile;

const { createServer } = require('../server');

describe('Teilnahme-API', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    server = createServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  test('speichert normalisierte Daten als XML', async () => {
    const response = await fetch(`${baseUrl}/api/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '  Max   Mustermann  ',
        email: 'TEST@EXAMPLE.COM'
      })
    });

    expect(response.status).toBe(201);
    const xml = fs.readFileSync(participantFile, 'utf8');

    expect(xml).toContain('<name>Max Mustermann</name>');
    expect(xml).toContain('<email>test@example.com</email>');
    expect(xml).toContain('<ipAddress>127.0.0.1</ipAddress>');
  });

  test('weist nur eine vollständig identische Teilnahme ab', async () => {
    const duplicate = await fetch(`${baseUrl}/api/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Max Mustermann', email: 'test@example.com' })
    });
    const differentName = await fetch(`${baseUrl}/api/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Erika Musterfrau', email: 'test@example.com' })
    });

    expect(duplicate.status).toBe(409);
    expect(differentName.status).toBe(201);
  });

  test('weist unvollständige oder ungültige Daten mit 400 zurück', async () => {
    const response = await fetch(`${baseUrl}/api/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '', email: 'not-an-email' })
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Ungültige Teilnahme-Daten.' });
  });

  test('liefert die private XML-Datei nicht aus', async () => {
    const response = await fetch(`${baseUrl}/data/participants.xml`);

    expect(response.status).toBe(404);
  });
});
