import { client } from '../../scripts/lib/db.js';
import { generateMigrations, eraseMigrationTables } from '../../scripts/generators/005_generate_migrations.js';
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

  const mockUsers = [{ usr_id: 'user-1' }, { usr_id: 'user-2' }];
  const mockPlans = [{ plm_id: 'plan-1' }, { plm_id: 'plan-2' }];

  const mockDbSuccess = () => {
    client.query.mockImplementation((sql) => {
      if (sql.includes('SELECT usr_id FROM users_usr')) return Promise.resolve({ rows: mockUsers });
      if (sql.includes('SELECT plm_id FROM plans_master_plm')) return Promise.resolve({ rows: mockPlans });
      if (sql.includes('SELECT sts_id, sts_name FROM status_sts WHERE sts_type = $1') && sql.includes("'Migration'")) {
        return Promise.resolve({ rows: [{ sts_id: 1, sts_name: 'PLANNING' }, { sts_id: 2, sts_name: 'IN_PROGRESS' }] });
      }
      if (sql.includes('SELECT sts_id, sts_name FROM status_sts WHERE sts_type = $1') && sql.includes("'Iteration'")) {
        return Promise.resolve({ rows: [{ sts_id: 3, sts_name: 'PLANNING' }, { sts_id: 4, sts_name: 'IN_PROGRESS' }] });
      }
      if (sql.includes('INSERT INTO migrations_mig')) return Promise.resolve({ rows: [{ mig_id: `mig-${Math.random()}` }] });
      return Promise.resolve({ rows: [] }); // For INSERT/TRUNCATE
    });
  };

  describe('generateMigrations', () => {
    it('should call eraseMigrationTables when erase option is true', async () => {
      mockDbSuccess();
      await generateMigrations(CONFIG, { erase: true });
      const truncateCalls = client.query.mock.calls.filter(c => c[0].startsWith('TRUNCATE'));
      expect(truncateCalls.length).toBe(2);
      expect(truncateCalls[0][0]).toContain('iterations_ite');
      expect(truncateCalls[1][0]).toContain('migrations_mig');
    });

    it('should throw an error if no users are available', async () => {
      client.query.mockResolvedValueOnce({ rows: [] }); // No users
      await expect(generateMigrations(CONFIG, {})).rejects.toThrow('Cannot generate migrations: No users found in the database.');
    });

    it('should throw an error if not enough canonical plans are available', async () => {
      client.query
        .mockResolvedValueOnce({ rows: mockUsers })
        .mockResolvedValueOnce({ rows: [{ plm_id: 'plan-1' }] }); // Not enough plans

      await expect(generateMigrations(CONFIG, {})).rejects.toThrow('Cannot generate migrations: Not enough canonical plans available. Need 2, found 1.');
    });

    it('should generate migrations and iterations with correct associations', async () => {
      const capturedData = {
        migrations: [],
        iterations: [],
      };

      client.query.mockImplementation((sql, values) => {
        if (sql.includes('SELECT usr_id FROM users_usr')) return Promise.resolve({ rows: mockUsers });
        if (sql.includes('SELECT plm_id FROM plans_master_plm')) return Promise.resolve({ rows: mockPlans });
        if (sql.includes('SELECT sts_id, sts_name FROM status_sts WHERE sts_type = $1') && values && values[0] === 'Migration') {
          return Promise.resolve({ rows: [{ sts_id: 1, sts_name: 'PLANNING' }, { sts_id: 2, sts_name: 'IN_PROGRESS' }] });
        }
        if (sql.includes('SELECT sts_id, sts_name FROM status_sts WHERE sts_type = $1') && values && values[0] === 'Iteration') {
          return Promise.resolve({ rows: [{ sts_id: 3, sts_name: 'PLANNING' }, { sts_id: 4, sts_name: 'IN_PROGRESS' }] });
        }
        if (sql.includes('INSERT INTO migrations_mig')) {
          const migId = `mig-${capturedData.migrations.length + 1}`;
          capturedData.migrations.push({ usr_id_owner: values[0] });
          return Promise.resolve({ rows: [{ mig_id: migId }] });
        }
        if (sql.includes('INSERT INTO iterations_ite')) {
          capturedData.iterations.push({ mig_id: values[0], plm_id: values[1], itt_code: values[2] });
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      await generateMigrations(CONFIG, {});

      const { COUNT, ITERATIONS } = CONFIG.MIGRATIONS;
      const { PER_MIGRATION } = CONFIG.CANONICAL_PLANS;
      const expectedPlansUsed = COUNT * PER_MIGRATION;
      const expectedRun = expectedPlansUsed * ITERATIONS.RUN.min;
      const expectedDr = expectedPlansUsed * ITERATIONS.DR.min;
      const expectedCutover = expectedPlansUsed * ITERATIONS.CUTOVER;

      // Check total counts
      expect(capturedData.migrations.length).toBe(COUNT);
      expect(capturedData.iterations.length).toBe(expectedRun + expectedDr + expectedCutover);

      // Check associations
      expect(capturedData.migrations[0].usr_id_owner).toBe(mockUsers[0].usr_id);
      expect(capturedData.migrations[1].usr_id_owner).toBe(mockUsers[0].usr_id); // faker mock always returns first element

      // Check iteration counts per type
      const iterationCounts = capturedData.iterations.reduce((acc, iter) => {
        acc[iter.itt_code] = (acc[iter.itt_code] || 0) + 1;
        return acc;
      }, {});
      expect(iterationCounts.RUN).toBe(expectedRun);
      expect(iterationCounts.DR).toBe(expectedDr);
      expect(iterationCounts.CUTOVER).toBe(expectedCutover);

      // Check that correct plans are linked
      const linkedPlanIds = [...new Set(capturedData.iterations.map(i => i.plm_id))];
      expect(linkedPlanIds).toHaveLength(expectedPlansUsed);
      expect(linkedPlanIds).toEqual(expect.arrayContaining(['plan-1', 'plan-2']));
    });
  });

  describe('eraseMigrationTables', () => {
    it('should truncate all migration-related tables in the correct order', async () => {
      client.query.mockResolvedValue({ rows: [] });
      await eraseMigrationTables(client);
      const calls = client.query.mock.calls.map(c => c[0]);

      expect(calls).toEqual([
        'TRUNCATE TABLE "iterations_ite" RESTART IDENTITY CASCADE',
        'TRUNCATE TABLE "migrations_mig" RESTART IDENTITY CASCADE',
      ]);
    });

    it('should throw an error if truncation fails', async () => {
      const dbError = new Error('DB truncate failed');
      client.query.mockRejectedValue(dbError);

      await expect(eraseMigrationTables(client)).rejects.toThrow(dbError);
    });
  });
});