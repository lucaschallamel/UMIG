import { client } from "../../scripts/lib/db.js";
import { generateCoreMetadata } from "../../scripts/generators/001_generate_core_metadata.js";

// Import MockStatusProvider for test isolation (TD-003 Phase 3)
const MockStatusProvider = require("../mocks/MockStatusProvider");

// Mock the database client to prevent Jest from parsing the actual db.js file
jest.mock("../../scripts/lib/db", () => ({
  client: {
    query: jest.fn(),
  },
}));

describe("Core Metadata Generator (01_generate_core_metadata.js)", () => {
  let mockStatusProvider;

  beforeEach(() => {
    // Initialize MockStatusProvider for test isolation (TD-003 Phase 3)
    mockStatusProvider = new MockStatusProvider();

    // Clear mock history before each test
    client.query.mockReset();
    // Silence console output
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should populate roles and step types with correct, idempotent queries", async () => {
    // Arrange: Mock a successful database query result
    client.query.mockResolvedValue({ rows: [], rowCount: 1 });

    // Act: Run the metadata generator
    await generateCoreMetadata();

    // Assert: Check that all roles, step types, and statuses were inserted
    // There are 3 roles, 9 step types, and 31 statuses
    const expectedTotalQueries = 3 + 9 + 31;
    expect(client.query).toHaveBeenCalledTimes(expectedTotalQueries);

    // Check a sample role query to ensure correctness
    expect(client.query).toHaveBeenCalledWith(
      "INSERT INTO roles_rls (rls_code, rls_description) VALUES ($1, $2) ON CONFLICT (rls_code) DO NOTHING",
      ["ADMIN", "Full access to all system features."],
    );

    // Check a sample step type query to ensure correctness
    expect(client.query).toHaveBeenCalledWith(
      "INSERT INTO step_types_stt (stt_code, stt_name, stt_color) VALUES ($1, $2, $3) ON CONFLICT (stt_code) DO NOTHING",
      ["TRT", "TREATMENTS", "#1ba1e2"],
    );

    // Check a sample status query to ensure correctness
    expect(client.query).toHaveBeenCalledWith(
      "INSERT INTO status_sts (sts_name, sts_color, sts_type) VALUES ($1, $2, $3) ON CONFLICT (sts_name, sts_type) DO NOTHING",
      ["PLANNING", "#FFA500", "Migration"],
    );

    // Check another sample status query for Steps
    expect(client.query).toHaveBeenCalledWith(
      "INSERT INTO status_sts (sts_name, sts_color, sts_type) VALUES ($1, $2, $3) ON CONFLICT (sts_name, sts_type) DO NOTHING",
      [mockStatusProvider.getStatusNameById(1), "#DDDDDD", "Step"],
    );
  });

  it("should throw an error if a database query fails", async () => {
    // Arrange: Mock a failed database query
    const mockError = new Error("Database connection error");
    client.query.mockRejectedValue(mockError);

    // Act & Assert: Expect the function to reject with the mocked error
    await expect(generateCoreMetadata()).rejects.toThrow(mockError);

    // Assert that the error was logged
    expect(console.error).toHaveBeenCalledWith(
      "Error generating core metadata:",
      mockError,
    );
  });
});
