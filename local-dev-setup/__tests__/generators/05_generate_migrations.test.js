import { client } from '../../scripts/lib/db.js';
import { generateMigrations, eraseMigrationTables } from '../../scripts/generators/05_generate_migrations.js';
import { faker, randomDateInRange, nextThursday } from '../../scripts/lib/utils.js';

// Mock dependencies
jest.mock('../../scripts/lib/db.js', () => ({ client: { query: jest.fn() } }));
jest.mock('../../scripts/lib/utils.js', () => ({
  faker: {
    helpers: { arrayElement: jest.fn() },
    company: { catchPhrase: jest.fn() },
    lorem: { sentence: jest.fn() },
    number: { int: jest.fn() },
  },
  randomDateInRange: jest.fn(),
  nextThursday: jest.fn(),
}));

const CONFIG = {
  MIGRATIONS: {
    COUNT: 2,
    TYPE: 'EXTERNAL',
    START_DATE_RANGE: ['2024-11-01', '2025-06-01'],
    DURATION_MONTHS: 6,
    ITERATIONS: {
      RUN: { min: 2, max: 4 },
      DR: { min: 1, max: 3 },
      CUTOVER: 1,
    },
  },
  CANONICAL_PLANS: {
    PER_MIGRATION: 1,
  },
};

describe('Migrations Generator (05_generate_migrations.js)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Setup default faker mocks
    faker.helpers.arrayElement.mockImplementation(arr => arr[0]);
    faker.company.catchPhrase.mockReturnValue('a catchphrase');
    faker.lorem.sentence.mockReturnValue('a sentence');
    faker.number.int.mockImplementation(({ min, max }) => min); // Default to min value
    randomDateInRange.mockReturnValue(new Date('2025-01-01T00:00:00.000Z'));
    nextThursday.mockReturnValue(new Date('2025-01-09T00:00:00.000Z'));
  });

  describe('generateMigrations', () => {
    const mockUsers = [{ usr_id: 'user-1' }];
    const mockPlans = [{ plm_id: 'plan-1' }, { plm_id: 'plan-2' }];

    it('should throw an error if not enough canonical plans are available', async () => {
      client.query
        .mockResolvedValueOnce({ rows: mockUsers })
        .mockResolvedValueOnce({ rows: [{ plm_id: 'plan-1' }] }); // Not enough plans

      await expect(generateMigrations(CONFIG, {})).rejects.toThrow('Cannot generate migrations: Not enough canonical plans available. Need 2, found 1.');
    });

    it('should generate the correct number and type of iterations per plan', async () => {
      let migInsertCount = 0;
      const iterationCounts = { RUN: 0, DR: 0, CUTOVER: 0 };

      client.query.mockImplementation((sql, values) => {
        if (sql.includes('SELECT usr_id FROM users_usr')) return Promise.resolve({ rows: mockUsers });
        if (sql.includes('SELECT plm_id FROM plans_master_plm')) return Promise.resolve({ rows: mockPlans });
        if (sql.includes('INSERT INTO migrations_mig')) {
          migInsertCount++;
          return Promise.resolve({ rows: [{ mig_id: `mig-${migInsertCount}` }] });
        }
        if (sql.includes('INSERT INTO iterations_ite')) {
          const iterType = values[2]; // itt_code is the 3rd parameter
          if (iterationCounts.hasOwnProperty(iterType)) {
            iterationCounts[iterType]++;
          }
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      await generateMigrations(CONFIG, {});

      const { COUNT, ITERATIONS } = CONFIG.MIGRATIONS;
      const { PER_MIGRATION } = CONFIG.CANONICAL_PLANS;
      const expectedPlans = COUNT * PER_MIGRATION;

      expect(migInsertCount).toBe(COUNT);
      expect(iterationCounts.RUN).toBe(expectedPlans * ITERATIONS.RUN.min);
      expect(iterationCounts.DR).toBe(expectedPlans * ITERATIONS.DR.min);
      expect(iterationCounts.CUTOVER).toBe(expectedPlans * ITERATIONS.CUTOVER);
    });
  });

  describe('eraseMigrationTables', () => {
    it('should only truncate tables it is responsible for', async () => {
      client.query.mockResolvedValue({ rows: [] });
      await eraseMigrationTables(client);
      const expectedTables = ['iterations_ite', 'migrations_mig'];
      const calls = client.query.mock.calls.map(c => c[0]);

      // Verify only the correct tables are truncated
      expect(calls).toHaveLength(expectedTables.length);
      expectedTables.forEach(table => {
        expect(calls).toContain(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
      });

      // Verify it does NOT truncate tables it doesn't own
      const forbiddenTables = ['steps_master_stm', 'phases_master_phm', 'sequences_master_sqm', 'plans_master_plm'];
      forbiddenTables.forEach(table => {
        expect(calls).not.toContain(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
      });
    });
  });
});