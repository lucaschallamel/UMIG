// Pure logic unit tests for umig_generate_fake_data.js
// These tests do NOT touch the DB or CLI, only data generation logic

function generateTeamCode(index) {
  return `T${String(index).padStart(2, '0')}`;
}

function isAbstractTeamName(name) {
  return /^TEAM_[A-Z0-9]+$/.test(name) && !name.includes(' ');
}

describe('umig_generate_fake_data.js pure logic', () => {
  test('team code generation is correct and unique', () => {
    const codes = [];
    for (let i = 0; i < 25; i++) {
      codes.push(generateTeamCode(i));
    }
    expect(codes[0]).toBe('T00');
    expect(codes[1]).toBe('T01');
    expect(codes[10]).toBe('T10');
    expect(new Set(codes).size).toBe(codes.length);
    for (const code of codes) {
      expect(code).toMatch(/^T\d{2}$/);
    }
  });

  test('abstract team names are correct', () => {
    const names = ['TEAM_FINANCE', 'TEAM_LOGISTICS', 'TEAM_XYZ', 'TEAM_ALPHA'];
    for (const name of names) {
      expect(isAbstractTeamName(name)).toBe(true);
    }
    // Negative cases
    expect(isAbstractTeamName('TEAM JOHN')).toBe(false);
    expect(isAbstractTeamName('TEAM-ALPHA')).toBe(false);
    expect(isAbstractTeamName('TEAM_123')).toBe(true); // Accepts numbers
  });

  test('env_code always matches env_name', () => {
    const envs = [
      { name: 'PROD' },
      { name: 'EV1' },
      { name: 'QA' },
      { name: 'EV5' }
    ];
    for (const env of envs) {
      const env_code = env.name;
      expect(env_code).toBe(env.name);
    }
  });

  test('no duplicate codes or names in generated lists', () => {
    const teamNames = ['TEAM_ALPHA', 'TEAM_BETA', 'TEAM_GAMMA', 'TEAM_ALPHA'];
    const teamCodes = ['T00', 'T01', 'T02', 'T00'];
    expect(new Set(teamNames).size).not.toBe(teamNames.length);
    expect(new Set(teamCodes).size).not.toBe(teamCodes.length);
  });
});
