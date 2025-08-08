import { client } from "../../scripts/lib/db.js";
import {
  generateControls,
  eraseControlsTables,
} from "../../scripts/generators/007_generate_controls.js";
import { faker } from "../../scripts/lib/utils.js";

// Mock dependencies
jest.mock("../../scripts/lib/db.js", () => ({
  client: {
    query: jest.fn(),
  },
}));

jest.mock("../../scripts/lib/utils.js", () => ({
  faker: {
    helpers: {
      arrayElement: jest.fn(),
    },
    lorem: {
      words: jest.fn(),
      sentence: jest.fn(),
    },
    datatype: {
      boolean: jest.fn(),
    },
  },
}));

describe("Controls Generator (07_generate_controls.js)", () => {
  const CONFIG = { CONTROLS: { COUNT: 3 } };
  const mockPhases = [{ phm_id: "phase-1" }, { phm_id: "phase-2" }];

  beforeEach(() => {
    client.query.mockReset();
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});

    // Setup default faker mocks
    faker.helpers.arrayElement.mockImplementation((arr) => arr[0]); // Always pick the first element
    faker.lorem.words.mockReturnValue("a control name");
    faker.lorem.sentence.mockReturnValue("a control description");
    faker.datatype.boolean.mockReturnValue(true);
  });

  describe("generateControls", () => {
    it("should call eraseControlsTables when erase option is true", async () => {
      client.query.mockResolvedValue({ rows: mockPhases });
      await generateControls(CONFIG, { erase: true });
      expect(client.query).toHaveBeenCalledWith(
        'TRUNCATE TABLE "controls_master_ctm" RESTART IDENTITY CASCADE',
      );
    });

    it("should throw an error if no master phases are found", async () => {
      client.query.mockResolvedValue({ rows: [] }); // No phases
      await expect(generateControls(CONFIG)).rejects.toThrow(
        "Cannot generate controls: No master phases found in the database.",
      );
    });

    it("should generate the correct number of controls with correct data", async () => {
      // Mock the SELECT for phases, then mock the INSERTs
      client.query.mockResolvedValueOnce({ rows: mockPhases });
      client.query.mockResolvedValue({ rows: [] }); // For INSERTs

      await generateControls(CONFIG);

      const insertCalls = client.query.mock.calls.filter((call) =>
        call[0].text?.includes("INSERT INTO controls_master_ctm"),
      );
      expect(insertCalls).toHaveLength(CONFIG.CONTROLS.COUNT);

      // Check the values of the first insert
      const firstInsertValues = insertCalls[0][0].values;
      expect(firstInsertValues).toEqual([
        "phase-1", // phm_id
        1, // ctm_order
        "Control: a control name", // ctm_name
        "a control description", // ctm_description
        "QUALITY", // ctm_type (first element of the hardcoded array)
        true, // ctm_is_critical
        "C0000", // ctm_code
      ]);

      // Check the second insert to be sure
      const secondInsertValues = insertCalls[1][0].values;
      expect(secondInsertValues[6]).toBe("C0001");
    });
  });

  describe("eraseControlsTables", () => {
    it("should truncate the controls_master_ctm table", async () => {
      await eraseControlsTables(client);
      expect(client.query).toHaveBeenCalledWith(
        'TRUNCATE TABLE "controls_master_ctm" RESTART IDENTITY CASCADE',
      );
      expect(client.query).toHaveBeenCalledTimes(1);
    });

    it("should throw an error if truncation fails", async () => {
      const mockError = new Error("DB truncate error");
      client.query.mockRejectedValue(mockError);
      await expect(eraseControlsTables(client)).rejects.toThrow(mockError);
    });
  });
});
