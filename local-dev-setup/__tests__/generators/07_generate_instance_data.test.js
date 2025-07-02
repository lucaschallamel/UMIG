const { client } = require('../../lib/db');
const { generateInstanceData } = require('../../generators/07_generate_instance_data');
const utils = require('../../lib/utils');
const { v4: uuidv4 } = require('uuid');

// Mock dependencies
jest.mock('../../lib/db', () => ({ client: { query: jest.fn() } }));

const CONFIG = {}; // This generator doesn't use config values directly

describe('Instance Data Generator (07_generate_instance_data.js)', () => {

  beforeEach(() => {
    client.query.mockReset();
    jest.restoreAllMocks();

    // Spy on faker and silence console for cleaner test results
    jest.spyOn(utils.faker.helpers, 'arrayElement').mockImplementation(arr => arr[0]);
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Default mock: all queries return empty results unless overridden
    client.query.mockResolvedValue({ rows: [] });
  });

  it('should throw an error if no master plans are found', async () => {
    // The default mock returns empty rows, triggering the error
    await expect(generateInstanceData(CONFIG, { clientOverride: client })).rejects.toThrow('Cannot generate instance data without master plans.');
  });

  it('should throw an error if no iterations are found', async () => {
    client.query.mockImplementation(query => {
      if (query.startsWith('SELECT plm_id')) return Promise.resolve({ rows: [{ plm_id: uuidv4() }] });
      return Promise.resolve({ rows: [] }); // iterations query will be empty
    });
    await expect(generateInstanceData(CONFIG, { clientOverride: client })).rejects.toThrow('Cannot generate instance data without iterations.');
  });

  it('should throw an error if no users are found', async () => {
    client.query.mockImplementation(query => {
      if (query.startsWith('SELECT plm_id')) return Promise.resolve({ rows: [{ plm_id: uuidv4() }] });
      if (query.startsWith('SELECT ite_id')) return Promise.resolve({ rows: [{ ite_id: uuidv4() }] });
      return Promise.resolve({ rows: [] }); // users query will be empty
    });
    await expect(generateInstanceData(CONFIG, { clientOverride: client })).rejects.toThrow('Cannot generate instance data without users.');
  });

  it('should successfully generate instances on a happy path', async () => {
    const fakePlanId = uuidv4();
    const fakeIterationId = uuidv4();
    const fakeUserId = 1;
    const fakeSequenceId = uuidv4();
    const fakePhaseId = uuidv4();
    const fakeStepId = uuidv4();
    const fakeInstanceId = uuidv4();

    // This mock is now self-contained and explicit
    client.query.mockImplementation((query, params) => {
      // console.log(`[TEST_DEBUG] Query: ${query}`, params || ''); // Uncomment for deep debugging
      if (query.startsWith('SELECT plm_id')) return Promise.resolve({ rows: [{ plm_id: fakePlanId, plm_name: 'Master Plan' }] });
      if (query.startsWith('SELECT ite_id')) return Promise.resolve({ rows: [{ ite_id: fakeIterationId, ite_name: 'Test Iteration', itt_code: 'RUN' }] });
      if (query.startsWith('SELECT usr_id')) return Promise.resolve({ rows: [{ usr_id: fakeUserId }] });
      if (query.startsWith('SELECT sqm_id')) return Promise.resolve({ rows: [{ sqm_id: fakeSequenceId }] });
      if (query.startsWith('SELECT phm_id')) return Promise.resolve({ rows: [{ phm_id: fakePhaseId }] });
      if (query.startsWith('SELECT stm_id')) return Promise.resolve({ rows: [{ stm_id: fakeStepId }] });
      if (query.startsWith('INSERT INTO plans_instance_pli')) return Promise.resolve({ rows: [{ pli_id: fakeInstanceId }] });
      
      // Default for other INSERTs (sequences, phases, steps, audit) which don't need a specific return value
      if (query.startsWith('INSERT INTO')) return Promise.resolve({ rows: [{ id: uuidv4() }] });

      // Fallback for any unexpected queries
      return Promise.resolve({ rows: [] });
    });

    // Run the generator and expect it not to fail
    await expect(generateInstanceData(CONFIG, { clientOverride: client })).resolves.not.toThrow();

    // Verify that the main INSERT was called, indicating the main logic ran
    expect(client.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO plans_instance_pli'), expect.any(Array));
  });
});