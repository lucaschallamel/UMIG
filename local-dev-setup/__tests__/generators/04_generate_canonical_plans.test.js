import { client } from '../../scripts/lib/db.js';
import { generateCanonicalPlans, eraseCanonicalPlanTables } from '../../scripts/generators/04_generate_canonical_plans.js';
import { faker } from '../../scripts/lib/utils.js';

// Mock dependencies
jest.mock('../../scripts/lib/db.js', () => ({
  client: {
    query: jest.fn(),
  },
}));

jest.mock('../../scripts/lib/utils.js', () => ({
  faker: {
    helpers: {
      arrayElement: jest.fn(),
    },
    number: {
      int: jest.fn(),
    },
    lorem: {
      sentence: jest.fn(),
      words: jest.fn(),
      paragraph: jest.fn(),
    },
  },
}));

const CONFIG = {
  MIGRATIONS: { COUNT: 1 },
  CANONICAL_PLANS: { PER_MIGRATION: 1 },
};

describe('Canonical Plans Generator (04_generate_canonical_plans.js)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Silence console output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Setup default faker mocks
    faker.helpers.arrayElement.mockImplementation(arr => arr[0]);
    faker.number.int.mockReturnValue(2); // Generate 2 of each sub-item
    faker.lorem.sentence.mockReturnValue('A mock sentence.');
    faker.lorem.words.mockReturnValue('mock words');
    faker.lorem.paragraph.mockReturnValue('A mock paragraph.');
  });

  describe('generateCanonicalPlans', () => {
    const mockTeams = [{ tms_id: 'team-1' }];
    const mockStepTypes = [{ stt_code: 'MANUAL' }];
    const mockEnvRoles = [{ enr_id: 'env-role-1' }];

    it('should call eraseCanonicalPlanTables when erase option is true', async () => {
      // This mock handles all DB calls based on the SQL query, making it robust
      client.query.mockImplementation(sql => {
        if (sql.startsWith('SELECT tms_id FROM teams_tms')) return Promise.resolve({ rows: mockTeams });
        if (sql.startsWith('SELECT stt_code FROM step_types_stt')) return Promise.resolve({ rows: mockStepTypes });
        if (sql.startsWith('SELECT enr_id FROM environment_roles_enr')) return Promise.resolve({ rows: mockEnvRoles });
        if (sql.startsWith('INSERT INTO')) return Promise.resolve({ rows: [{plm_id: 1}] }); // Generic insert mock
        return Promise.resolve({ rows: [] }); // For TRUNCATEs and other calls
      });

      await generateCanonicalPlans(CONFIG, { erase: true });

      // Assert that the TRUNCATE statements were called
      expect(client.query).toHaveBeenCalledWith('TRUNCATE TABLE "steps_master_stm" RESTART IDENTITY CASCADE');
      expect(client.query).toHaveBeenCalledWith('TRUNCATE TABLE "phases_master_phm" RESTART IDENTITY CASCADE');
      expect(client.query).toHaveBeenCalledWith('TRUNCATE TABLE "sequences_master_sqm" RESTART IDENTITY CASCADE');
      expect(client.query).toHaveBeenCalledWith('TRUNCATE TABLE "plans_master_plm" RESTART IDENTITY CASCADE');
    });

    it('should throw an error if master data is missing', async () => {
      // Scenario 1: No teams
      client.query.mockResolvedValueOnce({ rows: [] }); // teams
      await expect(generateCanonicalPlans(CONFIG, {})).rejects.toThrow('Cannot generate plans: Missing master data (teams, step types, or environment roles).');

      // Scenario 2: No step types
      client.query
        .mockResolvedValueOnce({ rows: mockTeams })
        .mockResolvedValueOnce({ rows: [] }); // step types
      await expect(generateCanonicalPlans(CONFIG, {})).rejects.toThrow('Cannot generate plans: Missing master data (teams, step types, or environment roles).');
      
      // Scenario 3: No env roles
      client.query
        .mockResolvedValueOnce({ rows: mockTeams })
        .mockResolvedValueOnce({ rows: mockStepTypes })
        .mockResolvedValueOnce({ rows: [] }); // env roles
      await expect(generateCanonicalPlans(CONFIG, {})).rejects.toThrow('Cannot generate plans: Missing master data (teams, step types, or environment roles).');
    });

    it('should generate a full hierarchy of canonical plans', async () => {
      let planInserts = 0, sequenceInserts = 0, phaseInserts = 0, stepInserts = 0;

      client.query.mockImplementation(sql => {
        if (sql.startsWith('SELECT tms_id FROM teams_tms')) return Promise.resolve({ rows: mockTeams });
        if (sql.startsWith('SELECT stt_code FROM step_types_stt')) return Promise.resolve({ rows: mockStepTypes });
        if (sql.startsWith('SELECT enr_id FROM environment_roles_enr')) return Promise.resolve({ rows: mockEnvRoles });

        if (sql.startsWith('INSERT INTO plans_master_plm')) {
          planInserts++;
          return Promise.resolve({ rows: [{ plm_id: `plan-${planInserts}` }] });
        }
        if (sql.startsWith('INSERT INTO sequences_master_sqm')) {
          sequenceInserts++;
          return Promise.resolve({ rows: [{ sqm_id: `seq-${sequenceInserts}` }] });
        }
        if (sql.startsWith('INSERT INTO phases_master_phm')) {
          phaseInserts++;
          return Promise.resolve({ rows: [{ phm_id: `phase-${phaseInserts}` }] });
        }
        if (sql.startsWith('INSERT INTO steps_master_stm')) {
          stepInserts++;
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      await generateCanonicalPlans(CONFIG, {});

      const expectedPlans = CONFIG.CANONICAL_PLANS.PER_MIGRATION * CONFIG.MIGRATIONS.COUNT;
      const expectedSequences = expectedPlans * 2; // from faker mock
      const expectedPhases = expectedSequences * 2;
      const expectedSteps = expectedPhases * 2;

      expect(planInserts).toBe(expectedPlans);
      expect(sequenceInserts).toBe(expectedSequences);
      expect(phaseInserts).toBe(expectedPhases);
      expect(stepInserts).toBe(expectedSteps);
    });
  });

  describe('eraseCanonicalPlanTables', () => {
    it('should truncate all canonical plan tables in the correct order', async () => {
      client.query.mockResolvedValue({ rows: [] });
      await eraseCanonicalPlanTables(client);

      const calls = client.query.mock.calls.map(call => call[0]);
      expect(calls[0]).toBe('TRUNCATE TABLE "steps_master_stm" RESTART IDENTITY CASCADE');
      expect(calls[1]).toBe('TRUNCATE TABLE "phases_master_phm" RESTART IDENTITY CASCADE');
      expect(calls[2]).toBe('TRUNCATE TABLE "sequences_master_sqm" RESTART IDENTITY CASCADE');
      expect(calls[3]).toBe('TRUNCATE TABLE "plans_master_plm" RESTART IDENTITY CASCADE');
    });

    it('should throw an error if truncation fails', async () => {
      const dbError = new Error('DB error');
      client.query.mockRejectedValue(dbError);
      
      // Mock console.error to prevent logging during test run
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await expect(eraseCanonicalPlanTables(client)).rejects.toThrow(dbError);
      expect(consoleErrorSpy).toHaveBeenCalledWith(`Error erasing canonical plan tables: ${dbError}`);
      
      consoleErrorSpy.mockRestore();
    });
  });
});