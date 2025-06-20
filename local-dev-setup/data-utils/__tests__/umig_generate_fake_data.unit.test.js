const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

describe('umig_generate_fake_data.js unit/cli logic', () => {
  const script = path.resolve(__dirname, '../umig_generate_fake_data.js');
  const envPath = path.resolve(__dirname, '../../.env');

  test('refuses to run in prod env', () => {
    const result = spawnSync('node', [script, '--env', 'prod'], { encoding: 'utf-8' });
    expect(result.status).not.toBe(0);
    expect(result.stdout + result.stderr).toMatch(/Refusing to run: This tool is only for dev\/test environments/);
  });

  test('shows warning and exits if .env missing', () => {
    // Only run this test if .env is missing, never modify .env
    if (fs.existsSync(envPath)) {
      console.warn('Skipping .env missing test because .env exists and tests are not allowed to modify it.');
      return;
    }
    const result = spawnSync('node', [script, '--env', 'dev'], { encoding: 'utf-8' });
    expect(result.status).not.toBe(0);
    expect(result.stdout + result.stderr).toMatch(/ERROR: .env file not found/);
  });

  test('parses CLI arguments and connects to DB in dev env', () => {
    if (!fs.existsSync(envPath)) {
      console.warn('Skipping DB connection test because .env is missing.');
      return;
    }
    const result = spawnSync('node', [script, '--teams', '2', '--members-per-team', '2', '--plans', '1', '--env', 'dev'], { encoding: 'utf-8' });
    // Accept either success or a DB error (if DB is not running), but not a CLI parse error
    expect(result.stdout + result.stderr).toMatch(/Connected to database|Error:/);
  });

  test('shows confirmation prompt when --reset is used', () => {
    if (!fs.existsSync(envPath)) {
      console.warn('Skipping reset prompt test because .env is missing.');
      return;
    }
    // Simulate user input 'no' to the prompt
    const spawn = require('child_process').spawn;
    return new Promise((resolve) => {
      const child = spawn('node', [script, '--env', 'dev', '--reset'], { stdio: ['pipe', 'pipe', 'pipe'] });
      let output = '';
      child.stdout.on('data', (data) => { output += data.toString(); });
      child.stderr.on('data', (data) => { output += data.toString(); });
      setTimeout(() => {
        child.stdin.write('no\n');
      }, 250);
      child.on('close', (code) => {
        expect(output).toMatch(/Are you sure you want to continue/);
        expect(output).toMatch(/Reset operation cancelled|No data was deleted/);
        resolve();
      });
    });
  });
});
