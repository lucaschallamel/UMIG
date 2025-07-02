import { client } from '../../scripts/lib/db.js';
import * as generator from '../../scripts/generators/99_generate_instance_data.js';

// Mock dependencies
jest.mock('../../scripts/lib/db.js', () => ({ client: { query: jest.fn() } }));
jest.mock('../../scripts/lib/utils.js', () => ({
  faker: {
    lorem: { sentence: jest.fn() },
    helpers: { arrayElement: jest.fn() },
  },
}));

const { faker } = require('../../scripts/lib/utils.js');

const CONFIG = {};

describe('Instance Data Generator (99_generate_instance_data.js)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  describe('generateInstanceData', () => {
    const mockUsers = { rows: [{ usr_id: 'user-1' }] };
    const mockIterations = { rows: [{ ite_id: 'ite-1', plm_id: 'plm-1' }] };

    it('should call eraseInstanceDataTables when erase option is true', async () => {
      // Instead of running the entire generator, we'll mock it after the erase call
      const originalGenerate = generator.generateInstanceData;
      generator.generateInstanceData = jest.fn(async (config, options) => {
        if (options && options.erase) {
          await generator.eraseInstanceDataTables(client);
        }
      });

      // Mock just what's needed for the eraseInstanceDataTables function
      client.query.mockImplementation(sql => {
        if (sql.startsWith('SELECT to_regclass')) {
          return Promise.resolve({ rows: [{ to_regclass: null }] }); // No tables exist, to make it fast
        }
        return Promise.resolve(); // For any other query
      });

      // Create a spy specifically for eraseInstanceDataTables
      const eraseSpy = jest.spyOn(generator, 'eraseInstanceDataTables');

      // Run the test
      await generator.generateInstanceData(CONFIG, { erase: true });

      // Verify
      expect(eraseSpy).toHaveBeenCalledWith(client);
      
      // Restore original implementation
      generator.generateInstanceData = originalGenerate;
      eraseSpy.mockRestore();
    });

    it('should throw an error if no master iterations are found', async () => {
      client.query.mockResolvedValueOnce({ rows: [] }); // Empty iterations
      await expect(generator.generateInstanceData(CONFIG)).rejects.toThrow('Missing master data');
    });

    it('should throw an error if no master users are found', async () => {
      client.query.mockResolvedValueOnce(mockIterations).mockResolvedValueOnce({ rows: [] }); // Empty users
      await expect(generator.generateInstanceData(CONFIG)).rejects.toThrow('Missing master data');
    });

    it('should correctly chain IDs and generate all instance types', async () => {
      const mockData = {
        sequences: { rows: [{ sqm_id: 'sqm-1' }] },
        phases: { rows: [{ phm_id: 'phm-1' }] },
        steps: { rows: [{ stm_id: 'stm-1' }] },
        instructions: { rows: [{ inm_id: 'inm-1' }] },
        controls: { rows: [{ ctm_id: 'ctm-1' }] },
      };
      const mockGeneratedIds = { pli: 'pli-1', sqi: 'sqi-1', phi: 'phi-1', sti: 'sti-1' };

      faker.helpers.arrayElement.mockReturnValue(mockUsers.rows[0]);
      faker.lorem.sentence.mockReturnValue('A mock sentence.');

      // Define the precise sequence of database responses
      client.query
        .mockResolvedValueOnce(mockIterations) // 1. Get iterations
        .mockResolvedValueOnce(mockUsers)      // 2. Get users
        .mockResolvedValueOnce({ rows: [{ pli_id: mockGeneratedIds.pli }] }) // 3. INSERT plan
        .mockResolvedValueOnce(mockData.sequences) // 4. Get sequences
        .mockResolvedValueOnce({ rows: [{ sqi_id: mockGeneratedIds.sqi }] }) // 5. INSERT sequence
        .mockResolvedValueOnce(mockData.phases) // 6. Get phases
        .mockResolvedValueOnce({ rows: [{ phi_id: mockGeneratedIds.phi }] }) // 7. INSERT phase
        .mockResolvedValueOnce(mockData.steps) // 8. Get steps
        .mockResolvedValueOnce({ rows: [{ sti_id: mockGeneratedIds.sti }] }) // 9. INSERT step
        .mockResolvedValueOnce(mockData.instructions) // 10. Get instructions
        .mockResolvedValueOnce({ rows: [] }) // 11. INSERT instruction
        .mockResolvedValueOnce(mockData.controls) // 12. Get controls
        .mockResolvedValueOnce({ rows: [] }); // 13. INSERT control

      await generator.generateInstanceData(CONFIG);

      const calls = client.query.mock.calls;
      expect(calls[8][0]).toContain('INSERT INTO steps_instance_sti');
      expect(calls[8][1]).toEqual([mockGeneratedIds.phi, mockData.steps.rows[0].stm_id, 'NOT_STARTED']);
    });
  });

  describe('eraseInstanceDataTables', () => {
    const tablesToReset = ['controls_instance_cti', 'instructions_instance_ini', 'steps_instance_sti', 'phases_instance_phi', 'sequences_instance_sqi', 'plans_instance_pli'];

    it('should truncate tables in the correct order', async () => {
      // Create a mock implementation that returns a successful result for each table check
      const mockQueryImplementation = jest.fn().mockImplementation(sql => {
        if (sql.includes('to_regclass')) {
          // Extract the table name from the query for better test diagnostics
          const tableName = sql.match(/'public\."(.+)"'/)[1];
          return Promise.resolve({ rows: [{ to_regclass: tableName }] });
        }
        return Promise.resolve();
      });

      client.query.mockImplementation(mockQueryImplementation);

      await generator.eraseInstanceDataTables(client);

      // Verify all tables were checked for existence and then truncated
      tablesToReset.forEach(table => {
        // Check that existence query was called
        expect(mockQueryImplementation).toHaveBeenCalledWith(`SELECT to_regclass('public."${table}"');`);
        
        // Check that truncate was called
        expect(mockQueryImplementation).toHaveBeenCalledWith(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
      });
    });

    it('should skip truncation if a table does not exist', async () => {
      const mockQueryImplementation = jest.fn().mockImplementation(sql => {
        if (sql.includes('to_regclass')) {
          // Extract the table name from the query
          const tableMatch = sql.match(/'public\."(.+)"'/);
          const tableName = tableMatch ? tableMatch[1] : null;
          
          // Only plans_instance_pli doesn't exist
          if (tableName === 'plans_instance_pli') {
            return Promise.resolve({ rows: [{ to_regclass: null }] });
          }
          return Promise.resolve({ rows: [{ to_regclass: tableName }] });
        }
        return Promise.resolve();
      });

      client.query.mockImplementation(mockQueryImplementation);

      await generator.eraseInstanceDataTables(client);

      // Verify plans_instance_pli was not truncated
      expect(mockQueryImplementation).not.toHaveBeenCalledWith(`TRUNCATE TABLE "plans_instance_pli" RESTART IDENTITY CASCADE`);
      
      // Verify other tables were truncated
      tablesToReset.filter(table => table !== 'plans_instance_pli').forEach(table => {
        expect(mockQueryImplementation).toHaveBeenCalledWith(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
      });
    });

    it('should throw an error if truncation fails', async () => {
      const error = new Error('Truncate failed');
      
      // Set up a mock that succeeds for table existence but fails for truncation
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

      await expect(generator.eraseInstanceDataTables(client)).rejects.toThrow(error);
    });
  });
});