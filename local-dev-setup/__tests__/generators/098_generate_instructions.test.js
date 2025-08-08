import {
  generateInstructions,
  eraseInstructionsTables,
} from "../../scripts/generators/098_generate_instructions.js";
import { client } from "../../scripts/lib/db.js";
import { faker } from "../../scripts/lib/utils.js";

// Mock the database client and faker utilities
jest.mock("../../scripts/lib/db.js", () => ({
  client: {
    query: jest.fn(),
  },
}));

jest.mock("../../scripts/lib/utils.js", () => ({
  ...jest.requireActual("../../scripts/lib/utils.js"), // Keep non-faker exports
  faker: {
    number: {
      int: jest.fn(),
    },
    lorem: {
      sentence: jest.fn(),
      paragraph: jest.fn(),
    },
    helpers: {
      arrayElement: jest.fn(),
    },
    datatype: {
      boolean: jest.fn(),
    },
  },
}));

const CONFIG = {
  INSTRUCTIONS: {
    PER_STEP: { MIN: 1, MAX: 2 },
    BODY_TYPE: "sentence",
    DURATION_MIN: 5,
    DURATION_MAX: 30,
    REQUIRE_TEAM: true,
    OPTIONAL_CONTROL: true,
  },
};

describe("Instructions Generator (101_generate_instructions.js)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Provide default mock implementations
    faker.number.int.mockReturnValue(1);
    faker.lorem.sentence.mockReturnValue("A mock instruction sentence.");
    faker.helpers.arrayElement.mockImplementation((arr) => arr[0]);
    faker.datatype.boolean.mockReturnValue(true);
  });

  describe("eraseInstructionsTables", () => {
    it("should truncate both instructions tables", async () => {
      const mockDbClient = { query: jest.fn().mockResolvedValue({}) };
      await eraseInstructionsTables(mockDbClient);
      expect(mockDbClient.query).toHaveBeenCalledWith(
        "TRUNCATE TABLE instructions_instance_ini RESTART IDENTITY CASCADE",
      );
      expect(mockDbClient.query).toHaveBeenCalledWith(
        "TRUNCATE TABLE instructions_master_inm RESTART IDENTITY CASCADE",
      );
      expect(mockDbClient.query).toHaveBeenCalledTimes(2);
    });
  });

  describe("generateInstructions", () => {
    it("should call erase function when erase option is true", async () => {
      client.query.mockResolvedValue({ rows: [{ stm_id: "s1" }], rowCount: 1 }); // Mock all queries
      await generateInstructions(CONFIG, { erase: true });
      // The first two calls should be the TRUNCATE queries from eraseInstructionsTables
      expect(client.query).toHaveBeenCalledWith(
        "TRUNCATE TABLE instructions_instance_ini RESTART IDENTITY CASCADE",
      );
      expect(client.query).toHaveBeenCalledWith(
        "TRUNCATE TABLE instructions_master_inm RESTART IDENTITY CASCADE",
      );
    });

    it("should throw an error if no master steps are found", async () => {
      client.query.mockResolvedValueOnce({ rows: [] }); // No steps
      await expect(generateInstructions(CONFIG)).rejects.toThrow(
        "Cannot generate instructions: missing steps or teams.",
      );
    });

    it("should throw an error if no master teams are found", async () => {
      client.query
        .mockResolvedValueOnce({ rows: [{ stm_id: "s1" }] }) // Steps exist
        .mockResolvedValueOnce({ rows: [] }); // No teams
      await expect(generateInstructions(CONFIG)).rejects.toThrow(
        "Cannot generate instructions: missing steps or teams.",
      );
    });

    it("should generate and insert master instructions correctly", async () => {
      // Arrange: Mock all database calls in order
      client.query
        // Master data fetches
        .mockResolvedValueOnce({ rows: [{ stm_id: "s1" }] }) // 1. Get steps
        .mockResolvedValueOnce({ rows: [{ tms_id: "t1" }] }) // 2. Get teams
        .mockResolvedValueOnce({ rows: [{ ctm_id: "c1" }] }) // 3. Get controls
        // INSERT into instructions_master_inm...RETURNING
        .mockResolvedValueOnce({ rows: [{ inm_id: "inm1" }] }); // 4. Insert master

      faker.number.int.mockReturnValue(1); // Generate 1 instruction per step
      faker.helpers.arrayElement.mockImplementation((arr) => arr[0]); // Always pick the first element

      // Act
      await generateInstructions(CONFIG);

      // Assert
      // Check master instruction insertion
      expect(client.query).toHaveBeenCalledWith(
        expect.stringMatching(/INSERT INTO instructions_master_inm/),
        ["s1", "t1", "c1", 1, "A mock instruction sentence.", 1],
      );
    });
  });
});
