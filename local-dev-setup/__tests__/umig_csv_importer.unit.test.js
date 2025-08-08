const fs = require("fs");
const path = require("path");

// --- Helpers: Extracted from script for testability ---
function loadMappingFile(mappingFilePath) {
  try {
    const mappingJson = fs.readFileSync(mappingFilePath, "utf-8");
    return JSON.parse(mappingJson);
  } catch (err) {
    throw new Error("Failed to read or parse mapping file: " + err.message);
  }
}

function validateRow(row, mapping, table) {
  const missing = [];
  for (const dbField of Object.keys(mapping)) {
    const csvField = mapping[dbField];
    if (
      !row.hasOwnProperty(csvField) ||
      row[csvField] === undefined ||
      row[csvField] === null ||
      String(row[csvField]).trim() === ""
    ) {
      missing.push(csvField);
    }
    // Extra validation: email format for team_members
    if (table === "team_members" && dbField === "email" && row[csvField]) {
      if (!/^\S+@\S+\.\S+$/.test(row[csvField])) {
        missing.push(csvField + " (invalid email)");
      }
    }
    // Integer check for team_id
    if (table === "team_members" && dbField === "team_id" && row[csvField]) {
      if (!/^\d+$/.test(row[csvField])) {
        missing.push(csvField + " (not integer)");
      }
    }
  }
  return missing;
}

describe("umig_csv_importer.js unit logic", () => {
  const fixtureDir = path.resolve(__dirname, "fixtures");
  const mappingFile = path.join(
    fixtureDir,
    "fixture_team_members_mapping.json",
  );
  let mapping;

  beforeAll(() => {
    mapping = loadMappingFile(mappingFile);
  });

  test("mapping file parses and has expected keys", () => {
    expect(mapping).toHaveProperty("first_name");
    expect(mapping).toHaveProperty("last_name");
    expect(mapping).toHaveProperty("email");
    expect(mapping).toHaveProperty("role");
    expect(mapping).toHaveProperty("team_id");
  });

  test("validateRow returns [] for valid row", () => {
    const validRow = {
      FirstName: "John",
      LastName: "Doe",
      Email: "john.doe@example.com",
      Role: "Developer",
      TeamId: "1",
    };
    const result = validateRow(validRow, mapping, "team_members");
    expect(result).toEqual([]);
  });

  test("validateRow detects missing and invalid fields", () => {
    const invalidRow = {
      FirstName: "",
      LastName: "Smith",
      Email: "not-an-email",
      Role: "Developer",
      TeamId: "abc",
    };
    const result = validateRow(invalidRow, mapping, "team_members");
    expect(result).toContain("FirstName");
    expect(result.some((f) => f.includes("Email"))).toBe(true);
    expect(result.some((f) => f.includes("TeamId"))).toBe(true);
  });

  test("validateRow flags missing CSV columns", () => {
    const row = {
      LastName: "Smith",
      Email: "alice.smith@example.com",
      Role: "Developer",
      TeamId: "1",
    };
    const result = validateRow(row, mapping, "team_members");
    expect(result).toContain("FirstName");
  });

  // --- Additional tests using fixtures ---
  test("all fixture rows are valid", () => {
    const csvPath = path.join(fixtureDir, "fixture_team_members.csv");
    const csvContent = fs.readFileSync(csvPath, "utf-8");
    const [header, ...lines] = csvContent.trim().split(/\r?\n/);
    const headers = header.split(",");
    lines.forEach((line, idx) => {
      const fields = line.split(",");
      const row = Object.fromEntries(headers.map((h, i) => [h, fields[i]]));
      const result = validateRow(row, mapping, "team_members");
      expect(result).toEqual([]);
    });
  });

  test("fixture row with missing email is invalid", () => {
    const row = {
      FirstName: "NoEmail",
      LastName: "User",
      Email: "",
      Role: "Developer",
      TeamId: "1",
    };
    const result = validateRow(row, mapping, "team_members");
    expect(result).toContain("Email");
  });

  test("fixture row with non-integer team_id is invalid", () => {
    const row = {
      FirstName: "BadID",
      LastName: "User",
      Email: "bad.id@example.com",
      Role: "Developer",
      TeamId: "abc",
    };
    const result = validateRow(row, mapping, "team_members");
    expect(result.some((f) => f.includes("TeamId"))).toBe(true);
  });
});
