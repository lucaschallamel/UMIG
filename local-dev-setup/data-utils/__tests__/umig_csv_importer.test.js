const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

describe('umig_csv_importer.js', () => {
  const fixtureDir = path.resolve(__dirname, 'fixtures');
  const script = path.resolve(__dirname, '../umig_csv_importer.js');
  const csv = path.join(fixtureDir, 'fixture_team_members.csv');
  const mapping = path.join(fixtureDir, 'fixture_team_members_mapping.json');

  test('dry-run validates all rows as valid', () => {
    const result = spawnSync('node', [script, '--table', 'team_members', '--csv', csv, '--mapping-file', mapping, '--env', 'dev', '--dry-run'], {
      encoding: 'utf-8'
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/DRY RUN: Validation complete/);
    expect(result.stdout).toMatch(/Valid rows: 4/);
    expect(result.stdout).toMatch(/Invalid rows: 0/);
  });

  test('fails on missing required env', () => {
    // Only run this test if .env is missing, never modify .env
    const envPath = path.resolve(__dirname, '../../.env');
    if (fs.existsSync(envPath)) {
      console.warn('Skipping .env missing test because .env exists and tests are not allowed to modify it.');
      return;
    }
    const result = spawnSync('node', [script, '--table', 'team_members', '--csv', csv, '--mapping-file', mapping, '--env', 'dev', '--dry-run'], {
      encoding: 'utf-8'
    });
    expect(result.status).not.toBe(0);
    expect(result.stdout + result.stderr).toMatch(/ERROR: .env file not found/);
  });
});
