const { spawnSync } = require('child_process');
const path = require('path');

describe('umig_generate_fake_data.js', () => {
  const script = path.resolve(__dirname, '../umig_generate_fake_data.js');

  test('refuses to run in prod env', () => {
    const result = spawnSync('node', [script, '--env', 'prod'], { encoding: 'utf-8' });
    expect(result.status).not.toBe(0);
    expect(result.stdout + result.stderr).toMatch(/Refusing to run: This tool is only for dev\/test environments/);
  });

  test('shows warning and exits if .env missing', () => {
    const fs = require('fs');
    const envPath = path.resolve(__dirname, '../../.env');
    const tempPath = envPath + '.bak';
    if (fs.existsSync(envPath)) fs.renameSync(envPath, tempPath);
    const result = spawnSync('node', [script, '--env', 'dev'], { encoding: 'utf-8' });
    if (fs.existsSync(tempPath)) fs.renameSync(tempPath, envPath);
    expect(result.status).not.toBe(0);
    expect(result.stdout + result.stderr).toMatch(/ERROR: .env file not found/);
  });
});
