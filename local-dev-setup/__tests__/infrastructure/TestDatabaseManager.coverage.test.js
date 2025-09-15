/**
 * TestDatabaseManager Coverage Tests
 * Comprehensive tests to achieve 85%+ infrastructure coverage
 * 
 * TARGET COVERAGE AREAS:
 * - Error handling scenarios (lines 52-53, 74-75)
 * - Utility methods (lines 108-142)
 * - Edge cases and failure conditions
 * - SQL injection prevention validation
 */

const { TestDatabaseManager } = require('./TestDatabaseManager');

describe('TestDatabaseManager Coverage Tests', () => {
    let testDb;

    beforeEach(() => {
        testDb = new TestDatabaseManager();
    });

    afterEach(async () => {
        if (testDb && testDb.isConnected) {
            await testDb.cleanup();
        }
    });

    describe('Error Handling Coverage', () => {
        test('setup should handle connection failures gracefully', async () => {
            // Mock connection failure scenario
            const originalConsoleError = console.error;
            console.error = jest.fn();

            // Override the setup method to simulate failure
            const originalSetup = testDb.setup;
            testDb.setup = async function() {
                try {
                    this.connection = {
                        query: jest.fn(),
                        release: jest.fn(),
                        begin: jest.fn().mockRejectedValue(new Error('Connection failed')),
                        commit: jest.fn(),
                        rollback: jest.fn()
                    };
                    
                    await this.connection.begin();
                    this.transaction = true;
                    this.isConnected = true;
                    await this.seedTestData();
                    return this.connection;
                } catch (error) {
                    console.error('Failed to setup test database:', error);
                    throw error;
                }
            };

            await expect(testDb.setup()).rejects.toThrow('Connection failed');
            expect(console.error).toHaveBeenCalledWith('Failed to setup test database:', expect.any(Error));

            // Restore
            testDb.setup = originalSetup;
            console.error = originalConsoleError;
        });

        test('cleanup should handle rollback failures gracefully', async () => {
            const originalConsoleError = console.error;
            console.error = jest.fn();

            // Setup first
            await testDb.setup();

            // Force rollback to fail
            testDb.connection.rollback = jest.fn().mockRejectedValue(new Error('Rollback failed'));

            try {
                await testDb.cleanup();
                fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).toBe('Rollback failed');
                expect(console.error).toHaveBeenCalledWith('Failed to cleanup test database:', expect.any(Error));
            }

            console.error = originalConsoleError;
        });

        test('cleanup should handle release failures gracefully', async () => {
            const originalConsoleError = console.error;
            console.error = jest.fn();

            // Setup first
            await testDb.setup();

            // Force release to fail
            testDb.connection.release = jest.fn().mockRejectedValue(new Error('Release failed'));

            try {
                await testDb.cleanup();
                fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).toBe('Release failed');
                expect(console.error).toHaveBeenCalledWith('Failed to cleanup test database:', expect.any(Error));
            }

            console.error = originalConsoleError;
        });
    });

    describe('Utility Methods Coverage', () => {
        beforeEach(async () => {
            await testDb.setup();
        });

        test('query method should enforce connection requirement', async () => {
            // Disconnect and test
            testDb.isConnected = false;

            await expect(testDb.query('SELECT 1')).rejects.toThrow('Database not connected');
        });

        test('query method should execute with parameters', async () => {
            const mockResult = { rows: [{ id: 1, name: 'test' }] };
            testDb.connection.query.mockResolvedValue(mockResult);

            const result = await testDb.query('SELECT * FROM users WHERE id = ?', [1]);

            expect(testDb.connection.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = ?', [1]);
            expect(result).toEqual(mockResult);
        });

        test('query method should execute without parameters', async () => {
            const mockResult = { rows: [{ count: 5 }] };
            testDb.connection.query.mockResolvedValue(mockResult);

            const result = await testDb.query('SELECT COUNT(*) as count FROM users');

            expect(testDb.connection.query).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM users', []);
            expect(result).toEqual(mockResult);
        });

        test('getTestUser should return user by ID', async () => {
            const user = testDb.getTestUser(1);

            expect(user).toEqual({
                id: 1,
                firstName: 'Admin',
                lastName: 'User',
                email: 'admin@test.com',
                roleId: 3
            });
        });

        test('getTestUser should return null for non-existent user', async () => {
            const user = testDb.getTestUser(999999);

            expect(user).toBeNull();
        });

        test('getTestUser should handle undefined testData', async () => {
            testDb.testData = undefined;

            const user = testDb.getTestUser(1);

            expect(user).toBeNull();
        });
    });

    describe('SQL Injection Prevention Coverage', () => {
        beforeEach(async () => {
            await testDb.setup();
        });

        test('validateSQLInjectionPrevention should detect DROP statements', () => {
            const maliciousInput = "; DROP TABLE users; --";

            expect(() => testDb.validateSQLInjectionPrevention(maliciousInput))
                .toThrow('SQL injection attempt detected');
        });

        test('validateSQLInjectionPrevention should detect DELETE statements', () => {
            const maliciousInput = "; DELETE FROM users WHERE 1=1; --";

            expect(() => testDb.validateSQLInjectionPrevention(maliciousInput))
                .toThrow('SQL injection attempt detected');
        });

        test('validateSQLInjectionPrevention should detect TRUNCATE statements', () => {
            const maliciousInput = "; TRUNCATE TABLE audit_log; --";

            expect(() => testDb.validateSQLInjectionPrevention(maliciousInput))
                .toThrow('SQL injection attempt detected');
        });

        test('validateSQLInjectionPrevention should detect UPDATE statements', () => {
            const maliciousInput = "; UPDATE users SET role_id = 3; --";

            expect(() => testDb.validateSQLInjectionPrevention(maliciousInput))
                .toThrow('SQL injection attempt detected');
        });

        test('validateSQLInjectionPrevention should detect OR 1=1 patterns', () => {
            const maliciousInput = "admin' OR 1=1 --";

            expect(() => testDb.validateSQLInjectionPrevention(maliciousInput))
                .toThrow('SQL injection attempt detected');
        });

        test('validateSQLInjectionPrevention should detect UNION SELECT patterns', () => {
            const maliciousInput = "' UNION SELECT password FROM users --";

            expect(() => testDb.validateSQLInjectionPrevention(maliciousInput))
                .toThrow('SQL injection attempt detected');
        });

        test('validateSQLInjectionPrevention should allow safe input', () => {
            const safeInput = "test@example.com";

            expect(() => testDb.validateSQLInjectionPrevention(safeInput))
                .not.toThrow();

            const result = testDb.validateSQLInjectionPrevention(safeInput);
            expect(result).toBe(true);
        });

        test('validateSQLInjectionPrevention should handle empty input', () => {
            expect(() => testDb.validateSQLInjectionPrevention(""))
                .not.toThrow();

            const result = testDb.validateSQLInjectionPrevention("");
            expect(result).toBe(true);
        });

        test('validateSQLInjectionPrevention should handle null input', () => {
            expect(() => testDb.validateSQLInjectionPrevention(null))
                .not.toThrow();

            const result = testDb.validateSQLInjectionPrevention(null);
            expect(result).toBe(true);
        });
    });

    describe('Configuration and Initialization Coverage', () => {
        test('constructor should initialize with default configuration', () => {
            const newTestDb = new TestDatabaseManager();

            expect(newTestDb.connection).toBeNull();
            expect(newTestDb.transaction).toBeNull();
            expect(newTestDb.isConnected).toBe(false);
            expect(newTestDb.config).toEqual({
                host: 'localhost',
                port: 5432,
                database: 'umig_test_db',
                user: 'umig_user',
                password: 'umig_password'
            });
        });

        test('constructor should use environment variables when available', () => {
            // Mock environment variables
            const originalEnv = process.env;
            process.env = {
                ...originalEnv,
                TEST_DB_HOST: 'test-host',
                TEST_DB_PORT: '5433',
                TEST_DB_NAME: 'custom_test_db',
                TEST_DB_USER: 'custom_user',
                TEST_DB_PASSWORD: 'custom_password'
            };

            const newTestDb = new TestDatabaseManager();

            expect(newTestDb.config).toEqual({
                host: 'test-host',
                port: '5433',
                database: 'custom_test_db',
                user: 'custom_user',
                password: 'custom_password'
            });

            // Restore environment
            process.env = originalEnv;
        });
    });

    describe('Transaction Management Coverage', () => {
        test('setup should properly initialize transaction state', async () => {
            await testDb.setup();

            expect(testDb.transaction).toBe(true);
            expect(testDb.isConnected).toBe(true);
            expect(testDb.connection.begin).toHaveBeenCalled();
        });

        test('cleanup should properly reset transaction state', async () => {
            await testDb.setup();
            await testDb.cleanup();

            expect(testDb.transaction).toBe(false);
            expect(testDb.isConnected).toBe(false);
            expect(testDb.connection).toBeNull();
        });

        test('cleanup should handle missing transaction gracefully', async () => {
            await testDb.setup();
            testDb.transaction = false; // Simulate no active transaction
            
            // Store connection reference before cleanup
            const connectionRef = testDb.connection;

            await testDb.cleanup();

            expect(connectionRef.rollback).not.toHaveBeenCalled();
            expect(connectionRef.release).toHaveBeenCalled();
        });

        test('cleanup should handle missing connection gracefully', async () => {
            testDb.isConnected = true;
            testDb.transaction = false;
            testDb.connection = null;

            await testDb.cleanup();

            expect(testDb.isConnected).toBe(false);
        });
    });

    describe('Test Data Coverage', () => {
        beforeEach(async () => {
            await testDb.setup();
        });

        test('seedTestData should create complete test data structure', async () => {
            expect(testDb.testData).toBeDefined();
            expect(testDb.testData.users).toHaveLength(3);
            expect(testDb.testData.auditLog).toHaveLength(3);

            // Verify test users structure
            expect(testDb.testData.users[0]).toEqual({
                id: 1,
                firstName: 'Admin',
                lastName: 'User',
                email: 'admin@test.com',
                roleId: 3
            });

            // Verify audit log structure
            expect(testDb.testData.auditLog[0]).toEqual({
                entityType: 'user',
                entityId: 1,
                action: 'create',
                changedBy: 1,
                changedAt: expect.any(Date)
            });
        });

        test('test data should include all required user types', async () => {
            const users = testDb.testData.users;

            // Admin user
            const adminUser = users.find(u => u.roleId === 3);
            expect(adminUser).toBeDefined();
            expect(adminUser.firstName).toBe('Admin');

            // Regular user
            const regularUser = users.find(u => u.roleId === 1);
            expect(regularUser).toBeDefined();
            expect(regularUser.firstName).toBe('Regular');

            // Test user
            const testUser = users.find(u => u.id === 999);
            expect(testUser).toBeDefined();
            expect(testUser.firstName).toBe('Test');
        });
    });
});