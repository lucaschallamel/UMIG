import { client } from '../../scripts/lib/db.js';
import { generateCanonicalPlans, eraseCanonicalPlanTables } from '../../scripts/generators/004_generate_canonical_plans.js';
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
      arrayElements: jest.fn(), // Mock arrayElements as well
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
    faker.helpers.arrayElements.mockImplementation(arr => [arr[0]]); // Return a single-element array
    // Generate a specific number of items for each hierarchy level, based on the generator's code
    faker.number.int.mockImplementation(({ min, max }) => {
      if (min === 2 && max === 4) return 2; // Sequences
      if (min === 2 && max === 5) return 3; // Phases
      if (min === 3 && max === 8) return 4; // Steps
      return 1; // Default fallback for other int generations (e.g., duration)
    });
    faker.lorem.sentence.mockReturnValue('A mock sentence.');
    faker.lorem.words.mockReturnValue('mock words');
    faker.lorem.paragraph.mockReturnValue('A mock paragraph.');
  });

  const mockTeams = [{ tms_id: 'team-1' }];
  const mockStepTypes = [{ stt_code: 'MANUAL' }];
  const mockEnvRoles = [{ enr_id: 'env-role-1' }];
  const mockIterationTypes = [{ itt_code: 'ITT-1' }];

  const mockAllMasterData = (client) => {
    client.query.mockImplementation(sql => {
      if (sql.includes('FROM teams_tms')) return Promise.resolve({ rows: mockTeams });
      if (sql.includes('FROM step_types_stt')) return Promise.resolve({ rows: mockStepTypes });
      if (sql.includes('FROM environment_roles_enr')) return Promise.resolve({ rows: mockEnvRoles });
      if (sql.includes('FROM iteration_types_itt')) return Promise.resolve({ rows: mockIterationTypes });
      if (sql.startsWith('INSERT INTO')) return Promise.resolve({ rows: [{ plm_id: 1, sqm_id: 1, phm_id: 1, stm_id: 1 }] });
      return Promise.resolve({ rows: [] }); // For TRUNCATEs
    });
  };

  describe('generateCanonicalPlans', () => {
    it('should call eraseCanonicalPlanTables when erase option is true', async () => {
      mockAllMasterData(client);
      await generateCanonicalPlans(CONFIG, { erase: true });

      const truncateCalls = client.query.mock.calls.filter(call => call[0].startsWith('TRUNCATE'));
      expect(truncateCalls.length).toBe(6);
      expect(truncateCalls[0][0]).toContain('steps_master_stm_x_teams_tms_impacted');
    });

    it('should throw an error if master data is missing', async () => {
      const expectedError = 'Cannot generate plans: Missing master data (teams, step types, environment roles, or iteration types).';

      // Scenario 1: No teams
      client.query.mockResolvedValueOnce({ rows: [] });
      await expect(generateCanonicalPlans(CONFIG, {})).rejects.toThrow(expectedError);

      // Scenario 2: No step types
      client.query.mockResolvedValueOnce({ rows: mockTeams }).mockResolvedValueOnce({ rows: [] });
      await expect(generateCanonicalPlans(CONFIG, {})).rejects.toThrow(expectedError);

      // Scenario 3: No env roles
      client.query.mockResolvedValueOnce({ rows: mockTeams }).mockResolvedValueOnce({ rows: mockStepTypes }).mockResolvedValueOnce({ rows: [] });
      await expect(generateCanonicalPlans(CONFIG, {})).rejects.toThrow(expectedError);

      // Scenario 4: No iteration types
      client.query.mockResolvedValueOnce({ rows: mockTeams }).mockResolvedValueOnce({ rows: mockStepTypes }).mockResolvedValueOnce({ rows: mockEnvRoles }).mockResolvedValueOnce({ rows: [] });
      await expect(generateCanonicalPlans(CONFIG, {})).rejects.toThrow(expectedError);
    });

    it('should generate a full hierarchy of canonical plans and populate join tables', async () => {
      let inserts = {
        plans: 0, sequences: 0, phases: 0, steps: 0,
        steps_x_teams: 0, steps_x_iterations: 0,
      };

      client.query.mockImplementation(sql => {
        if (sql.includes('FROM teams_tms')) return Promise.resolve({ rows: mockTeams });
        if (sql.includes('FROM step_types_stt')) return Promise.resolve({ rows: mockStepTypes });
        if (sql.includes('FROM environment_roles_enr')) return Promise.resolve({ rows: mockEnvRoles });
        if (sql.includes('FROM iteration_types_itt')) return Promise.resolve({ rows: mockIterationTypes });

        // IMPORTANT: Check for join tables FIRST to avoid being caught by the more general 'steps_master_stm' check.
        if (sql.startsWith('INSERT INTO steps_master_stm_x_teams_tms_impacted')) {
          inserts.steps_x_teams++;
          return Promise.resolve({ rows: [] });
        }
        if (sql.startsWith('INSERT INTO steps_master_stm_x_iteration_types_itt')) {
          inserts.steps_x_iterations++;
          return Promise.resolve({ rows: [] });
        }
        if (sql.startsWith('INSERT INTO plans_master_plm')) {
          inserts.plans++;
          return Promise.resolve({ rows: [{ plm_id: `plan-${inserts.plans}` }] });
        }
        if (sql.startsWith('INSERT INTO sequences_master_sqm')) {
          inserts.sequences++;
          return Promise.resolve({ rows: [{ sqm_id: `seq-${inserts.sequences}` }] });
        }
        if (sql.startsWith('INSERT INTO phases_master_phm')) {
          inserts.phases++;
          return Promise.resolve({ rows: [{ phm_id: `phase-${inserts.phases}` }] });
        }
        if (sql.startsWith('INSERT INTO steps_master_stm')) {
          inserts.steps++;
          return Promise.resolve({ rows: [{ stm_id: `step-${inserts.steps}` }] });
        }
        return Promise.resolve({ rows: [] });
      });

      await generateCanonicalPlans(CONFIG, {});

      const expectedPlans = CONFIG.CANONICAL_PLANS.PER_MIGRATION * CONFIG.MIGRATIONS.COUNT;
      const expectedSequences = expectedPlans * 2; // As per mock
      const expectedPhases = expectedSequences * 3; // As per mock
      const expectedSteps = expectedPhases * 4; // As per mock

      expect(inserts.plans).toBe(expectedPlans);
      expect(inserts.sequences).toBe(expectedSequences);
      expect(inserts.phases).toBe(expectedPhases);
      expect(inserts.steps).toBe(expectedSteps);
      expect(inserts.steps_x_teams).toBe(expectedSteps);
      expect(inserts.steps_x_iterations).toBe(expectedSteps);
    });
  });

  describe('eraseCanonicalPlanTables', () => {
    it('should truncate all canonical plan tables in the correct order', async () => {
      client.query.mockResolvedValue({ rows: [] });
      await eraseCanonicalPlanTables(client);

      const calls = client.query.mock.calls.map(call => call[0]);
      expect(calls[0]).toBe('TRUNCATE TABLE "steps_master_stm_x_teams_tms_impacted" RESTART IDENTITY CASCADE');
      expect(calls[1]).toBe('TRUNCATE TABLE "steps_master_stm_x_iteration_types_itt" RESTART IDENTITY CASCADE');
      expect(calls[2]).toBe('TRUNCATE TABLE "steps_master_stm" RESTART IDENTITY CASCADE');
      expect(calls[3]).toBe('TRUNCATE TABLE "phases_master_phm" RESTART IDENTITY CASCADE');
      expect(calls[4]).toBe('TRUNCATE TABLE "sequences_master_sqm" RESTART IDENTITY CASCADE');
      expect(calls[5]).toBe('TRUNCATE TABLE "plans_master_plm" RESTART IDENTITY CASCADE');
      expect(calls.length).toBe(6);
    });

    it('should throw an error if truncation fails', async () => {
      const dbError = new Error('DB error');
      client.query.mockRejectedValue(dbError);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(eraseCanonicalPlanTables(client)).rejects.toThrow(dbError);
      expect(consoleErrorSpy).toHaveBeenCalledWith(`Error erasing canonical plan tables: ${dbError}`);

      consoleErrorSpy.mockRestore();
    });
  });
});