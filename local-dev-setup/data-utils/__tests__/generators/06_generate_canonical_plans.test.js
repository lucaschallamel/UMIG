const { client } = require('../../lib/db');
const { generateCanonicalPlans } = require('../../generators/06_generate_canonical_plans');
const utils = require('../../lib/utils');

// Mock dependencies
jest.mock('../../lib/db', () => ({ client: { query: jest.fn() } }));

// A simplified config for testing purposes
const CONFIG = {
  num_canonical_plans: 1,
};

const { v4: uuidv4 } = require('uuid');

describe('Canonical Plans Generator (06_generate_canonical_plans.js)', () => {
  // This helper mocks all necessary SELECT queries for a successful run.
  // It aligns with the actual schema: INTEGER IDs for users/teams, UUIDs for others.
  const mockHappyPathQueries = (query) => {
    // Handle COUNT queries for prerequisite checks
    if (query.includes('SELECT COUNT(*) FROM teams_tms')) return Promise.resolve({ rows: [{ count: '2' }] });
    if (query.includes('SELECT COUNT(*) FROM users_usr')) return Promise.resolve({ rows: [{ count: '1' }] });
    if (query.includes('SELECT COUNT(*) FROM environment_roles_enr')) return Promise.resolve({ rows: [{ count: '1' }] });
    if (query.includes('SELECT COUNT(*) FROM step_types_stt')) return Promise.resolve({ rows: [{ count: '1' }] });
    if (query.includes('SELECT COUNT(*) FROM iteration_types_itt')) return Promise.resolve({ rows: [{ count: '1' }] });

    // Handle SELECT queries to fetch data
    if (query.includes('SELECT usr_id FROM users_usr')) return Promise.resolve({ rows: [{ usr_id: 1 }, { usr_id: 2 }] });
    if (query.includes('SELECT tms_id FROM teams_tms')) return Promise.resolve({ rows: [{ tms_id: 1 }, { tms_id: 2 }] });
    if (query.includes('SELECT enr_id FROM environment_roles_enr')) return Promise.resolve({ rows: [{ enr_id: 1 }] });
    if (query.includes('SELECT stt_code FROM step_types_stt')) return Promise.resolve({ rows: [{ stt_code: 'MANUAL' }] });
    if (query.includes('SELECT itt_code FROM iteration_types_itt')) return Promise.resolve({ rows: [{ itt_code: 'RUN' }, { itt_code: 'DR' }, { itt_code: 'CUTOVER' }] });

    // Handle TRUNCATE
    if (query.includes('TRUNCATE')) return Promise.resolve({ rows: [] });

    // Mock INSERT statements to return UUIDs for relevant tables
    if (query.includes('INSERT INTO')) {
      if (query.includes('plans_master_plm')) return Promise.resolve({ rows: [{ plm_id: uuidv4() }] });
      if (query.includes('sequences_master_sqm')) return Promise.resolve({ rows: [{ sqm_id: uuidv4() }] });
      if (query.includes('phases_master_phm')) return Promise.resolve({ rows: [{ phm_id: uuidv4() }] });
      if (query.includes('controls_master_ctm')) return Promise.resolve({ rows: [{ ctm_id: uuidv4() }] });
      if (query.includes('steps_master_stm')) return Promise.resolve({ rows: [{ stm_id: uuidv4() }] });
      // For other inserts (link tables, comments), just resolve
      return Promise.resolve({ rows: [] });
    }

    // Default fallback for any other query
    return Promise.resolve({ rows: [] });
  };

  beforeEach(() => {
    client.query.mockReset();
    jest.restoreAllMocks();

    // Spy on all necessary faker methods
    jest.spyOn(utils.faker.lorem, 'words').mockReturnValue('some words');
    jest.spyOn(utils.faker.lorem, 'paragraph').mockReturnValue('a paragraph');
    jest.spyOn(utils.faker.lorem, 'sentence').mockReturnValue('a sentence');
    jest.spyOn(utils.faker.lorem, 'paragraphs').mockReturnValue('some paragraphs');
    jest.spyOn(utils.faker.number, 'int').mockReturnValue(1);
    jest.spyOn(utils.faker.helpers, 'arrayElement').mockImplementation(arr => arr[0]);
    jest.spyOn(utils.faker.helpers, 'arrayElements').mockImplementation((arr, num) => arr.slice(0, num || 1));
    jest.spyOn(utils.faker.company, 'name').mockReturnValue('some company');
    jest.spyOn(utils.faker.date, 'recent').mockReturnValue(new Date('2023-04-15T00:00:00.000Z'));
    jest.spyOn(utils.faker.date, 'between').mockReturnValue(new Date('2023-04-16T00:00:00.000Z'));

    // Default mock implementation: tables are empty
    client.query.mockImplementation((query) => {
      if (query.includes('SELECT COUNT(*)')) {
        return Promise.resolve({ rows: [{ count: '0' }] });
      }
      return Promise.resolve({ rows: [] });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call resetCanonicalPlansTables when reset option is true', async () => {
    client.query.mockImplementation(mockHappyPathQueries);
    await generateCanonicalPlans(CONFIG, { reset: true });
    const truncateCall = client.query.mock.calls.find(([q]) => q.includes('TRUNCATE'));
    expect(truncateCall).toBeDefined();
  });

  it('should throw an error if no teams are found', async () => {
    await expect(generateCanonicalPlans(CONFIG, {})).rejects.toThrow('Cannot generate canonical plans without teams to assign as owners.');
  });

  it('should throw an error if no users are found for pilot comments', async () => {
    client.query.mockImplementation(query => {
      if (query.includes('SELECT COUNT(*) FROM teams_tms')) return Promise.resolve({ rows: [{ count: '1' }] });
      if (query.includes('SELECT COUNT(*) FROM users_usr')) return Promise.resolve({ rows: [{ count: '0' }] });
      if (query.includes('SELECT usr_id FROM users_usr')) return Promise.resolve({ rows: [] });
      if (query.includes('SELECT COUNT(*)')) return Promise.resolve({ rows: [{ count: '1' }] });
      if (query.includes('SELECT tms_id FROM teams_tms')) return Promise.resolve({ rows: [{ tms_id: 1 }] });
      return Promise.resolve({ rows: [] });
    });
    await expect(generateCanonicalPlans(CONFIG, {})).rejects.toThrow('No users found to assign as comment authors.');
  });

  it('should throw an error if no step types are found', async () => {
    client.query.mockImplementation(query => {
      if (query.includes('SELECT COUNT(*) FROM teams_tms')) return Promise.resolve({ rows: [{ count: '1' }] });
      if (query.includes('SELECT COUNT(*) FROM users_usr')) return Promise.resolve({ rows: [{ count: '1' }] });
      if (query.includes('SELECT COUNT(*) FROM environment_roles_enr')) return Promise.resolve({ rows: [{ count: '1' }] });
      if (query.includes('SELECT COUNT(*) FROM step_types_stt')) return Promise.resolve({ rows: [{ count: '0' }] });
      if (query.includes('SELECT tms_id FROM teams_tms')) return Promise.resolve({ rows: [{ tms_id: 1 }] });
      if (query.includes('SELECT usr_id FROM users_usr')) return Promise.resolve({ rows: [{ usr_id: 1 }] });
      if (query.includes('SELECT enr_id FROM environment_roles_enr')) return Promise.resolve({ rows: [{ enr_id: 1 }] });
      if (query.includes('SELECT stt_code FROM step_types_stt')) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });
    await expect(generateCanonicalPlans(CONFIG, {})).rejects.toThrow('Step types (MAN, AUT, etc.) not found.');
  });

  it('should throw an error if no iteration types are found', async () => {
    client.query.mockImplementation(query => {
      if (query.includes('SELECT COUNT(*) FROM teams_tms')) return Promise.resolve({ rows: [{ count: '1' }] });
      if (query.includes('SELECT COUNT(*) FROM users_usr')) return Promise.resolve({ rows: [{ count: '1' }] });
      if (query.includes('SELECT COUNT(*) FROM environment_roles_enr')) return Promise.resolve({ rows: [{ count: '1' }] });
      if (query.includes('SELECT COUNT(*) FROM step_types_stt')) return Promise.resolve({ rows: [{ count: '1' }] });
      if (query.includes('SELECT COUNT(*) FROM iteration_types_itt')) return Promise.resolve({ rows: [{ count: '0' }] });
      if (query.includes('SELECT tms_id FROM teams_tms')) return Promise.resolve({ rows: [{ tms_id: 1 }] });
      if (query.includes('SELECT usr_id FROM users_usr')) return Promise.resolve({ rows: [{ usr_id: 1 }] });
      if (query.includes('SELECT enr_id FROM environment_roles_enr')) return Promise.resolve({ rows: [{ enr_id: 1 }] });
      if (query.includes('SELECT stt_code FROM step_types_stt')) return Promise.resolve({ rows: [{ stt_code: 'MANUAL' }] });
      if (query.includes('SELECT itt_code FROM iteration_types_itt')) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });
    await expect(generateCanonicalPlans(CONFIG, {})).rejects.toThrow('Iteration types (RUN, DR, CUTOVER) not found.');
  });

  it('should generate exactly one canonical plan with a full hierarchy', async () => {
    client.query.mockImplementation(mockHappyPathQueries);
    await generateCanonicalPlans(CONFIG, {});
    const allCalls = client.query.mock.calls;

    const planInserts = allCalls.filter(([q]) => q.includes('INSERT INTO plans_master_plm'));
    expect(planInserts.length).toBe(1);

    const sequenceInserts = allCalls.filter(([q]) => q.includes('INSERT INTO sequences_master_sqm'));
    expect(sequenceInserts.length).toBe(5);

    const expectedSequences = ['PREMIG', 'CSD', 'W12', 'P&C', 'POSTMIG'];
    sequenceInserts.forEach(([query, params], index) => {
      expect(params[1]).toBe(index + 1);
      expect(params[2]).toBe(expectedSequences[index]);
    });

    const allQueries = allCalls.map(([q]) => q);
    expect(allQueries.some(q => q.includes('INSERT INTO phases_master_phm'))).toBe(true);
    expect(allQueries.some(q => q.includes('INSERT INTO controls_master_ctm'))).toBe(true);
    expect(allQueries.some(q => q.includes('INSERT INTO steps_master_stm'))).toBe(true);
    expect(allQueries.some(q => q.includes('INSERT INTO instructions_master_inm'))).toBe(true);
    expect(allQueries.some(q => q.includes('INSERT INTO steps_master_stm_x_iteration_types_itt'))).toBe(true);
    expect(allQueries.some(q => q.includes('INSERT INTO steps_master_stm_x_teams_tms_impacted'))).toBe(true);
  });
});