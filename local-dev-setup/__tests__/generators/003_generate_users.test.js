import { client } from "../../scripts/lib/db.js";
import { generateUsers } from "../../scripts/generators/003_generate_users.js";
import { faker } from "../../scripts/lib/utils.js";

// Mock the database client and faker
jest.mock("../../scripts/lib/db.js", () => ({
  client: {
    query: jest.fn(),
  },
}));

jest.mock("../../scripts/lib/utils.js", () => ({
  ...jest.requireActual("../../scripts/lib/utils.js"),
  faker: {
    person: {
      firstName: jest.fn(),
      lastName: jest.fn(),
    },
    string: {
      alphanumeric: jest.fn(),
    },
    internet: {
      domainName: jest.fn(),
    },
    helpers: {
      arrayElements: jest.fn(),
    },
    number: {
      int: jest.fn(),
    },
  },
}));

const CONFIG = {
  USERS: {
    NORMAL: { COUNT: 5 },
    ADMIN: { COUNT: 2 },
    PILOT: { COUNT: 1 },
  },
  TEAMS: {
    EMAIL_DOMAIN: "test.com",
  },
};

describe("Users Generator (03_generate_users.js)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    faker.person.firstName.mockReturnValue("John");
    faker.person.lastName.mockReturnValue("Doe");
    faker.string.alphanumeric.mockReturnValue("a");
    faker.internet.domainName.mockReturnValue("example.com");
  });

  it("should call eraseUsersTable when erase option is true", async () => {
    client.query.mockImplementation((sql) => {
      if (sql.startsWith("TRUNCATE")) {
        return Promise.resolve({ rows: [], rowCount: 1 });
      }
      if (sql.startsWith("SELECT rls_id, rls_code FROM roles_rls")) {
        return Promise.resolve({
          rows: [
            { rls_id: "admin-id", rls_code: "ADMIN" },
            { rls_id: "pilot-id", rls_code: "PILOT" },
            { rls_id: "normal-id", rls_code: "NORMAL" },
          ],
        });
      }
      if (/INSERT INTO users_usr/i.test(sql)) {
        return Promise.resolve({ rows: [{ usr_id: "mock-id" }] });
      }
      if (sql.includes("JOIN roles_rls r ON u.rls_id = r.rls_id")) {
        return Promise.resolve({
          rows: [{ usr_id: "usr-admin-1", rls_code: "ADMIN" }],
        });
      }
      if (sql.startsWith("SELECT tms_id, tms_name FROM teams_tms")) {
        return Promise.resolve({
          rows: [{ tms_id: "it-cutover-id", tms_name: "IT_CUTOVER" }],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    await generateUsers(CONFIG, { erase: true });

    expect(client.query).toHaveBeenCalledWith(
      'TRUNCATE TABLE "users_usr" RESTART IDENTITY CASCADE',
    );
  });

  it("should generate users and link them correctly", async () => {
    // Arrange
    const mockRoles = [
      { rls_id: "admin-id", rls_code: "ADMIN" },
      { rls_id: "pilot-id", rls_code: "PILOT" },
      { rls_id: "normal-id", rls_code: "NORMAL" },
    ];
    const mockTeams = [
      { tms_id: "it-cutover-id", tms_name: "IT_CUTOVER" },
      { tms_id: "team-a-id", tms_name: "Team A" },
      { tms_id: "team-b-id", tms_name: "Team B" },
    ];

    let userInserts = [];
    let joinInserts = [];
    let generatedUsersForLink = [];

    client.query.mockImplementation((sql, params) => {
      if (sql.startsWith("SELECT rls_id, rls_code FROM roles_rls")) {
        return Promise.resolve({ rows: mockRoles });
      }

      if (/INSERT INTO users_usr/i.test(sql)) {
        const roleId = params[5];
        const role = mockRoles.find((r) => r.rls_id === roleId);
        const newUser = {
          usr_id: `new-user-${userInserts.length}`,
          rls_code: role ? role.rls_code : "UNKNOWN",
        };
        userInserts.push(params);
        generatedUsersForLink.push(newUser);
        return Promise.resolve({ rows: [{ usr_id: newUser.usr_id }] });
      }

      if (sql.includes("JOIN roles_rls r ON u.rls_id = r.rls_id")) {
        return Promise.resolve({ rows: generatedUsersForLink });
      }

      if (sql.startsWith("SELECT tms_id, tms_name FROM teams_tms")) {
        return Promise.resolve({ rows: mockTeams });
      }

      if (sql.startsWith("INSERT INTO teams_tms_x_users_usr")) {
        joinInserts.push(params);
        return Promise.resolve({ rows: [] });
      }

      return Promise.resolve({ rows: [] });
    });

    // Act
    await generateUsers(CONFIG, {});

    // Assert
    const totalUsers =
      CONFIG.USERS.NORMAL.COUNT +
      CONFIG.USERS.ADMIN.COUNT +
      CONFIG.USERS.PILOT.COUNT;
    expect(userInserts.length).toBe(totalUsers);
    expect(joinInserts.length).toBe(totalUsers);

    const adminPilotJoins = joinInserts.filter((j) => j[1] === "it-cutover-id");
    expect(adminPilotJoins.length).toBe(
      CONFIG.USERS.ADMIN.COUNT + CONFIG.USERS.PILOT.COUNT,
    );

    const normalJoins = joinInserts.filter((j) => j[1] !== "it-cutover-id");
    expect(normalJoins.length).toBe(CONFIG.USERS.NORMAL.COUNT);
  });

  it("should throw an error if required roles are missing", async () => {
    // Arrange
    client.query.mockImplementation((sql) => {
      if (sql.startsWith("SELECT rls_id, rls_code FROM roles_rls")) {
        // Return incomplete roles
        return Promise.resolve({
          rows: [{ rls_id: "normal-id", rls_code: "NORMAL" }],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    // Act & Assert
    await expect(generateUsers(CONFIG, {})).rejects.toThrow(
      "Required roles (ADMIN, NORMAL, PILOT) not found in database.",
    );
  });

  it("should throw an error if IT_CUTOVER team is missing for admins/pilots", async () => {
    // Arrange
    client.query.mockImplementation((sql) => {
      if (sql.startsWith("SELECT rls_id, rls_code FROM roles_rls")) {
        return Promise.resolve({
          rows: [
            { rls_id: "admin-id", rls_code: "ADMIN" },
            { rls_id: "pilot-id", rls_code: "PILOT" },
            { rls_id: "normal-id", rls_code: "NORMAL" },
          ],
        });
      }
      if (sql.includes("JOIN roles_rls r ON u.rls_id = r.rls_id")) {
        return Promise.resolve({
          rows: [{ usr_id: "usr-admin-1", rls_code: "ADMIN" }],
        });
      }
      if (sql.startsWith("SELECT tms_id, tms_name FROM teams_tms")) {
        // But no IT_CUTOVER team
        return Promise.resolve({
          rows: [{ tms_id: "team-a-id", tms_name: "Team A" }],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    // Act & Assert
    await expect(generateUsers(CONFIG, {})).rejects.toThrow(
      "IT_CUTOVER team not found for admin/pilot user assignment.",
    );
  });

  it("should ensure every non-IT_CUTOVER team has at least one member", async () => {
    // Arrange
    const normalTeams = [
      { tms_id: "team-a-id", tms_name: "Team A" },
      { tms_id: "team-b-id", tms_name: "Team B" },
    ];
    const mockTeams = [
      { tms_id: "it-cutover-id", tms_name: "IT_CUTOVER" },
      ...normalTeams,
    ];
    const mockUsers = [
      { usr_id: "usr-normal-1", rls_code: "NORMAL" },
      { usr_id: "usr-normal-2", rls_code: "NORMAL" },
      { usr_id: "usr-normal-3", rls_code: "NORMAL" },
      { usr_id: "usr-normal-4", rls_code: "NORMAL" },
      { usr_id: "usr-normal-5", rls_code: "NORMAL" },
    ];
    const mockRoles = [{ rls_id: "normal-id", rls_code: "NORMAL" }];
    let joinInserts = [];

    client.query.mockImplementation((sql, params) => {
      if (sql.startsWith("SELECT rls_id, rls_code FROM roles_rls")) {
        return Promise.resolve({ rows: mockRoles });
      }
      if (sql.includes("JOIN roles_rls r ON u.rls_id = r.rls_id")) {
        return Promise.resolve({ rows: mockUsers });
      }
      if (sql.startsWith("SELECT tms_id, tms_name FROM teams_tms")) {
        return Promise.resolve({ rows: mockTeams });
      }
      if (sql.startsWith("INSERT INTO teams_tms_x_users_usr")) {
        joinInserts.push(params);
      }
      return Promise.resolve({ rows: [] });
    });

    // Act
    await generateUsers({ USERS: { NORMAL: { COUNT: 5 } } }, {});

    // Assert
    const assignedTeamIds = new Set(joinInserts.map((i) => i[1]));
    for (const team of normalTeams) {
      expect(assignedTeamIds.has(team.tms_id)).toBe(true);
    }
  });

  it("should log a warning if no normal teams are found", async () => {
    // Arrange
    const consoleWarnSpy = jest
      .spyOn(console, "warn")
      .mockImplementation(() => {});
    client.query.mockImplementation((sql) => {
      if (sql.startsWith("SELECT rls_id, rls_code FROM roles_rls")) {
        return Promise.resolve({
          rows: [{ rls_id: "normal-id", rls_code: "NORMAL" }],
        });
      }
      if (sql.includes("JOIN roles_rls r ON u.rls_id = r.rls_id")) {
        return Promise.resolve({
          rows: [{ usr_id: "usr-normal-1", rls_code: "NORMAL" }],
        });
      }
      if (sql.startsWith("SELECT tms_id, tms_name FROM teams_tms")) {
        return Promise.resolve({
          rows: [{ tms_id: "it-cutover-id", tms_name: "IT_CUTOVER" }],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    // Act
    await generateUsers({ USERS: { NORMAL: { COUNT: 1 } } }, {});

    // Assert
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Warning: No non-IT_CUTOVER teams found for user assignment.",
    );
    consoleWarnSpy.mockRestore();
  });

  it("should handle errors during table erasure", async () => {
    // Arrange
    const error = new Error("DB error");
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    client.query.mockImplementation((sql) => {
      if (sql.startsWith("TRUNCATE")) {
        return Promise.reject(error);
      }
      return Promise.resolve({ rows: [] });
    });

    // Act & Assert
    await expect(generateUsers(CONFIG, { erase: true })).rejects.toThrow(error);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      `Error erasing users table: ${error}`,
    );
    consoleErrorSpy.mockRestore();
  });

  test("should re-throw non-unique-constraint errors during user insertion", async () => {
    const genericDbError = new Error("Generic DB Error");
    // Mock roles and teams fetches to proceed to user insertion
    client.query.mockImplementation((query) => {
      if (query.includes("FROM roles_rls")) {
        return Promise.resolve({
          rows: [
            { rls_id: 1, rls_code: "NORMAL" },
            { rls_id: 2, rls_code: "ADMIN" },
            { rls_id: 3, rls_code: "PILOT" },
          ],
        });
      }
      if (query.includes("INSERT INTO users_usr")) {
        return Promise.reject(genericDbError); // Simulate the error
      }
      // Mock queries for linkUsersToTeams to prevent downstream errors
      if (query.includes("FROM users_usr")) {
        return Promise.resolve({ rows: [] });
      }
      if (query.includes("FROM teams_tms")) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    await expect(generateUsers(CONFIG, { erase: false })).rejects.toThrow(
      genericDbError,
    );
  });
});
