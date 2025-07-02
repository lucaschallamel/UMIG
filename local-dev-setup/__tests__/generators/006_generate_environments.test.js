import { client } from '../../scripts/lib/db.js';
import { generateAllEnvironments, eraseEnvironmentsTable } from '../../scripts/generators/006_generate_environments.js';
import { faker } from '@faker-js/faker';

// Mock dependencies
jest.mock('../../scripts/lib/db.js', () => ({ client: { query: jest.fn() } }));
jest.mock('@faker-js/faker', () => ({
  faker: {
    helpers: {
      arrayElement: jest.fn(),
      arrayElements: jest.fn(),
    },
    number: { int: jest.fn() },
  },
}));

const mockEnvironments = [
  { name: 'PROD', description: 'Production environment' },
  { name: 'DEV', description: 'Development environment' },
  { name: 'QA', description: 'QA environment' },
];

describe('Environments Generator (06_generate_environments.js)', () => {
  let dbData;
  beforeEach(() => {
    client.query = jest.fn(); // Forcefully create a new mock function for each test
    dbData = mockDbWithData();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Setup default faker mocks
    faker.helpers.arrayElement.mockImplementation(arr => arr[0]);
    faker.helpers.arrayElements.mockImplementation((arr, num) => arr.slice(0, num));
    faker.number.int.mockReturnValue(1); // Default to 1 to keep tests predictable
  });

  const mockDbWithData = () => {
    // This counter is scoped to each call of mockDbWithData, ensuring it resets for each test.
    let envInsertCount = 0;
    const dbData = {
      apps: [{ app_id: 'app-1' }],
      iterations: [{ ite_id: 'ite-1' }],
      envRoles: [{ enr_id: 'role-1' }],
      envs: [{ env_id: 'env-1' }], // Used for the SELECT fallback logic in the generator
    };
    client.query.mockImplementation((sql) => {
      if (sql.includes('SELECT app_id FROM applications_app')) return Promise.resolve({ rows: dbData.apps });
      if (sql.includes('SELECT ite_id FROM iterations_ite')) return Promise.resolve({ rows: dbData.iterations });
      if (sql.includes('SELECT enr_id FROM environment_roles_enr')) return Promise.resolve({ rows: dbData.envRoles });
      if (sql.includes('INSERT INTO environments_env')) {
        envInsertCount++;
        return Promise.resolve({ rows: [{ env_id: `env-${envInsertCount}` }] });
      }
      if (sql.includes('SELECT env_id FROM environments_env')) return Promise.resolve({ rows: dbData.envs });
      return Promise.resolve({ rows: [] });
    });
    return dbData;
  };

  describe('generateAllEnvironments', () => {
    it('should call eraseEnvironmentsTable when erase option is true', async () => {
      mockDbWithData();
      await generateAllEnvironments(mockEnvironments, { erase: true });
      const truncateCalls = client.query.mock.calls.filter(c => c[0].startsWith('TRUNCATE'));
      expect(truncateCalls.length).toBe(3);
      expect(truncateCalls.map(c => c[0])).toEqual(expect.arrayContaining([
        'TRUNCATE TABLE "environments_env_x_applications_app" RESTART IDENTITY CASCADE',
        'TRUNCATE TABLE "environments_env_x_iterations_ite" RESTART IDENTITY CASCADE',
        'TRUNCATE TABLE "environments_env" RESTART IDENTITY CASCADE',
      ]));
    });

    it('should insert all environments from config', async () => {
      // Isolate this test by setting up its own mock implementation
      client.query.mockImplementation((sql) => {
        if (sql.includes('INSERT INTO environments_env')) {
          return Promise.resolve({ rows: [{ env_id: 'test-id' }] });
        }
        return Promise.resolve({ rows: [] }); // Default empty response
      });

      // Clear call history from any previous tests before running the generator
      client.query.mockClear();

      await generateAllEnvironments(mockEnvironments, {});

      const insertCalls = client.query.mock.calls.filter(c => c[0].includes('INSERT INTO environments_env'));
      expect(insertCalls.length).toBe(mockEnvironments.length);
      expect(insertCalls[0][1]).toEqual(['PROD', 'PROD', 'Production environment']);
    });

    it('should link environments to apps and iterations', async () => {
      await generateAllEnvironments(mockEnvironments, {});

      const appLinks = client.query.mock.calls.filter(c => c[0].includes('environments_env_x_applications_app'));
      const iterLinks = client.query.mock.calls.filter(c => c[0].includes('environments_env_x_iterations_ite'));

      expect(appLinks.length).toBe(mockEnvironments.length);
      expect(iterLinks.length).toBe(mockEnvironments.length);

      // Assert against the predictable, generated ID
      expect(appLinks[0][1]).toEqual(['env-1', dbData.apps[0].app_id]);
      expect(iterLinks[0][1]).toEqual(['env-1', dbData.iterations[0].ite_id, dbData.envRoles[0].enr_id]);
    });

    it('should handle cases with no apps, iterations, or roles to link', async () => {
      client.query.mockResolvedValue({ rows: [] }); // No data in any table
      await generateAllEnvironments(mockEnvironments, {});
      const insertCalls = client.query.mock.calls.filter(c => c[0].includes('INSERT INTO'));
      // Only envs should be inserted, no links
      expect(insertCalls.length).toBe(mockEnvironments.length);
    });

    it('should use existing environments if none are created', async () => {
      client.query.mockImplementation((sql) => {
        if (sql.includes('INSERT INTO environments_env')) return Promise.resolve({ rows: [] }); // No new envs
        if (sql.includes('SELECT env_id FROM environments_env')) return Promise.resolve({ rows: dbData.envs });
        if (sql.includes('SELECT app_id FROM applications_app')) return Promise.resolve({ rows: dbData.apps });
        if (sql.includes('SELECT ite_id FROM iterations_ite')) return Promise.resolve({ rows: dbData.iterations });
        if (sql.includes('SELECT enr_id FROM environment_roles_enr')) return Promise.resolve({ rows: dbData.envRoles });
        return Promise.resolve({ rows: [] });
      });

      await generateAllEnvironments(mockEnvironments, {});
      const linkCalls = client.query.mock.calls.filter(c => c[0].includes('_x_'));
      expect(linkCalls.length).toBe(2); // One app link, one iter link
    });
  });

  describe('eraseEnvironmentsTable', () => {
    it('should truncate tables in the correct order', async () => {
      client.query.mockResolvedValue({ rows: [] });
      await eraseEnvironmentsTable(client);
      const calls = client.query.mock.calls.map(c => c[0]);
      expect(calls).toEqual([
        'TRUNCATE TABLE "environments_env_x_applications_app" RESTART IDENTITY CASCADE',
        'TRUNCATE TABLE "environments_env_x_iterations_ite" RESTART IDENTITY CASCADE',
        'TRUNCATE TABLE "environments_env" RESTART IDENTITY CASCADE',
      ]);
    });

    it('should throw an error if truncation fails', async () => {
      const dbError = new Error('DB truncate failed');
      client.query.mockRejectedValue(dbError);
      await expect(eraseEnvironmentsTable(client)).rejects.toThrow(dbError);
    });
  });
});
