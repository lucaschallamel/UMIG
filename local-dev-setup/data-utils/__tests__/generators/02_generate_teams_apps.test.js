const { generateTeamsAndApps } = require('../../generators/02_generate_teams_apps');
const { client } = require('../../lib/db');
const { faker } = require('../../lib/utils');

// Mock the database client to avoid actual DB calls during tests
jest.mock('../../lib/db', () => ({
  client: {
    query: jest.fn().mockResolvedValue({ rows: [] }),
  },
}));

// Mock faker to ensure we get deterministic and predictable results for our tests
jest.mock('../../lib/utils', () => ({
  ...jest.requireActual('../../lib/utils'), // Retain other utilities
  faker: {
    commerce: {
      department: jest.fn()
        .mockReturnValueOnce('Marketing')
        .mockReturnValueOnce('Engineering')
        .mockReturnValue('Sales'),
      productName: jest.fn().mockReturnValue('Super Product'),
    },
    company: {
      catchPhrase: jest.fn().mockReturnValue('Synergizing solutions'),
    },
    lorem: {
      sentence: jest.fn().mockReturnValue('A great product description.'),
    },
    helpers: {
      arrayElement: jest.fn()
        .mockReturnValueOnce('Team')
        .mockReturnValue('Group'),
    },
    number: {
      int: jest.fn().mockReturnValue(2),
    },
  },
}));

describe('Data Generator: Teams and Applications', () => {
  const config = {
    num_teams: 5,
    num_apps: 3,
    teams_email_domain: 'umig.com',
  };

  beforeEach(() => {
    // Resets the state of ALL mocks before each test.
    // This clears all mock history AND removes any mocked implementations,
    // which is crucial for resetting stateful mocks like mockReturnValueOnce.
    jest.resetAllMocks();

    // Redefine mock implementations for faker to ensure a clean, predictable state
    faker.commerce.department
      .mockReturnValueOnce('Marketing')
      .mockReturnValueOnce('Engineering')
      .mockReturnValue('Sales');

    faker.helpers.arrayElement
      .mockReturnValueOnce('Team')
      .mockReturnValue('Group');

    faker.company.catchPhrase.mockReturnValue('Synergizing solutions');
    faker.commerce.productName.mockReturnValue('Super Product');
    faker.lorem.sentence.mockReturnValue('A great product description.');
    faker.number.int.mockReturnValue(2);

    // Provide a default mock for the database client for simple INSERTs
    client.query.mockResolvedValue({ rows: [] });

    // Silence console output for cleaner test results
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore all mocks created with jest.spyOn. This will restore console.
    jest.restoreAllMocks();
  });

  test('it should generate the correct number of teams and applications', async () => {
    await generateTeamsAndApps(config);

    const teamInsertions = client.query.mock.calls.filter(call => call[0].includes('INSERT INTO teams_tms')).length;
    const appInsertions = client.query.mock.calls.filter(call => call[0].includes('INSERT INTO applications_app')).length;

    expect(teamInsertions).toBe(config.num_teams);
    expect(appInsertions).toBe(3);
  });

  test('it should always create the IT_CUTOVER team first for consistency', async () => {
    await generateTeamsAndApps(config);

    const firstTeamCall = client.query.mock.calls.find(call => call[0].includes('INSERT INTO teams_tms'));
    expect(firstTeamCall).toBeDefined();
    expect(firstTeamCall[1][0]).toBe('IT_CUTOVER');
  });

  test('it should generate teams with new, more realistic names', async () => {
    await generateTeamsAndApps(config);

    const teamInsertCalls = client.query.mock.calls.filter(call => call[0].includes('INSERT INTO teams_tms'));

    // The first call is IT_CUTOVER. Test the subsequent, dynamically generated names.
    // Access the first element of the parameters array, which is the name.
    const secondTeamName = teamInsertCalls[1][1][0];
    expect(secondTeamName).toBe('Marketing Team'); // Based on our mocked faker values

    const thirdTeamName = teamInsertCalls[2][1][0];
    expect(thirdTeamName).toBe('Engineering Group'); // Based on our mocked faker values
  });

  test('it should link teams to applications after creating them', async () => {
    // Use mockImplementation for robust, query-aware mocking
    client.query.mockImplementation((query) => {
      // Handle SELECT for team IDs
      if (query && query.startsWith('SELECT tms_id')) {
        return Promise.resolve({ rows: [{ tms_id: 1 }, { tms_id: 2 }] });
      }
      // Handle SELECT for app IDs
      if (query && query.startsWith('SELECT app_id')) {
        return Promise.resolve({ rows: [{ app_id: 101 }, { app_id: 102 }] });
      }
      // For all other queries (i.e., INSERTs), return an empty result set.
      return Promise.resolve({ rows: [] });
    });

    await generateTeamsAndApps(config);

    const linkInsertions = client.query.mock.calls.filter(call => call[0].includes('INSERT INTO teams_tms_x_applications_app')).length;
    expect(linkInsertions).toBeGreaterThan(0);
  });

  test('it should create the exact number of links specified by the mock', async () => {
    // Arrange
    const mockTeams = [{ tms_id: 1 }, { tms_id: 2 }];
    const mockApps = [{ app_id: 101 }, { app_id: 102 }, { app_id: 103 }];
    const linksPerTeam = 2;

    client.query.mockImplementation((query) => {
      if (query.startsWith('SELECT tms_id')) return Promise.resolve({ rows: mockTeams });
      if (query.startsWith('SELECT app_id')) return Promise.resolve({ rows: mockApps });
      return Promise.resolve({ rows: [] }); // For INSERTs
    });

    // Mock faker to return a fixed number of links
    faker.number.int.mockReturnValue(linksPerTeam);

    // Act
    await generateTeamsAndApps(config);

    // Assert
    const linkInsertCalls = client.query.mock.calls.filter(call => call[0].includes('INSERT INTO teams_tms_x_applications_app'));
    expect(linkInsertCalls.length).toBe(mockTeams.length * linksPerTeam);
  });

  test('it should handle cases with no teams or apps to link gracefully', async () => {
    // Mock SELECT queries to return empty arrays, simulating no data
    client.query.mockImplementation((query) => {
      // For any SELECT query, return no rows.
      if (query && query.startsWith('SELECT')) {
        return Promise.resolve({ rows: [] });
      }
      // For all other queries (i.e., INSERTs), return an empty result set.
      return Promise.resolve({ rows: [] });
    });

    await generateTeamsAndApps(config);

    const linkInsertions = client.query.mock.calls.filter(call => call[0].includes('INSERT INTO teams_tms_x_applications_app')).length;
    expect(linkInsertions).toBe(0);
    expect(console.warn).toHaveBeenCalledWith('Warning: No teams or applications found to link.');
  });

  test('it should handle and throw an error if table reset fails', async () => {
    // Arrange
    const dbError = new Error('DB Reset Failed');
    client.query.mockRejectedValue(dbError);
    // Spy on console.error to track calls without logging to the console
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Act & Assert
    await expect(generateTeamsAndApps(config, { reset: true })).rejects.toThrow(dbError);
    expect(errorSpy).toHaveBeenCalledWith('Error generating teams and applications:', dbError);

    // Clean up the spy
    errorSpy.mockRestore();
  });
});
