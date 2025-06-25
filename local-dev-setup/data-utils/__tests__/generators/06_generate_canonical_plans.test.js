const { client } = require('../../lib/db');
const { generateCanonicalPlans } = require('../../generators/06_generate_canonical_plans');
const { faker } = require('../../lib/utils');

// Mock dependencies
jest.mock('../../lib/db', () => ({ client: { query: jest.fn() } }));
jest.mock('../../lib/utils', () => ({
  faker: {
    lorem: { words: jest.fn(() => 'some words'), paragraph: jest.fn(() => 'a paragraph'), sentence: jest.fn(() => 'a sentence'), paragraphs: jest.fn(() => 'some paragraphs') },
    number: { int: jest.fn(() => 1) },
    helpers: { arrayElement: jest.fn(arr => arr[0]), arrayElements: jest.fn(arr => [arr[0]]) },
    company: { buzzPhrase: jest.fn(() => 'synergistic solution') },
    word: { noun: jest.fn(() => 'noun') },
    commerce: { productName: jest.fn(() => 'product'), productAdjective: jest.fn(() => 'adjective') },
    datatype: { boolean: jest.fn(() => false) },
    hacker: { verb: jest.fn(() => 'verb') },
  },
}));

// A simplified config for testing purposes
const CONFIG = {
  num_canonical_plans: 1, // Generate only one plan to keep tests simple
};

describe('Canonical Plans Generator (06_generate_canonical_plans.js)', () => {
  beforeEach(() => {
    client.query.mockReset();
    jest.clearAllMocks();
  });

  // This helper mocks all necessary SELECT queries for a successful run.
  const mockHappyPathQueries = (query) => {
      if (query.includes('TRUNCATE')) return Promise.resolve({ rows: [] });
      if (query.includes('FROM teams_tms')) return Promise.resolve({ rows: [{ tms_id: 'team-1' }, { tms_id: 'team-2' }] });
      if (query.includes('FROM environment_roles_enr')) return Promise.resolve({ rows: [{ enr_id: 'role-1' }] });
      if (query.includes('FROM step_types_stt')) return Promise.resolve({ rows: [{ stt_code: 'MAN' }] });
      if (query.includes('FROM iteration_types_itt')) return Promise.resolve({ rows: [{ itt_code: 'RUN' }] });
      // Mock INSERT statements to return IDs for subsequent queries
      if (query.includes('INSERT INTO plans_master_plm')) return Promise.resolve({ rows: [{ plm_id: 'plm-1' }] });
      if (query.includes('INSERT INTO sequences_master_sqm')) return Promise.resolve({ rows: [{ sqm_id: 'sqm-1' }] });
      if (query.includes('INSERT INTO phases_master_phm')) return Promise.resolve({ rows: [{ phm_id: 'phm-1' }] });
      if (query.includes('INSERT INTO controls_master_ctm')) return Promise.resolve({ rows: [{ ctm_id: 'ctm-1' }] });
      if (query.includes('INSERT INTO steps_master_stm')) return Promise.resolve({ rows: [{ stm_id: 'stm-1' }] });
      // Default for other INSERTs (link tables)
      return Promise.resolve({ rows: [] });
  };

  it('should call resetCanonicalPlansTables when reset option is true', async () => {
    // Arrange
    client.query.mockImplementation(mockHappyPathQueries);

    // Act
    await generateCanonicalPlans(CONFIG, { reset: true });

    // Assert
    expect(client.query).toHaveBeenCalledWith('TRUNCATE TABLE "plans_master_plm" RESTART IDENTITY CASCADE');
  });

  it('should throw an error if no teams are found', async () => {
    // Arrange
    client.query.mockResolvedValue({ rows: [] }); // No teams

    // Act & Assert
    await expect(generateCanonicalPlans(CONFIG, {})).rejects.toThrow('Cannot generate canonical plans without teams to assign as owners.');
  });

  it('should throw an error if no environment roles are found', async () => {
    // Arrange
    client.query
      .mockResolvedValueOnce({ rows: [{ tms_id: 'team-1' }] }) // teams exist
      .mockResolvedValueOnce({ rows: [] }); // No env roles

    // Act & Assert
    await expect(generateCanonicalPlans(CONFIG, {})).rejects.toThrow('Environment roles (PROD, TEST, BACKUP) not found.');
  });

  it('should throw an error if no step types are found', async () => {
    // Arrange
    client.query
      .mockResolvedValueOnce({ rows: [{ tms_id: 'team-1' }] }) // teams exist
      .mockResolvedValueOnce({ rows: [{ enr_id: 'role-1' }] }) // env roles exist
      .mockResolvedValueOnce({ rows: [] }); // No step types

    // Act & Assert
    await expect(generateCanonicalPlans(CONFIG, {})).rejects.toThrow('Step types (MAN, AUT, etc.) not found.');
  });

  it('should throw an error if no iteration types are found', async () => {
    // Arrange
    client.query
      .mockResolvedValueOnce({ rows: [{ tms_id: 'team-1' }] }) // teams exist
      .mockResolvedValueOnce({ rows: [{ enr_id: 'role-1' }] }) // env roles exist
      .mockResolvedValueOnce({ rows: [{ stt_code: 'MAN' }] }) // step types exist
      .mockResolvedValueOnce({ rows: [] }); // No iteration types

    // Act & Assert
    await expect(generateCanonicalPlans(CONFIG, {})).rejects.toThrow('Iteration types (RUN, DR, CUTOVER) not found.');
  });

  it('should generate a full plan hierarchy correctly', async () => {
    // Arrange
    client.query.mockImplementation(mockHappyPathQueries);

    // Act
    await generateCanonicalPlans(CONFIG, {});

    // Assert
    const allQueries = client.query.mock.calls.map(call => call[0]);

    // Check that all main entity types were inserted
    expect(allQueries.some(q => q.includes('INSERT INTO plans_master_plm'))).toBe(true);
    expect(allQueries.some(q => q.includes('INSERT INTO sequences_master_sqm'))).toBe(true);
    expect(allQueries.some(q => q.includes('INSERT INTO phases_master_phm'))).toBe(true);
    expect(allQueries.some(q => q.includes('INSERT INTO controls_master_ctm'))).toBe(true);
    expect(allQueries.some(q => q.includes('INSERT INTO steps_master_stm'))).toBe(true);
    expect(allQueries.some(q => q.includes('INSERT INTO instructions_master_inm'))).toBe(true);
    // Check link tables
    expect(allQueries.some(q => q.includes('INSERT INTO steps_master_stm_x_iteration_types_itt'))).toBe(true);
    expect(allQueries.some(q => q.includes('INSERT INTO steps_master_stm_x_teams_tms_impacted'))).toBe(true);
  });
});
