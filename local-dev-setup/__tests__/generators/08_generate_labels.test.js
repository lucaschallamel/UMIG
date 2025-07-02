import { client } from '../../scripts/lib/db.js';
import { generateLabels, eraseLabelsTables } from '../../scripts/generators/08_generate_labels.js';
import { faker } from '../../scripts/lib/utils.js';

// Mock dependencies
jest.mock('../../scripts/lib/db.js', () => ({
  client: {
    query: jest.fn(),
  },
}));

jest.mock('../../scripts/lib/utils.js', () => ({
  faker: {
    helpers: {
      arrayElement: jest.fn(),
      arrayElements: jest.fn(),
    },
    lorem: {
      words: jest.fn(),
      sentence: jest.fn(),
    },
    internet: {
      color: jest.fn(),
    },
    number: {
      int: jest.fn(),
    },
  },
}));

const CONFIG = {
  LABELS: {
    PER_MIGRATION: { MIN: 1, MAX: 1 },
  },
};

describe('Labels Generator (08_generate_labels.js)', () => {
  const mockMigrations = [{ mig_id: 'mig-1' }];
  const mockUsers = [{ usr_id: 'user-1' }];
  const mockSteps = [{ stm_id: 'step-1' }];
  const mockApps = [{ app_id: 'app-1' }];
  const mockControls = [{ ctm_id: 'control-1' }];
  const mockLabelId = 'label-1';

  beforeEach(() => {
    client.query.mockReset();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Default faker mocks
    faker.number.int.mockReturnValue(1); // Generate 1 label per migration
    faker.lorem.words.mockReturnValue('Test Label');
    faker.lorem.sentence.mockReturnValue('A test description.');
    faker.internet.color.mockReturnValue('#123456');
    faker.helpers.arrayElement.mockImplementation((arr) => arr[0]);
    faker.helpers.arrayElements.mockImplementation((arr) => arr);
  });

  describe('generateLabels', () => {
    it('should call eraseLabelsTables when erase option is true', async () => {
      // Mock all SELECT queries to return some data to proceed
      client.query.mockImplementation((sql) => {
        if (sql.includes('migrations_mig')) return Promise.resolve({ rows: mockMigrations });
        if (sql.includes('users_usr')) return Promise.resolve({ rows: mockUsers });
        if (sql.includes('INSERT INTO labels_lbl')) return Promise.resolve({ rows: [{ lbl_id: mockLabelId }] });
        return Promise.resolve({ rows: [] });
      });

      await generateLabels(CONFIG, { erase: true });

      // Check that TRUNCATE was called on the first table
      expect(client.query).toHaveBeenCalledWith('TRUNCATE TABLE "labels_lbl_x_steps_master_stm" RESTART IDENTITY CASCADE');
    });

    it('should not generate labels if no migrations are found', async () => {
      client.query.mockResolvedValue({ rows: [] }); // No migrations
      await generateLabels(CONFIG, {});
      expect(console.error).toHaveBeenCalledWith('Cannot generate labels without migrations and users. Please generate them first.');
      expect(client.query).not.toHaveBeenCalledWith(expect.stringContaining('INSERT INTO'));
    });

    it('should not generate labels if no users are found', async () => {
      client.query.mockImplementation((sql) => {
        if (sql.includes('migrations_mig')) return Promise.resolve({ rows: mockMigrations });
        if (sql.includes('users_usr')) return Promise.resolve({ rows: [] }); // No users
        return Promise.resolve({ rows: [] });
      });
      await generateLabels(CONFIG, {});
      expect(console.error).toHaveBeenCalledWith('Cannot generate labels without migrations and users. Please generate them first.');
      expect(client.query).not.toHaveBeenCalledWith(expect.stringContaining('INSERT INTO'));
    });

    it('should generate labels and associate them correctly', async () => {
      client.query.mockImplementation((sql) => {
        if (sql.includes('migrations_mig')) return Promise.resolve({ rows: mockMigrations });
        if (sql.includes('users_usr')) return Promise.resolve({ rows: mockUsers });
        if (sql.includes('steps_master_stm')) return Promise.resolve({ rows: mockSteps });
        if (sql.includes('applications_app')) return Promise.resolve({ rows: mockApps });
        if (sql.includes('controls_master_ctm')) return Promise.resolve({ rows: mockControls });
        if (sql.includes('INSERT INTO labels_lbl')) return Promise.resolve({ rows: [{ lbl_id: mockLabelId }] });
        return Promise.resolve({ rows: [] }); // For join table inserts
      });

      await generateLabels(CONFIG, {});

      // 1. Check label creation
      expect(client.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO labels_lbl'),
        [mockMigrations[0].mig_id, 'Test Label', 'A test description.', '#123456', mockUsers[0].usr_id]
      );

      // 2. Check step association
      expect(client.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO labels_lbl_x_steps_master_stm'),
        [mockLabelId, mockSteps[0].stm_id, mockUsers[0].usr_id]
      );

      // 3. Check application association
      expect(client.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO labels_lbl_x_applications_app'),
        [mockLabelId, mockApps[0].app_id, mockUsers[0].usr_id.toString()]
      );

      // 4. Check control association
      expect(client.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO labels_lbl_x_controls_master_ctm'),
        [mockLabelId, mockControls[0].ctm_id, mockUsers[0].usr_id]
      );
    });

    it('should not try to associate labels if no steps, apps, or controls exist', async () => {
      client.query.mockImplementation((sql) => {
        if (sql.includes('migrations_mig')) return Promise.resolve({ rows: mockMigrations });
        if (sql.includes('users_usr')) return Promise.resolve({ rows: mockUsers });
        // Return empty for all associable entities
        if (sql.includes('steps_master_stm')) return Promise.resolve({ rows: [] });
        if (sql.includes('applications_app')) return Promise.resolve({ rows: [] });
        if (sql.includes('controls_master_ctm')) return Promise.resolve({ rows: [] });
        if (sql.includes('INSERT INTO labels_lbl')) return Promise.resolve({ rows: [{ lbl_id: mockLabelId }] });
        return Promise.resolve({ rows: [] });
      });

      await generateLabels(CONFIG, {});

      // Check that the main label was created
      expect(client.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO labels_lbl'), expect.any(Array));

      // Check that no associations were attempted
      expect(client.query).not.toHaveBeenCalledWith(expect.stringContaining('INSERT INTO labels_lbl_x_steps_master_stm'), expect.any(Array));
      expect(client.query).not.toHaveBeenCalledWith(expect.stringContaining('INSERT INTO labels_lbl_x_applications_app'), expect.any(Array));
      expect(client.query).not.toHaveBeenCalledWith(expect.stringContaining('INSERT INTO labels_lbl_x_controls_master_ctm'), expect.any(Array));
    });
  });

  describe('eraseLabelsTables', () => {
    it('should truncate tables in the correct order', async () => {
      await eraseLabelsTables(client);
      const calls = client.query.mock.calls.map(c => c[0]);
      expect(calls).toEqual([
        'TRUNCATE TABLE "labels_lbl_x_steps_master_stm" RESTART IDENTITY CASCADE',
        'TRUNCATE TABLE "labels_lbl_x_applications_app" RESTART IDENTITY CASCADE',
        'TRUNCATE TABLE "labels_lbl_x_controls_master_ctm" RESTART IDENTITY CASCADE',
        'TRUNCATE TABLE "labels_lbl" RESTART IDENTITY CASCADE',
      ]);
    });

    it('should throw an error if truncation fails', async () => {
      const mockError = new Error('DB truncate error');
      client.query.mockRejectedValue(mockError);
      await expect(eraseLabelsTables(client)).rejects.toThrow(mockError);
    });
  });
});
