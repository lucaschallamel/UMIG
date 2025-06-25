const { client } = require('../../lib/db');
const { generateAllEnvironments } = require('../../generators/04_generate_environments');
const { ENVIRONMENTS, faker } = require('../../lib/utils');

// Mock dependencies
jest.mock('../../lib/db', () => ({ client: { query: jest.fn() } }));
jest.mock('../../lib/utils', () => ({
  faker: {
    company: { catchPhrase: jest.fn(() => 'A catchphrase') },
    lorem: { sentence: jest.fn(() => 'A sentence') },
    number: { int: jest.fn(() => 1) }, // Add mock for faker.number.int
  },
  ENVIRONMENTS: [{ name: 'PROD' }, { name: 'EV1' }, { name: 'EV2' }, { name: 'EV3' }],
}));

describe('Environments Generator (04_generate_environments.js)', () => {
  beforeEach(() => {
    client.query.mockReset();
  });

  it('should call resetEnvironmentsTables when reset option is true', async () => {
    // Arrange
    client.query.mockResolvedValue({ rows: [] }); // Mock all DB calls to avoid errors

    // Act
    await generateAllEnvironments({ reset: true });

    // Assert
    expect(client.query).toHaveBeenCalledWith('TRUNCATE TABLE "environments_env" RESTART IDENTITY CASCADE');
    expect(client.query).toHaveBeenCalledWith('TRUNCATE TABLE "environments_env_x_iterations_ite" RESTART IDENTITY CASCADE');
    expect(client.query).toHaveBeenCalledWith('TRUNCATE TABLE "environments_env_x_applications_app" RESTART IDENTITY CASCADE');
  });

  it('should generate environments and link them correctly in a happy path scenario', async () => {
    // Arrange
    const mockEnvs = [{ env_id: 'prod-id', env_name: 'PROD' }, { env_id: 'ev1-id', env_name: 'EV1' }, { env_id: 'ev2-id', env_name: 'EV2' }];
    const mockIters = [{ ite_id: 'run-iter-id', itt_code: 'RUN' }, { ite_id: 'cutover-iter-id', itt_code: 'CUTOVER' }];
    const mockApps = [{ app_id: 'app1-id' }, { app_id: 'app2-id' }];
    const mockEnvRoles = [
      { enr_id: 'prod-role-id', enr_name: 'PROD' },
      { enr_id: 'backup-role-id', enr_name: 'BACKUP' },
      { enr_id: 'test-role-id', enr_name: 'TEST' },
    ];

    client.query.mockImplementation(query => {
      if (query.includes('SELECT env_id, env_name FROM environments_env')) return Promise.resolve({ rows: mockEnvs });
      if (query.includes('SELECT ite_id, itt_code FROM iterations_ite')) return Promise.resolve({ rows: mockIters });
      if (query.includes('SELECT app_id FROM applications_app')) return Promise.resolve({ rows: mockApps });
      if (query.includes('SELECT enr_id, enr_name FROM environment_roles_enr')) return Promise.resolve({ rows: mockEnvRoles });
      return Promise.resolve({ rows: [] }); // Default for INSERTs
    });

    // Act
    await generateAllEnvironments({});

    // Assert: Check if environments were created
    expect(client.query).toHaveBeenCalledWith(
      'INSERT INTO environments_env (env_name, env_code, env_description) VALUES ($1, $1, $2) ON CONFLICT (env_code) DO NOTHING',
      ['PROD', 'A catchphrase']
    );

    // Assert: Check if a CUTOVER link was made correctly with the correct role ID
    expect(client.query).toHaveBeenCalledWith(
      'INSERT INTO environments_env_x_iterations_ite (env_id, ite_id, enr_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      ['prod-id', 'cutover-iter-id', 'prod-role-id']
    );

    // Assert: Check if an app link was made correctly to PROD (no comments column)
    expect(client.query).toHaveBeenCalledWith(
        'INSERT INTO environments_env_x_applications_app (env_id, app_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        ['prod-id', 'app1-id']
    );
  });

  it('should log a warning if not enough environments exist for iteration linking', async () => {
    // Arrange
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    client.query.mockResolvedValue({ rows: [{ env_id: 'prod-id', env_name: 'PROD' }] }); // Not enough envs

    // Act
    await generateAllEnvironments({});

    // Assert
    expect(consoleWarnSpy).toHaveBeenCalledWith('Warning: Required environments or roles (PROD, BACKUP, TEST) not found.');
    consoleWarnSpy.mockRestore();
  });

  it('should log a warning if not enough applications exist for linking', async () => {
    // Arrange
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    client.query
      .mockResolvedValueOnce({ rows: [{ env_id: 'prod-id', env_name: 'PROD' }, { env_id: 'ev1-id', env_name: 'EV1' }] })
      .mockResolvedValueOnce({ rows: [] }) // No apps
      .mockResolvedValue({ rows: [] });

    // Act
    await generateAllEnvironments({});

    // Assert
    expect(consoleWarnSpy).toHaveBeenCalledWith('Warning: Not enough environments or applications to link.');
    consoleWarnSpy.mockRestore();
  });

  it('should throw an error if a database query fails', async () => {
    // Arrange
    const mockError = new Error('DB Error');
    client.query.mockRejectedValue(mockError);
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Act & Assert
    await expect(generateAllEnvironments({})).rejects.toThrow(mockError);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error generating environments and links:', mockError);

    consoleErrorSpy.mockRestore();
  });
});
