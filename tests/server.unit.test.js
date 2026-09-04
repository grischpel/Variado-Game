const {
  hasExistingParticipant,
  normalizeEmail,
  normalizeName
} = require('../server');

describe('Participant normalization', () => {
  test('reduces whitespace and normalizes Unicode in names', () => {
    expect(normalizeName('  Max   Mustermann  ')).toBe('Max Mustermann');
    expect(normalizeName('Cafe\u0301  Test')).toBe('Café Test');
  });

  test('trims and standardizes email addresses', () => {
    expect(normalizeEmail('  TEST@Example.COM ')).toBe('test@example.com');
  });
});

describe('Duplicate detection', () => {
  const xml = `
    <participants>
      <participant>
        <name>Max Mustermann</name>
        <email>test@example.com</email>
        <ipAddress>127.0.0.1</ipAddress>
      </participant>
    </participants>
  `;

  test('detects the same normalized combination of name, email, and IP', () => {
    expect(hasExistingParticipant(
      xml,
      normalizeName(' Max   Mustermann '),
      normalizeEmail('TEST@example.com'),
      '127.0.0.1'
    )).toBe(true);
  });

  test('accepts the same email and IP with a different name', () => {
    expect(hasExistingParticipant(
      xml,
      'Erika Musterfrau',
      'test@example.com',
      '127.0.0.1'
    )).toBe(false);
  });

  test('accepts the same name and email with a different IP', () => {
    expect(hasExistingParticipant(
      xml,
      'Max Mustermann',
      'test@example.com',
      '192.168.1.10'
    )).toBe(false);
  });
});
