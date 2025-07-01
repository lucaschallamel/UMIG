const { client } = require('../../lib/db');
const { generateLabels } = require('../../generators/08_generate_labels');
const { v4: uuidv4 } = require('uuid');
const utils = require('../../lib/utils');

// Mock dependencies
jest.mock('../../lib/db', () => ({ client: { query: jest.fn() } }));
jest.mock('../../lib/utils', () => ({
  ...jest.requireActual('../../lib/utils'), // Keep original non-faker utils
  faker: { // Deep mock faker since it's used extensively
    ...jest.requireActual('@faker-js/faker').faker,
    number: {
      int: jest.fn(),
    },
    word: {
      noun: jest.fn(),
    },
    string: {
      alpha: jest.fn(),
    },
    lorem: {
      sentence: jest.fn(),
    },
    internet: {
      color: jest.fn(),
    },
    helpers: {
      arrayElement: jest.fn(),
    },
  },
}));

const CONFIG = {}; // Not used by the generator logic itself

describe('Label Generator (08_generate_labels.js)', () => {
  beforeEach(() => {
    client.query.mockReset();
    // Reset all mocked functions in our deep mock of faker
    Object.values(utils.faker.number).forEach(fn => fn.mockReset());
    Object.values(utils.faker.word).forEach(fn => fn.mockReset());
    Object.values(utils.faker.string).forEach(fn => fn.mockReset());
    Object.values(utils.faker.lorem).forEach(fn => fn.mockReset());
    Object.values(utils.faker.internet).forEach(fn => fn.mockReset());
    Object.values(utils.faker.helpers).forEach(fn => fn.mockReset());

    // Silence console
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Default mock: empty results
    client.query.mockResolvedValue({ rows: [] });
  });

  it('should throw an error if clientOverride is not provided', async () => {
    await expect(generateLabels(CONFIG, {})).rejects.toThrow('A database client must be provided in options.clientOverride');
  });

  it('should throw an error if no migrations are found', async () => {
    // Default mock returns empty rows, so this will fail as expected
    await expect(generateLabels(CONFIG, { clientOverride: client })).rejects.toThrow('No migrations found.');
    expect(client.query).toHaveBeenCalledWith('SELECT mig_id FROM migrations_mig');
  });

  it('should successfully generate labels and associations on a happy path', async () => {
    const fakeMigId = uuidv4();
    const fakeStepId = uuidv4();
    const fakeLabelId = uuidv4();

    // --- Mock faker returns for deterministic behavior ---
    utils.faker.number.int.mockReturnValueOnce(2).mockReturnValue(1); // Generate 2 labels, then 50% chance is true

    // FIX: Return unique values to avoid infinite loop in the generator
    let nounCounter = 0;
    utils.faker.word.noun.mockImplementation(() => `TestLabel${nounCounter++}`);
    utils.faker.string.alpha.mockReturnValue('ABC'); // This can be static as long as the noun is unique

    utils.faker.lorem.sentence.mockReturnValue('A test label.');
    utils.faker.internet.color.mockReturnValue('#123456');
    utils.faker.helpers.arrayElement.mockImplementation(arr => arr[0]);

    // --- Mock DB queries ---
    client.query.mockImplementation(query => {
      if (query.startsWith('SELECT mig_id')) {
        return Promise.resolve({ rows: [{ mig_id: fakeMigId }] });
      }
      if (query.startsWith('SELECT stm.stm_id')) {
        return Promise.resolve({ rows: [{ stm_id: fakeStepId }] });
      }
      if (query.startsWith('INSERT INTO labels_lbl')) {
        return Promise.resolve({ rows: [{ lbl_id: fakeLabelId }] });
      }
      if (query.startsWith('INSERT INTO labels_lbl_x_steps_master_stm')) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    await expect(generateLabels(CONFIG, { clientOverride: client })).resolves.not.toThrow();

    // --- Verify results ---
    // Check that it tried to create 2 labels
    expect(client.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO labels_lbl'), expect.any(Array));
    expect(utils.faker.word.noun).toHaveBeenCalledTimes(2);

    // Check that it tried to create an association
    expect(client.query).toHaveBeenCalledWith(
      `INSERT INTO labels_lbl_x_steps_master_stm (lbl_id, stm_id, created_by) VALUES ($1, $2, $3)`,
      [fakeLabelId, fakeStepId, 1]
    );
  });

  it('should assign labels to applications and prevent duplicates', async () => {
    const fakeMigId = uuidv4();
    const fakeLabelId = 42;
    const fakeAppIds = [123, 456];
    utils.faker.number.int.mockReturnValueOnce(2).mockReturnValue(1); // 2 labels, then 1 label per app
    let nounCounter = 0;
    utils.faker.word.noun.mockImplementation(() => `Label${nounCounter++}`);
    utils.faker.string.alpha.mockReturnValue('XYZ');
    utils.faker.lorem.sentence.mockReturnValue('desc');
    utils.faker.internet.color.mockReturnValue('#abcdef');
    utils.faker.helpers.arrayElements = jest.fn((arr, n) => arr.slice(0, n));

    client.query.mockImplementation(query => {
      if (query.startsWith('SELECT mig_id')) return Promise.resolve({ rows: [{ mig_id: fakeMigId }] });
      if (query.startsWith('SELECT stm.stm_id')) return Promise.resolve({ rows: [] });
      if (query.startsWith('SELECT app_id')) return Promise.resolve({ rows: fakeAppIds.map(app_id => ({ app_id })) });
      if (query.startsWith('INSERT INTO labels_lbl')) return Promise.resolve({ rows: [{ lbl_id: fakeLabelId }] });
      if (query.startsWith('INSERT INTO labels_lbl_x_applications_app')) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });

    await expect(generateLabels(CONFIG, { clientOverride: client })).resolves.not.toThrow();

    // Should attempt to insert for each app-label pair, but no duplicates
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO labels_lbl_x_applications_app'),
      [fakeLabelId, fakeAppIds[0], 1]
    );
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO labels_lbl_x_applications_app'),
      [fakeLabelId, fakeAppIds[1], 1]
    );
  });

  it('should not insert application-label associations if there are no applications', async () => {
    const fakeMigId = uuidv4();
    const fakeLabelId = 42;
    utils.faker.number.int.mockReturnValueOnce(1); // 1 label
    utils.faker.word.noun.mockReturnValue('Label');
    utils.faker.string.alpha.mockReturnValue('XYZ');
    utils.faker.lorem.sentence.mockReturnValue('desc');
    utils.faker.internet.color.mockReturnValue('#abcdef');
    utils.faker.helpers.arrayElements = jest.fn((arr, n) => arr.slice(0, n));

    client.query.mockImplementation(query => {
      if (query.startsWith('SELECT mig_id')) return Promise.resolve({ rows: [{ mig_id: fakeMigId }] });
      if (query.startsWith('SELECT stm.stm_id')) return Promise.resolve({ rows: [] });
      if (query.startsWith('SELECT app_id')) return Promise.resolve({ rows: [] }); // No apps
      if (query.startsWith('INSERT INTO labels_lbl')) return Promise.resolve({ rows: [{ lbl_id: fakeLabelId }] });
      return Promise.resolve({ rows: [] });
    });

    await expect(generateLabels(CONFIG, { clientOverride: client })).resolves.not.toThrow();

    // Should not call insert for labels_lbl_x_applications_app
    expect(client.query).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO labels_lbl_x_applications_app'),
      expect.any(Array)
    );
  });
});
