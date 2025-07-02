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

  it('should link iterations to environments with correct roles based on type', async () => {
    // Arrange
    const mockEnvs = [
      { env_id: 'prod-id', env_name: 'PROD' },
      { env_id: 'ev1-id', env_name: 'EV1' },
      { env_id: 'ev2-id', env_name: 'EV2' },
      { env_id: 'ev3-id', env_name: 'EV3' },
    ];
    const mockIters = [
      { ite_id: 'cutover-iter-id', itt_code: 'CUTOVER' },
      { ite_id: 'run-iter-id', itt_code: 'RUN' },
      { ite_id: 'dr-iter-id', itt_code: 'DR' },
    ];
    const mockEnvRoles = [
      { enr_id: 'prod-role-id', enr_name: 'PROD' },
      { enr_id: 'backup-role-id', enr_name: 'BACKUP' },
      { enr_id: 'test-role-id', enr_name: 'TEST' },
    ];

    client.query.mockImplementation(query => {
      if (query.includes('SELECT env_id, env_name FROM environments_env')) return Promise.resolve({ rows: mockEnvs });
      if (query.includes('SELECT ite_id, itt_code FROM iterations_ite')) return Promise.resolve({ rows: mockIters });
      if (query.includes('SELECT enr_id, enr_name FROM environment_roles_enr')) return Promise.resolve({ rows: mockEnvRoles });
      if (query.includes('SELECT app_id FROM applications_app')) return Promise.resolve({ rows: [] }); // Handle app query
      return Promise.resolve({ rows: [] }); // Default for INSERTs
    });

    // Act
    await generateAllEnvironments({});

    // Assert
    const insertCalls = client.query.mock.calls.filter(call =>
      call[0].startsWith('INSERT INTO environments_env_x_iterations_ite')
    );

    expect(insertCalls.length).toBe(9);

    // Assertions for CUTOVER
    const cutoverCalls = insertCalls.filter(call => call[1][1] === 'cutover-iter-id');
    expect(cutoverCalls.length).toBe(3);
    const cutoverRoles = new Set(cutoverCalls.map(c => c[1][2]));
    expect(cutoverRoles).toContain('prod-role-id');
    expect(cutoverRoles).toContain('test-role-id');
    expect(cutoverRoles).toContain('backup-role-id');
    const cutoverProdLink = cutoverCalls.find(c => c[1][2] === 'prod-role-id');
    expect(cutoverProdLink[1][0]).toBe('prod-id');

    // Assertions for RUN
    const runCalls = insertCalls.filter(call => call[1][1] === 'run-iter-id');
    expect(runCalls.length).toBe(3);
    const runRoles = new Set(runCalls.map(c => c[1][2]));
    expect(runRoles).toContain('prod-role-id');
    expect(runRoles).toContain('test-role-id');
    expect(runRoles).toContain('backup-role-id');
    const runEnvs = new Set(runCalls.map(c => c[1][0]));
    expect(runEnvs.size).toBe(3);
    expect(runEnvs).not.toContain('prod-id');

    // Assertions for DR
    const drCalls = insertCalls.filter(call => call[1][1] === 'dr-iter-id');
    expect(drCalls.length).toBe(3);
    const drRoles = new Set(drCalls.map(c => c[1][2]));
    expect(drRoles).toContain('prod-role-id');
    expect(drRoles).toContain('test-role-id');
    expect(drRoles).toContain('backup-role-id');
    const drEnvs = new Set(drCalls.map(c => c[1][0]));
    expect(drEnvs.size).toBe(3);
    expect(drEnvs).not.toContain('prod-id');
  });

  it('should link every app to PROD and at least one TEST environment', async () => {
    // Arrange
    const mockEnvs = [
      { env_id: 'prod-id', env_name: 'PROD' },
      { env_id: 'ev1-id', env_name: 'EV1' }, // Designated TEST env
      { env_id: 'ev2-id', env_name: 'EV2' },
    ];
    const mockApps = [{ app_id: 'app1-id' }, { app_id: 'app2-id' }, { app_id: 'app3-id' }];
    const mockEnvRoles = [{ enr_id: 'test-role-id', enr_name: 'TEST' }]; // Simplified for this test

    client.query.mockImplementation(query => {
      if (query.includes('SELECT env_id, env_name FROM environments_env')) return Promise.resolve({ rows: mockEnvs });
      if (query.includes('SELECT app_id FROM applications_app')) return Promise.resolve({ rows: mockApps });
      if (query.includes('SELECT enr_id, enr_name FROM environment_roles_enr')) return Promise.resolve({ rows: mockEnvRoles });
      return Promise.resolve({ rows: [] }); // Default for INSERTs and other queries
    });

    // Act
    await generateAllEnvironments({});

    // Assert
    const insertCalls = client.query.mock.calls.filter(call =>
      call[0].startsWith('INSERT INTO environments_env_x_applications_app')
    );

    // Each app should be linked to PROD and the designated TEST env (EV1)
    const expectedLinkCount = mockApps.length * 2 + (mockEnvs.length - 2) * 1; // 3 apps * 2 links + 1 other test env * 1 random link
    // Note: The random link count is mocked to 1, so we expect one extra link for EV2.
    expect(insertCalls.length).toBe(mockApps.length * 2 + 1);

    const linkedAppsToProd = new Set();
    const linkedAppsToTest = new Set();

    insertCalls.forEach(call => {
      const [envId, appId] = call[1];
      if (envId === 'prod-id') linkedAppsToProd.add(appId);
      if (envId === 'ev1-id') linkedAppsToTest.add(appId);
    });

    // Verify all apps are linked to PROD and the designated TEST environment
    expect(linkedAppsToProd.size).toBe(mockApps.length);
    expect(linkedAppsToTest.size).toBe(mockApps.length);
    for (const app of mockApps) {
      expect(linkedAppsToProd.has(app.app_id)).toBe(true);
      expect(linkedAppsToTest.has(app.app_id)).toBe(true);
    }
  });

  it('should log a warning if not enough environments exist for iteration linking', async () => {
    // Arrange
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    client.query.mockResolvedValue({ rows: [{ env_id: 'prod-id', env_name: 'PROD' }] }); // Not enough envs

    // Act
    await generateAllEnvironments({});

    // Assert
    expect(consoleWarnSpy).toHaveBeenCalledWith('Warning: At least 3 environments and all required roles (PROD, BACKUP, TEST) must exist.');
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
