const { client } = require('../../lib/db');
const { generateMigrations } = require('../../generators/05_generate_migrations');
const { faker } = require('../../lib/utils');

// Mock dependencies
jest.mock('../../lib/db', () => ({ client: { query: jest.fn() } }));
jest.mock('../../lib/utils', () => ({
  faker: {
    company: { name: jest.fn(() => 'FakeCorp') },
    lorem: { paragraph: jest.fn(() => 'A paragraph.'), sentence: jest.fn(() => 'A sentence.') },
    helpers: { arrayElement: jest.fn(arr => arr[0]) },
    date: { between: jest.fn(() => new Date()), soon: jest.fn(() => new Date()) },
    number: { int: jest.fn(() => 1) },
  },
}));

const CONFIG = {
  num_migrations: 2,
  mig_start_date_range: ['2023-01-01', '2023-06-01'],
  mig_duration_months: 6,
  iterations: {
    run: 1,
    dr: 1,
    cutover: 1,
  },
};

describe('Migrations Generator (05_generate_migrations.js)', () => {
  beforeEach(() => {
    client.query.mockReset();
    jest.clearAllMocks();
  });

  it('should call resetMigrationsTables when reset option is true', async () => {
    // Arrange
    client.query.mockImplementation(query => {
      if (query.includes('TRUNCATE')) return Promise.resolve({ rows: [] });
      if (query.includes('FROM users_usr')) return Promise.resolve({ rows: [{ usr_id: 'user-1' }] });
      if (query.includes('FROM environments_env')) return Promise.resolve({ rows: [{ env_id: 'env-1' }, { env_id: 'env-2' }] });
      if (query.includes('FROM environment_roles_enr')) {
        return Promise.resolve({ rows: [
          { enr_id: 'prod-role-id', enr_name: 'PROD' },
          { enr_id: 'test-role-id', enr_name: 'TEST' },
          { enr_id: 'backup-role-id', enr_name: 'BACKUP' },
        ]});
      }
      // Default for INSERTs
      return Promise.resolve({ rows: [{ mig_id: 'mig-1' }, {ite_id: 'ite-1'}] });
    });

    // Act
    await generateMigrations(CONFIG, { reset: true });

    // Assert
    expect(client.query).toHaveBeenCalledWith('TRUNCATE TABLE "migrations_mig" RESTART IDENTITY CASCADE');
  });

  it('should throw an error if no users are found', async () => {
    // Arrange
    client.query.mockResolvedValue({ rows: [] });

    // Act & Assert
    await expect(generateMigrations(CONFIG, {})).rejects.toThrow('Cannot generate migrations without users to assign as owners.');
  });

  it('should throw an error if less than 2 environments are found', async () => {
    // Arrange
    client.query
      .mockResolvedValueOnce({ rows: [{ usr_id: 'user-1' }] })
      .mockResolvedValueOnce({ rows: [{ env_id: 'env-1' }] });

    // Act & Assert
    await expect(generateMigrations(CONFIG, {})).rejects.toThrow('Cannot generate iteration environments without at least 2 environments defined.');
  });

  it('should throw an error if required environment roles are missing', async () => {
    // Arrange
    client.query
      .mockResolvedValueOnce({ rows: [{ usr_id: 'user-1' }] })
      .mockResolvedValueOnce({ rows: [{ env_id: 'env-1' }, { env_id: 'env-2' }] })
      .mockResolvedValueOnce({ rows: [{ enr_id: 'prod-role-id', enr_name: 'PROD' }] }); // Missing TEST and BACKUP

    // Act & Assert
    await expect(generateMigrations(CONFIG, {})).rejects.toThrow('Required environment roles (PROD, TEST, BACKUP) not found.');
  });

  it('should generate migrations and iterations correctly in a happy path scenario', async () => {
    // Arrange
    const mockUsers = [{ usr_id: 'user-1' }];
    const mockEnvs = [{ env_id: 'env-1' }, { env_id: 'env-2' }, { env_id: 'env-3' }];
    const mockEnvRoles = [
      { enr_id: 'prod-role-id', enr_name: 'PROD' },
      { enr_id: 'test-role-id', enr_name: 'TEST' },
      { enr_id: 'backup-role-id', enr_name: 'BACKUP' },
    ];

    client.query.mockImplementation(query => {
      if (query.includes('FROM users_usr')) return Promise.resolve({ rows: mockUsers });
      if (query.includes('FROM environments_env')) return Promise.resolve({ rows: mockEnvs });
      if (query.includes('FROM environment_roles_enr')) return Promise.resolve({ rows: mockEnvRoles });
      if (query.includes('INSERT INTO migrations_mig')) return Promise.resolve({ rows: [{ mig_id: 'mig-1' }] });
      if (query.includes('INSERT INTO iterations_ite')) return Promise.resolve({ rows: [{ ite_id: 'ite-1' }] });
      if (query.includes('INSERT INTO iteration_environments_ien')) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });

    // Act
    await generateMigrations(CONFIG, {});

    // Assert
    const migrationInserts = client.query.mock.calls.filter(c => c[0].includes('INSERT INTO migrations_mig'));
    expect(migrationInserts.length).toBe(CONFIG.num_migrations);

    const iterationInserts = client.query.mock.calls.filter(c => c[0].includes('INSERT INTO iterations_ite'));
    const totalExpectedIterations = CONFIG.num_migrations * (CONFIG.iterations.run + CONFIG.iterations.dr + CONFIG.iterations.cutover);
    expect(iterationInserts.length).toBe(totalExpectedIterations);

    // Check that a CUTOVER iteration was created
    expect(faker.helpers.arrayElement).toHaveBeenCalledWith(['MIGRATION', 'DR_TEST']);
  });
});
