import { client } from '../../scripts/lib/db.js';
import { generateInstanceData, eraseInstanceDataTables } from '../../scripts/generators/099_generate_instance_data.js';
import { faker } from '../../scripts/lib/utils.js';

// Mock dependencies
jest.mock('../../scripts/lib/db.js', () => ({
  client: {
    query: jest.fn(),
  },
}));

jest.mock('../../scripts/lib/utils.js', () => ({
  faker: {
    lorem: {
      sentence: jest.fn(),
      words: jest.fn(),
    },
    helpers: {
      arrayElement: jest.fn(),
    },
    number: {
      int: jest.fn(),
    },
    string: {
      alphanumeric: jest.fn(),
    },
  },
}));

const CONFIG = {};

describe('Instance Data Generator (99_generate_instance_data.js)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Silence console output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Setup default faker mocks
    faker.lorem.sentence.mockReturnValue('Mocked lorem sentence');
    faker.lorem.words.mockReturnValue('Mocked words');
    faker.helpers.arrayElement.mockImplementation(arr => arr[0]);
    faker.number.int.mockReturnValue(15);
    faker.string.alphanumeric.mockReturnValue('ABC123');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateInstanceData', () => {
    const mockUsers = { rows: [{ usr_id: 'user-1' }] };
    const mockIterations = { rows: [{ ite_id: 'ite-1', plm_id: 'plm-1' }] };
    const mockStatuses = {
      plan: { rows: [{ sts_id: 1, sts_name: 'NOT_STARTED' }, { sts_id: 2, sts_name: 'IN_PROGRESS' }] },
      sequence: { rows: [{ sts_id: 3, sts_name: 'PENDING' }, { sts_id: 4, sts_name: 'ACTIVE' }] },
      phase: { rows: [{ sts_id: 5, sts_name: 'DRAFT' }, { sts_id: 6, sts_name: 'READY' }] },
      step: { rows: [{ sts_id: 7, sts_name: 'WAITING' }, { sts_id: 8, sts_name: 'RUNNING' }] },
      control: { rows: [{ sts_id: 9, sts_name: 'PENDING' }, { sts_id: 10, sts_name: 'PASSED' }] }
    };

    it('should call eraseInstanceDataTables when erase option is true', async () => {
      // Mock the erase function queries first (to_regclass checks and truncates)
      client.query.mockImplementation(sql => {
        if (sql.includes('to_regclass')) {
          return Promise.resolve({ rows: [{ to_regclass: 'test-table' }] });
        }
        if (sql.includes('TRUNCATE')) {
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes('FROM iterations_ite')) {
          return Promise.resolve(mockIterations);
        }
        if (sql.includes('FROM users_usr')) {
          return Promise.resolve(mockUsers);
        }
        if (sql.includes('SELECT sts_id, sts_name FROM status_sts WHERE sts_type = $1')) {
          // Need to check which type is being requested based on context or parameters
          // For now, return plan statuses as default (this might need refinement based on actual parameter matching)
          return Promise.resolve(mockStatuses.plan);
        }
        if (sql.includes('INSERT INTO plans_instance_pli')) {
          return Promise.resolve({ rows: [{ pli_id: 'test-pli-id' }] });
        }
        if (sql.includes('FROM sequences_master_sqm')) {
          return Promise.resolve({ rows: [] }); // No sequences to avoid going deeper
        }
        return Promise.resolve({ rows: [] });
      });

      await generateInstanceData(CONFIG, { erase: true });

      const truncateCall = client.query.mock.calls.find(call => call[0].includes('TRUNCATE'));
      expect(truncateCall).toBeDefined();
    });

    it('should throw an error if no master iterations are found', async () => {
      client.query.mockResolvedValueOnce({ rows: [] });
      await expect(generateInstanceData(CONFIG)).rejects.toThrow('Cannot generate instance data: Missing master data (iterations or users).');
    });

    it('should throw an error if no master users are found', async () => {
      client.query.mockResolvedValueOnce(mockIterations).mockResolvedValueOnce({ rows: [] });
      await expect(generateInstanceData(CONFIG)).rejects.toThrow('Cannot generate instance data: Missing master data (iterations or users).');
    });

    it('should include override fields in INSERT statements', async () => {
      const mockData = {
        sequences: { rows: [{ sqm_id: 'sqm-1', sqm_name: 'Original Name', sqm_description: 'Original Description', sqm_order: 1, predecessor_sqm_id: null }] },
        phases: { rows: [{ phm_id: 'phm-1', phm_name: 'Original Phase', phm_description: 'Original Phase Description', phm_order: 1, predecessor_phm_id: null }] },
        steps: { rows: [{ stm_id: 'stm-1', stm_name: 'Original Step', stm_description: 'Original Step Description', stm_duration_minutes: 30, stm_id_predecessor: null, enr_id: null }] },
        instructions: { rows: [{ inm_id: 'inm-1', inm_order: 1, inm_body: 'Original Body', inm_duration_minutes: 15, tms_id: 'tms-1', ctm_id: null }] },
        controls: { rows: [{ ctm_id: 'ctm-1', ctm_order: 1, ctm_name: 'Original Control', ctm_description: 'Original Control Description', ctm_type: 'CHECK', ctm_is_critical: false, ctm_code: 'CTRL001' }] },
      };
      const mockGeneratedIds = { pli: 'pli-1', sqi: 'sqi-1', phi: 'phi-1', sti: 'sti-1' };

      faker.helpers.arrayElement.mockReturnValue(mockUsers.rows[0]);
      faker.lorem.sentence.mockReturnValue('A mock sentence.');

      client.query
        .mockResolvedValueOnce(mockIterations)
        .mockResolvedValueOnce(mockUsers)
        .mockResolvedValueOnce(mockStatuses.plan)
        .mockResolvedValueOnce(mockStatuses.sequence)
        .mockResolvedValueOnce(mockStatuses.phase)
        .mockResolvedValueOnce(mockStatuses.step)
        .mockResolvedValueOnce(mockStatuses.control)
        .mockResolvedValueOnce({ rows: [{ pli_id: mockGeneratedIds.pli }] })
        .mockResolvedValueOnce(mockData.sequences)
        .mockResolvedValueOnce({ rows: [{ sqi_id: mockGeneratedIds.sqi }] })
        .mockResolvedValueOnce(mockData.phases)
        .mockResolvedValueOnce({ rows: [{ phi_id: mockGeneratedIds.phi }] })
        .mockResolvedValueOnce(mockData.steps)
        .mockResolvedValueOnce({ rows: [{ sti_id: mockGeneratedIds.sti }] })
        .mockResolvedValueOnce(mockData.instructions)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce(mockData.controls)
        .mockResolvedValueOnce({ rows: [{ sti_id: mockGeneratedIds.sti }] }) // Step instances for control creation
        .mockResolvedValueOnce({ rows: [] }); // Control instance insert

      await generateInstanceData(CONFIG);

      const sqlQueries = client.query.mock.calls.map(call => call[0]);

      const sequenceInsert = sqlQueries.find(sql => sql.includes('INSERT INTO sequences_instance_sqi'));
      expect(sequenceInsert).toContain('sqi_name');
      expect(sequenceInsert).toContain('sqi_description');
      expect(sequenceInsert).toContain('sqi_order');
      expect(sequenceInsert).toContain('predecessor_sqi_id');

      const phaseInsert = sqlQueries.find(sql => sql.includes('INSERT INTO phases_instance_phi'));
      expect(phaseInsert).toContain('phi_name');
      expect(phaseInsert).toContain('phi_description');
      expect(phaseInsert).toContain('phi_order');
      expect(phaseInsert).toContain('predecessor_phi_id');

      const stepInsert = sqlQueries.find(sql => sql.includes('INSERT INTO steps_instance_sti'));
      expect(stepInsert).toContain('sti_name');
      expect(stepInsert).toContain('sti_description');
      expect(stepInsert).toContain('sti_duration_minutes');
      expect(stepInsert).toContain('sti_id_predecessor');
      expect(stepInsert).toContain('enr_id');

      const instructionInsert = sqlQueries.find(sql => sql.includes('INSERT INTO instructions_instance_ini'));
      expect(instructionInsert).toContain('ini_order');
      expect(instructionInsert).toContain('ini_body');
      expect(instructionInsert).toContain('ini_duration_minutes');
      expect(instructionInsert).toContain('tms_id');
      expect(instructionInsert).toContain('cti_id');

      const controlInsert = sqlQueries.find(sql => sql.includes('INSERT INTO controls_instance_cti'));
      expect(controlInsert).toContain('cti_order');
      expect(controlInsert).toContain('cti_name');
      expect(controlInsert).toContain('cti_description');
      expect(controlInsert).toContain('cti_type');
      expect(controlInsert).toContain('cti_is_critical');
      expect(controlInsert).toContain('cti_code');
    });
  });

  describe('eraseInstanceDataTables', () => {
    const tablesToReset = ['controls_instance_cti', 'instructions_instance_ini', 'steps_instance_sti', 'phases_instance_phi', 'sequences_instance_sqi', 'plans_instance_pli'];

    it('should truncate tables in the correct order', async () => {
      const mockQueryImplementation = jest.fn().mockImplementation(sql => {
        if (sql.includes('to_regclass')) {
          const tableName = sql.match(/'public\."(.+)"'/)[1];
          return Promise.resolve({ rows: [{ to_regclass: tableName }] });
        }
        return Promise.resolve();
      });
      client.query.mockImplementation(mockQueryImplementation);
      await eraseInstanceDataTables(client);
      tablesToReset.forEach(table => {
        expect(mockQueryImplementation).toHaveBeenCalledWith(`SELECT to_regclass('public."${table}"');`);
        expect(mockQueryImplementation).toHaveBeenCalledWith(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
      });
    });

    it('should skip truncation if a table does not exist', async () => {
      const mockQueryImplementation = jest.fn().mockImplementation(sql => {
        if (sql.includes('to_regclass')) {
          const tableMatch = sql.match(/'public\."(.+)"'/);
          const tableName = tableMatch ? tableMatch[1] : null;
          if (tableName === 'plans_instance_pli') {
            return Promise.resolve({ rows: [{ to_regclass: null }] });
          }
          return Promise.resolve({ rows: [{ to_regclass: tableName }] });
        }
        return Promise.resolve();
      });
      client.query.mockImplementation(mockQueryImplementation);
      await eraseInstanceDataTables(client);
      expect(mockQueryImplementation).not.toHaveBeenCalledWith(`TRUNCATE TABLE "plans_instance_pli" RESTART IDENTITY CASCADE`);
      tablesToReset.filter(table => table !== 'plans_instance_pli').forEach(table => {
        expect(mockQueryImplementation).toHaveBeenCalledWith(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
      });
    });

    it('should throw an error if truncation fails', async () => {
      const error = new Error('Truncate failed');
      let truncateAttempted = false;
      client.query.mockImplementation(sql => {
        if (sql.includes('to_regclass')) {
          return Promise.resolve({ rows: [{ to_regclass: 'test-table' }] });
        }
        if (sql.startsWith('TRUNCATE') && !truncateAttempted) {
          truncateAttempted = true;
          return Promise.reject(error);
        }
        return Promise.resolve();
      });
      await expect(eraseInstanceDataTables(client)).rejects.toThrow(error);
    });
  });
});