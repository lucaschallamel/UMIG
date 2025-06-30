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
    faker.string.alpha.mockImplementation(() => `T${String(trigramCounter++).padStart(2, '0')}`);
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
    const insertCalls = client.query.mock.calls.filter(call => call[0].startsWith('INSERT'));
    const totalUsers = CONFIG.USERS.NORMAL.COUNT + CONFIG.USERS.ADMIN.COUNT + CONFIG.USERS.PILOT.COUNT;
    expect(insertCalls.length).toBe(totalUsers);

    // Check that each user was inserted with the correct team and role ID
    const adminUsers = insertCalls.filter(call => call[1][6] === 'admin-role-id');
    expect(adminUsers.length).toBe(CONFIG.USERS.ADMIN.COUNT);
    adminUsers.forEach(call => {
      expect(call[1][5]).toBe('it-team-id'); // tms_id
    });

    const pilotUsers = insertCalls.filter(call => call[1][6] === 'pilot-role-id');
    expect(pilotUsers.length).toBe(CONFIG.USERS.PILOT.COUNT);
    pilotUsers.forEach(call => {
      expect(call[1][5]).toBe('it-team-id'); // tms_id
    });

    const normalUsers = insertCalls.filter(call => call[1][6] === 'normal-role-id');
    expect(normalUsers.length).toBe(CONFIG.USERS.NORMAL.COUNT);
    normalUsers.forEach(call => {
      expect(call[1][5]).toBe('normal-team-id'); // tms_id
    });
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
    const insertCalls = client.query.mock.calls.filter(call => call[0].startsWith('INSERT'));
    const normalUserInsertions = insertCalls.filter(call => call[1][6] === 'normal-role-id');
    const assignedTeamIds = new Set(normalUserInsertions.map(call => call[1][5]));

    expect(assignedTeamIds.size).toBe(normalTeamIds.length);
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