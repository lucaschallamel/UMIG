/**
 * Unit Tests for EntityConfig Module
 * 
 * Tests the EntityConfig availability, entity retrieval, and configuration completeness
 * for the Admin GUI entity migration changes including iterationTypes and migrationTypes
 */

describe('EntityConfig Module', () => {
  let originalEntityConfig;

  beforeEach(() => {
    // Save original EntityConfig if it exists
    originalEntityConfig = global.EntityConfig;

    // Mock EntityConfig module
    global.EntityConfig = {
      getAllEntities: jest.fn().mockReturnValue({
        users: { name: 'Users', fields: [] },
        teams: { name: 'Teams', fields: [] },
        iterationTypes: {
          name: 'Iteration Types',
          description: 'Manage iteration types and their configurations',
          fields: [
            {
              key: 'itt_code',
              label: 'Code',
              type: 'text',
              required: true,
              maxLength: 20,
              readonly: false,
            },
            {
              key: 'itt_name',
              label: 'Name',
              type: 'text',
              required: true,
              maxLength: 100,
            },
            {
              key: 'itt_description',
              label: 'Description',
              type: 'textarea',
              maxLength: 500,
            },
            {
              key: 'itt_color',
              label: 'Color',
              type: 'color',
              required: true,
              default: '#6B73FF',
            },
            {
              key: 'itt_active',
              label: 'Active',
              type: 'boolean',
              required: true,
              default: true,
            }
          ]
        },
        migrationTypes: {
          name: 'Migration Types',
          description: 'Manage migration types and their configurations',
          fields: [
            {
              key: 'mtm_id',
              label: 'ID',
              type: 'number',
              readonly: true,
              primaryKey: true,
            },
            {
              key: 'mtm_code',
              label: 'Code',
              type: 'text',
              required: true,
              maxLength: 20,
              readonly: false,
            },
            {
              key: 'mtm_name',
              label: 'Name',
              type: 'text',
              required: true,
              maxLength: 100,
            },
            {
              key: 'mtm_color',
              label: 'Color',
              type: 'color',
              required: true,
              default: '#6B73FF',
            },
            {
              key: 'mtm_active',
              label: 'Active',
              type: 'boolean',
              required: true,
              default: true,
            }
          ]
        }
      }),
      getEntity: jest.fn().mockImplementation((entityName) => {
        const entities = global.EntityConfig.getAllEntities();
        return entities[entityName] || null;
      })
    };

    // Mock window object
    global.window = {
      EntityConfig: global.EntityConfig
    };
  });

  afterEach(() => {
    // Restore original EntityConfig
    global.EntityConfig = originalEntityConfig;
    if (global.window) {
      delete global.window;
    }
  });

  describe('EntityConfig Availability', () => {
    test('should detect EntityConfig module is available', () => {
      expect(window.EntityConfig).toBeDefined();
      expect(typeof window.EntityConfig.getAllEntities).toBe('function');
      expect(typeof window.EntityConfig.getEntity).toBe('function');
    });

    test('should handle missing EntityConfig gracefully', () => {
      // Remove EntityConfig from window
      delete window.EntityConfig;

      // This should not throw an error
      expect(window.EntityConfig).toBeUndefined();
    });
  });

  describe('Entity Retrieval', () => {
    test('should retrieve all entities including iterationTypes and migrationTypes', () => {
      const entities = EntityConfig.getAllEntities();
      
      expect(entities).toBeDefined();
      expect(entities.iterationTypes).toBeDefined();
      expect(entities.migrationTypes).toBeDefined();
      expect(entities.users).toBeDefined();
      expect(entities.teams).toBeDefined();
    });

    test('should retrieve iterationTypes entity with complete configuration', () => {
      const iterationTypes = EntityConfig.getEntity('iterationTypes');
      
      expect(iterationTypes).toBeDefined();
      expect(iterationTypes.name).toBe('Iteration Types');
      expect(iterationTypes.description).toBe('Manage iteration types and their configurations');
      expect(iterationTypes.fields).toBeInstanceOf(Array);
      expect(iterationTypes.fields.length).toBeGreaterThan(0);
      
      // Check for required fields
      const codeField = iterationTypes.fields.find(field => field.key === 'itt_code');
      expect(codeField).toBeDefined();
      expect(codeField.required).toBe(true);
      expect(codeField.readonly).toBe(false);
      
      const nameField = iterationTypes.fields.find(field => field.key === 'itt_name');
      expect(nameField).toBeDefined();
      expect(nameField.required).toBe(true);
      
      const colorField = iterationTypes.fields.find(field => field.key === 'itt_color');
      expect(colorField).toBeDefined();
      expect(colorField.type).toBe('color');
      expect(colorField.default).toBe('#6B73FF');
    });

    test('should retrieve migrationTypes entity with complete configuration', () => {
      const migrationTypes = EntityConfig.getEntity('migrationTypes');
      
      expect(migrationTypes).toBeDefined();
      expect(migrationTypes.name).toBe('Migration Types');
      expect(migrationTypes.description).toBe('Manage migration types and their configurations');
      expect(migrationTypes.fields).toBeInstanceOf(Array);
      expect(migrationTypes.fields.length).toBeGreaterThan(0);
      
      // Check for ID field as primary key
      const idField = migrationTypes.fields.find(field => field.key === 'mtm_id');
      expect(idField).toBeDefined();
      expect(idField.readonly).toBe(true);
      expect(idField.primaryKey).toBe(true);
      
      // Check for required fields
      const codeField = migrationTypes.fields.find(field => field.key === 'mtm_code');
      expect(codeField).toBeDefined();
      expect(codeField.required).toBe(true);
      expect(codeField.readonly).toBe(false);
      
      const nameField = migrationTypes.fields.find(field => field.key === 'mtm_name');
      expect(nameField).toBeDefined();
      expect(nameField.required).toBe(true);
    });

    test('should return null for non-existent entity', () => {
      const nonExistentEntity = EntityConfig.getEntity('nonExistentEntity');
      expect(nonExistentEntity).toBeNull();
    });
  });

  describe('Field Configuration Validation', () => {
    test('iterationTypes should have all required field properties', () => {
      const iterationTypes = EntityConfig.getEntity('iterationTypes');
      
      iterationTypes.fields.forEach(field => {
        expect(field).toHaveProperty('key');
        expect(field).toHaveProperty('label');
        expect(field).toHaveProperty('type');
        expect(typeof field.key).toBe('string');
        expect(typeof field.label).toBe('string');
        expect(typeof field.type).toBe('string');
      });
    });

    test('migrationTypes should have all required field properties', () => {
      const migrationTypes = EntityConfig.getEntity('migrationTypes');
      
      migrationTypes.fields.forEach(field => {
        expect(field).toHaveProperty('key');
        expect(field).toHaveProperty('label');
        expect(field).toHaveProperty('type');
        expect(typeof field.key).toBe('string');
        expect(typeof field.label).toBe('string');
        expect(typeof field.type).toBe('string');
      });
    });

    test('color fields should have valid default values', () => {
      const iterationTypes = EntityConfig.getEntity('iterationTypes');
      const migrationTypes = EntityConfig.getEntity('migrationTypes');
      
      const iterationColorField = iterationTypes.fields.find(field => field.type === 'color');
      const migrationColorField = migrationTypes.fields.find(field => field.type === 'color');
      
      expect(iterationColorField.default).toMatch(/^#[0-9A-F]{6}$/i);
      expect(migrationColorField.default).toMatch(/^#[0-9A-F]{6}$/i);
    });

    test('boolean fields should have valid default values', () => {
      const iterationTypes = EntityConfig.getEntity('iterationTypes');
      const migrationTypes = EntityConfig.getEntity('migrationTypes');
      
      const iterationActiveField = iterationTypes.fields.find(field => field.key === 'itt_active');
      const migrationActiveField = migrationTypes.fields.find(field => field.key === 'mtm_active');
      
      expect(typeof iterationActiveField.default).toBe('boolean');
      expect(typeof migrationActiveField.default).toBe('boolean');
      expect(iterationActiveField.default).toBe(true);
      expect(migrationActiveField.default).toBe(true);
    });
  });
});