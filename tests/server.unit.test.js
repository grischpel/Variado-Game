const {
  hasExistingParticipant,
  normalizeEmail,
  normalizeName
} = require('../server');

describe('Teilnehmer-Normalisierung', () => {
  test('reduziert Leerzeichen und normalisiert Unicode im Namen', () => {
    expect(normalizeName('  Max   Mustermann  ')).toBe('Max Mustermann');
    expect(normalizeName('Cafe\u0301  Test')).toBe('Café Test');
  });

  test('trimmt und vereinheitlicht E-Mail-Adressen', () => {
    expect(normalizeEmail('  TEST@Example.COM ')).toBe('test@example.com');
  });
});

describe('Dublettenprüfung', () => {
  const xml = `
    <participants>
      <participant>
        <name>Max Mustermann</name>
        <email>test@example.com</email>
        <ipAddress>127.0.0.1</ipAddress>
      </participant>
    </participants>
  `;

  test('erkennt gleiche normalisierte Kombination aus Name, E-Mail und IP', () => {
    expect(hasExistingParticipant(
      xml,
      normalizeName(' Max   Mustermann '),
      normalizeEmail('TEST@example.com'),
      '127.0.0.1'
    )).toBe(true);
  });

  test('akzeptiert gleiche E-Mail und IP bei anderem Namen', () => {
    expect(hasExistingParticipant(
      xml,
      'Erika Musterfrau',
      'test@example.com',
      '127.0.0.1'
    )).toBe(false);
  });

  test('akzeptiert gleichen Namen und gleiche E-Mail bei anderer IP', () => {
    expect(hasExistingParticipant(
      xml,
      'Max Mustermann',
      'test@example.com',
      '192.168.1.10'
    )).toBe(false);
  });
});
