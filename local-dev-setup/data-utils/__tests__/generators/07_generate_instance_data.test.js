const { client } = require('../../lib/db');
const { generateInstanceData } = require('../../generators/07_generate_instance_data');
const { faker } = require('../../lib/utils');

// Mock dependencies
jest.mock('../../lib/db', () => ({ client: { query: jest.fn() } }));
jest.mock('../../lib/utils', () => ({
  faker: {
    lorem: { sentence: jest.fn(() => 'a sentence') },
    helpers: { arrayElement: jest.fn(arr => arr[0]) },
  },
}));

const CONFIG = {}; // No specific config needed for this generator

describe('Instance Data Generator (07_generate_instance_data.js)', () => {
  beforeEach(() => {
    client.query.mockReset();
    jest.clearAllMocks();
  });

  // Helper to mock a successful run
  const mockHappyPathQueries = (query) => {
    if (query.includes('TRUNCATE')) return Promise.resolve({ rows: [] });
    if (query.includes('FROM plans_master_plm')) return Promise.resolve({ rows: [{ plm_id: 'plm-1', plm_name: 'Master Plan' }] });
    if (query.includes('FROM iterations_ite')) return Promise.resolve({ rows: [{ ite_id: 'ite-1', ite_name: 'RUN 1', itt_code: 'RUN' }, { ite_id: 'ite-2', ite_name: 'DR Test', itt_code: 'DR' }] });
    if (query.includes('FROM users_usr')) return Promise.resolve({ rows: [{ usr_id: 'usr-1' }] });
    if (query.includes('FROM sequences_master_sqm')) return Promise.resolve({ rows: [{ sqm_id: 'sqm-1' }] });
    if (query.includes('FROM phases_master_phm')) return Promise.resolve({ rows: [{ phm_id: 'phm-1' }] });
    if (query.includes('FROM steps_master_stm')) return Promise.resolve({ rows: [{ stm_id: 'stm-1' }] });
    // Mock INSERTs to return IDs
    if (query.includes('INSERT INTO plans_instance_pli')) return Promise.resolve({ rows: [{ pli_id: 'pli-1' }] });
    if (query.includes('INSERT INTO sequences_instance_sqi')) return Promise.resolve({ rows: [{ sqi_id: 'sqi-1' }] });
    if (query.includes('INSERT INTO phases_instance_phi')) return Promise.resolve({ rows: [{ phi_id: 'phi-1' }] });
    if (query.includes('INSERT INTO steps_instance_sti')) return Promise.resolve({ rows: [{ sti_id: 'sti-1' }] });
    // Default for audit log INSERTs
    return Promise.resolve({ rows: [] });
  };

  it('should call resetInstanceDataTables when reset option is true', async () => {
    // Arrange
    client.query.mockImplementation(mockHappyPathQueries);

    // Act
    await generateInstanceData(CONFIG, { reset: true });

    // Assert
    const allQueries = client.query.mock.calls.map(call => call[0]);
    expect(allQueries.some(q => q.includes('TRUNCATE TABLE "plans_instance_pli"'))).toBe(true);
    expect(allQueries.some(q => q.includes('TRUNCATE TABLE "audit_log_aud"'))).toBe(true);
  });

  it('should throw an error if no master plans are found', async () => {
    // Arrange
    client.query.mockResolvedValue({ rows: [] }); // No master plans

    // Act & Assert
    await expect(generateInstanceData(CONFIG, {})).rejects.toThrow('Cannot generate instance data without master plans.');
  });

  it('should throw an error if no iterations are found', async () => {
    // Arrange
    client.query
      .mockResolvedValueOnce({ rows: [{ plm_id: 'plm-1' }] }) // Master plans exist
      .mockResolvedValueOnce({ rows: [] }) // No iterations
      .mockResolvedValueOnce({ rows: [{ usr_id: 'usr-1' }] }); // Users exist to prevent a different error

    // Act & Assert
    await expect(generateInstanceData(CONFIG, {})).rejects.toThrow('Cannot generate instance data without iterations.');
  });

  it('should throw an error if no users are found', async () => {
    // Arrange
    client.query
      .mockResolvedValueOnce({ rows: [{ plm_id: 'plm-1' }] }) // Master plans exist
      .mockResolvedValueOnce({ rows: [{ ite_id: 'ite-1' }] }) // Iterations exist
      .mockResolvedValueOnce({ rows: [] }); // No users

    // Act & Assert
    await expect(generateInstanceData(CONFIG, {})).rejects.toThrow('Cannot generate instance data without users.');
  });

  it('should create one ACTIVE and one DRAFT plan instance per iteration', async () => {
    // Arrange
    client.query.mockImplementation(mockHappyPathQueries);

    // Act
    await generateInstanceData(CONFIG, {});

    // Assert
    const allQueries = client.query.mock.calls.map(call => call[0]);

    const allQueryCalls = client.query.mock.calls;
    const planInstanceInserts = allQueryCalls.filter(([query]) => query.includes('INSERT INTO plans_instance_pli'));
    const numIterations = 2; // Based on our mock

    // 1. Assert that 2 instances (1 ACTIVE, 1 DRAFT) are created per iteration.
    expect(planInstanceInserts.length).toBe(numIterations * 2);

    // The status parameter is now at index 4, after the description at index 3.
    const activeInstances = planInstanceInserts.filter(([query, params]) => params[4] === 'ACTIVE');
    const draftInstances = planInstanceInserts.filter(([query, params]) => params[4] === 'DRAFT');

    // Also check that the description is being passed correctly.
    expect(activeInstances[0][1][3]).toContain('Active instance of plan');
    expect(draftInstances[0][1][3]).toContain('Draft instance of plan');
    expect(activeInstances.length).toBe(numIterations);
    expect(draftInstances.length).toBe(numIterations);

    // 2. Assert that the full hierarchy is ONLY created for the ACTIVE instances.
    // The number of sequence inserts should equal the number of active plans.
    const sequenceInstanceInserts = allQueryCalls.filter(([query]) => query.includes('INSERT INTO sequences_instance_sqi'));
    expect(sequenceInstanceInserts.length).toBe(activeInstances.length);

    // 3. Check that audit logs were created for the status changes
    const auditLogs = allQueryCalls.filter(([query]) => query.includes('INSERT INTO audit_log_aud'));
    expect(auditLogs.length).toBeGreaterThan(0);
  });
});
