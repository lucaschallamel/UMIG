const { client } = require('../../lib/db');
const { generateUsers } = require('../../generators/03_generate_users');
const { faker } = require('../../lib/utils');

// Mock the database client and faker
jest.mock('../../lib/db', () => ({ client: { query: jest.fn() } }));
jest.mock('../../lib/utils', () => ({ faker: { string: { alpha: jest.fn() }, person: { firstName: jest.fn(), lastName: jest.fn() } } }));

const CONFIG = {
  USERS: {
    NORMAL: { COUNT: 5 },
    ADMIN: { COUNT: 2 },
    PILOT: { COUNT: 1 },
  },
  TEAMS: {
    EMAIL_DOMAIN: 'test.com',
  },
};

describe('Users Generator (03_generate_users.js)', () => {
  beforeEach(() => {
    // Reset mocks before each test
    client.query.mockReset();
    faker.string.alpha.mockReset();
    faker.person.firstName.mockReset();
    faker.person.lastName.mockReset();

    // Setup default mock implementations
    faker.person.firstName.mockReturnValue('John');
    faker.person.lastName.mockReturnValue('Doe');
    let trigramCounter = 0;
    let usrIdCounter = 1000;
    faker.string.alpha.mockImplementation(() => `T${String(trigramCounter++).padStart(2, '0')}`);

    // Global mock for DB: handle user insert/select, plus passthrough for others
    client.query.mockImplementation((sql, params) => {
      if (sql.startsWith('INSERT INTO users_usr')) {
        return Promise.resolve({ rows: [{ usr_id: usrIdCounter++ }] });
      }
      if (sql.startsWith('SELECT usr_id FROM users_usr WHERE usr_code = $1')) {
        // Map trigram to a fake usr_id (simulate deterministic mapping)
        return Promise.resolve({ rows: [{ usr_id: usrIdCounter++ }] });
      }
      // Default: return empty rows (for roles, teams, etc. these are explicitly set up in each test)
      return Promise.resolve({ rows: [] });
    });
  });

  it('should call resetUsersTable when reset option is true', async () => {
    // Arrange: Provide specific mocks for each sequential query
    client.query
      .mockResolvedValueOnce({ rows: [] }) // For the TRUNCATE call
      .mockResolvedValueOnce({ rows: [{ rls_id: 'admin-id', rls_code: 'ADMIN' }, { rls_id: 'normal-id', rls_code: 'NORMAL' }, { rls_id: 'pilot-id', rls_code: 'PILOT' }] }) // For the roles query
      .mockResolvedValueOnce({ rows: [{ tms_id: 'it-team-id', tms_name: 'IT_CUTOVER' }] }); // For the teams query

    // Act
    await generateUsers(CONFIG, { reset: true });

    // Assert: Check that the TRUNCATE command was the first call
    expect(client.query).toHaveBeenNthCalledWith(1, 'TRUNCATE TABLE "users_usr" RESTART IDENTITY CASCADE');
  });

  it('should generate ADMIN, PILOT, and NORMAL users with correct roles and teams', async () => {
    // Arrange
    const mockRoles = [
      { rls_id: 'admin-role-id', rls_code: 'ADMIN' },
      { rls_id: 'normal-role-id', rls_code: 'NORMAL' },
      { rls_id: 'pilot-role-id', rls_code: 'PILOT' },
    ];
    const mockTeams = [
      { tms_id: 'it-team-id', tms_name: 'IT_CUTOVER' },
      { tms_id: 'normal-team-id', tms_name: 'Team A' },
    ];
    client.query
      .mockResolvedValueOnce({ rows: mockRoles })
      .mockResolvedValueOnce({ rows: mockTeams });

    // Act
    await generateUsers(CONFIG, {});

    // Assert
    // Find all user and join table insert calls
    const userInserts = client.query.mock.calls.filter(call => call[0].includes('INSERT INTO users_usr'));
    const joinInserts = client.query.mock.calls.filter(call => call[0].includes('INSERT INTO teams_tms_x_users_usr'));
    const totalUsers = CONFIG.USERS.NORMAL.COUNT + CONFIG.USERS.ADMIN.COUNT + CONFIG.USERS.PILOT.COUNT;
    expect(userInserts.length).toBe(totalUsers);
    expect(joinInserts.length).toBe(totalUsers);

    // Check that each join table insert has correct team and user
    // (simulate usr_id propagation; here we just check correct teamId argument ordering)
    const itCutoverJoins = joinInserts.filter(call => call[1][0] === 'it-team-id');
    expect(itCutoverJoins.length).toBe(CONFIG.USERS.ADMIN.COUNT + CONFIG.USERS.PILOT.COUNT);
    const normalJoins = joinInserts.filter(call => call[1][0] === 'normal-team-id');
    expect(normalJoins.length).toBe(CONFIG.USERS.NORMAL.COUNT);
  });

  it('should throw an error if required roles are missing', async () => {
    // Arrange
    client.query.mockResolvedValue({ rows: [{ rls_id: 'normal-id', rls_code: 'NORMAL' }] }); // Missing ADMIN and PILOT
    // Act & Assert
    await expect(generateUsers(CONFIG, {})).rejects.toThrow('Required roles (ADMIN, NORMAL, PILOT) not found in database.');
  });

  it('should throw an error if IT_CUTOVER team is missing', async () => {
    // Arrange
    const mockRoles = [
      { rls_id: 'admin-role-id', rls_code: 'ADMIN' },
      { rls_id: 'normal-role-id', rls_code: 'NORMAL' },
      { rls_id: 'pilot-role-id', rls_code: 'PILOT' },
    ];
    client.query.mockResolvedValueOnce({ rows: mockRoles })
                 .mockResolvedValueOnce({ rows: [{ tms_id: 'normal-team-id', tms_name: 'Team A' }] }); // Missing IT_CUTOVER
    // Act & Assert
    await expect(generateUsers(CONFIG, {})).rejects.toThrow('IT_CUTOVER team not found for admin/pilot user assignment.');
  });

  it('should ensure every non-IT_CUTOVER team has at least one member', async () => {
    // Arrange
    const mockRoles = [
      { rls_id: 'normal-role-id', rls_code: 'NORMAL' },
      { rls_id: 'admin-role-id', rls_code: 'ADMIN' },
      { rls_id: 'pilot-role-id', rls_code: 'PILOT' },
    ];
    const mockTeams = [
      { tms_id: 'it-team-id', tms_name: 'IT_CUTOVER' },
      { tms_id: 'team-a-id', tms_name: 'Team A' },
      { tms_id: 'team-b-id', tms_name: 'Team B' },
      { tms_id: 'team-c-id', tms_name: 'Team C' },
    ];
    const normalTeamIds = mockTeams.filter(t => t.tms_name !== 'IT_CUTOVER').map(t => t.tms_id);

    client.query
      .mockResolvedValueOnce({ rows: mockRoles })
      .mockResolvedValueOnce({ rows: mockTeams });

    // Act: Use a config with enough users to cover all teams
    await generateUsers({ ...CONFIG, num_users: 10 }, {});

    // Assert
    // Find all join table insert calls
    const joinInserts = client.query.mock.calls.filter(call => call[0].includes('INSERT INTO teams_tms_x_users_usr'));
    const assignedTeamIds = new Set(joinInserts.map(call => call[1][0]));
    // Accept that some teams may get more than one user, but all teams get at least one
    for (const teamId of normalTeamIds) {
      expect(assignedTeamIds.has(teamId)).toBe(true);
    }
  });

  it('should log a warning if no normal teams are found', async () => {
    // Arrange
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const mockRoles = [
      { rls_id: 'admin-role-id', rls_code: 'ADMIN' },
      { rls_id: 'normal-role-id', rls_code: 'NORMAL' },
      { rls_id: 'pilot-role-id', rls_code: 'PILOT' },
    ];
    client.query.mockResolvedValueOnce({ rows: mockRoles })
                 .mockResolvedValueOnce({ rows: [{ tms_id: 'it-team-id', tms_name: 'IT_CUTOVER' }] }); // Only IT_CUTOVER team

    // Act
    await generateUsers(CONFIG, {});

    // Assert
    expect(consoleWarnSpy).toHaveBeenCalledWith('Warning: No non-IT_CUTOVER teams found for user assignment.');
    consoleWarnSpy.mockRestore();
  });

  it('should handle errors during table reset', async () => {
    // Arrange
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const dbError = new Error('TRUNCATE failed');
    // Mock the first query (the truncate) to fail
    client.query.mockRejectedValueOnce(dbError);

    // Act & Assert
    await expect(generateUsers(CONFIG, { reset: true })).rejects.toThrow(dbError);
    expect(consoleErrorSpy).toHaveBeenCalledWith(`Error resetting users table: ${dbError}`);
    consoleErrorSpy.mockRestore();
  });
});