import { client } from '../../scripts/lib/db.js';
import { generateCoreMetadata } from '../../scripts/generators/01_generate_core_metadata.js';

// Mock the database client
jest.mock('../../scripts/lib/db', () => ({
  client: {
    query: jest.fn(),
  },
}));

describe('Core Metadata Generator (01_generate_core_metadata.js)', () => {
  beforeEach(() => {
    // Clear mock history before each test
    client.query.mockReset();
  });

  it('should populate roles and step types with correct, idempotent queries', async () => {
    // Arrange: Mock a successful database query result
    client.query.mockResolvedValue({ rows: [], rowCount: 1 });

    // Act: Run the metadata generator
    await generateCoreMetadata();

    // Assert: Check that all roles and step types were inserted
    // There are 3 roles and 9 step types
    const expectedTotalQueries = 3 + 9;
    expect(client.query).toHaveBeenCalledTimes(expectedTotalQueries);

    // Check a sample role query to ensure correctness
    expect(client.query).toHaveBeenCalledWith(
      'INSERT INTO roles_rls (rls_code, rls_description) VALUES ($1, $2) ON CONFLICT (rls_code) DO NOTHING',
      ['ADMIN', 'Full access to all system features.']
    );

    // Check a sample step type query to ensure correctness
    expect(client.query).toHaveBeenCalledWith(
      'INSERT INTO step_types_stt (stt_code, stt_name, stt_color) VALUES ($1, $2, $3) ON CONFLICT (stt_code) DO NOTHING',
      ['TRT', 'TREATMENTS', '#1ba1e2']
    );
  });

  it('should throw an error if a database query fails', async () => {
    // Arrange: Mock a failed database query
    const mockError = new Error('Database connection error');
    client.query.mockRejectedValue(mockError);

    // Spy on console.error to ensure it's called
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Act & Assert: Expect the function to reject with the mocked error
    await expect(generateCoreMetadata()).rejects.toThrow(mockError);

    // Assert that the error was logged
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error generating core metadata:', mockError);

    // Clean up the spy
    consoleErrorSpy.mockRestore();
  });
});
