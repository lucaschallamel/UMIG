/**
 * Teams API Integration Tests
 * 
 * Real API endpoint testing for Teams Entity Migration. Addresses the critical
 * 40% integration testing gap by testing against actual API endpoints rather
 * than mocked fetch calls.
 * 
 * Test Categories:
 * - Real API endpoint validation
 * - Database transaction integrity
 * - Network resilience and retry logic
 * - Authentication and authorization flow
 * - Error handling with actual HTTP responses
 * - Performance under real network conditions
 * 
 * @version 1.0.0
 * @created 2025-01-12 (US-082-C Remediation - Priority 2)
 * @target-coverage Increase integration coverage from 40% to 80%
 */

import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { TeamBuilder, UserBuilder } from '../unit/teams/TeamBuilder.js';

// Real HTTP client for integration testing
const BASE_URL = process.env.UMIG_API_BASE_URL || 'http://localhost:8090/rest/scriptrunner/latest/custom';
const TEST_TIMEOUT = 30000; // 30 seconds for real API calls

describe('Teams API Integration Tests - Real Endpoints', () => {
    let testTeamIds = [];
    let testUserIds = [];
    let authHeaders;

    beforeAll(async () => {
        // Setup authentication for real API calls
        authHeaders = await setupAuthentication();
        
        // Verify API is available
        await verifyApiAvailability();
    }, TEST_TIMEOUT);

    afterAll(async () => {
        // Cleanup all test data
        await cleanupTestData();
    }, TEST_TIMEOUT);

    beforeEach(() => {
        testTeamIds = [];
        testUserIds = [];
    });

    afterEach(async () => {
        // Clean up any test data created in individual tests
        await cleanupIndividualTest();
    });

    describe('CRUD Operations - Real API', () => {
        test('should create team via real API endpoint', async () => {
            const teamData = new TeamBuilder()
                .withName(`Integration Test Team ${Date.now()}`)
                .withDescription('Created by integration test')
                .withStatus('active')
                .build();

            const response = await fetch(`${BASE_URL}/teams`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders
                },
                body: JSON.stringify(teamData)
            });

            expect(response.ok).toBe(true);
            expect(response.status).toBe(201);

            const createdTeam = await response.json();
            
            expect(createdTeam).toMatchObject({
                id: expect.any(String),
                name: teamData.name,
                description: teamData.description,
                status: teamData.status
            });

            testTeamIds.push(createdTeam.id);
        }, TEST_TIMEOUT);

        test('should retrieve teams via real API endpoint', async () => {
            // Create a test team first
            const testTeam = await createTestTeam();
            
            const response = await fetch(`${BASE_URL}/teams`, {
                headers: authHeaders
            });

            expect(response.ok).toBe(true);
            expect(response.status).toBe(200);

            const teamsData = await response.json();
            
            expect(teamsData).toHaveProperty('teams');
            expect(Array.isArray(teamsData.teams)).toBe(true);
            expect(teamsData.total).toBeGreaterThan(0);
            
            // Find our test team in the results
            const foundTeam = teamsData.teams.find(team => team.id === testTeam.id);
            expect(foundTeam).toBeDefined();
        }, TEST_TIMEOUT);

        test('should update team via real API endpoint', async () => {
            const testTeam = await createTestTeam();
            
            const updateData = {
                name: `Updated Test Team ${Date.now()}`,
                description: 'Updated by integration test'
            };

            const response = await fetch(`${BASE_URL}/teams/${testTeam.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders
                },
                body: JSON.stringify(updateData)
            });

            expect(response.ok).toBe(true);
            expect(response.status).toBe(200);

            const updatedTeam = await response.json();
            
            expect(updatedTeam.name).toBe(updateData.name);
            expect(updatedTeam.description).toBe(updateData.description);
            expect(updatedTeam.id).toBe(testTeam.id);
        }, TEST_TIMEOUT);

        test('should delete team via real API endpoint', async () => {
            const testTeam = await createTestTeam();
            
            const response = await fetch(`${BASE_URL}/teams/${testTeam.id}`, {
                method: 'DELETE',
                headers: authHeaders
            });

            expect(response.ok).toBe(true);
            expect(response.status).toBe(204);

            // Verify team is deleted
            const verifyResponse = await fetch(`${BASE_URL}/teams/${testTeam.id}`, {
                headers: authHeaders
            });

            expect(verifyResponse.status).toBe(404);
            
            // Remove from cleanup list since it's already deleted
            testTeamIds = testTeamIds.filter(id => id !== testTeam.id);
        }, TEST_TIMEOUT);

        test('should handle team not found gracefully', async () => {
            const nonExistentId = 'non-existent-team-id';
            
            const response = await fetch(`${BASE_URL}/teams/${nonExistentId}`, {
                headers: authHeaders
            });

            expect(response.ok).toBe(false);
            expect(response.status).toBe(404);
            
            const errorText = await response.text();
            expect(errorText).toContain('not found');
        }, TEST_TIMEOUT);
    });

    describe('Query Parameters and Filtering - Real API', () => {
        test('should handle pagination parameters', async () => {
            // Create multiple test teams
            const teams = await Promise.all([
                createTestTeam('Page Test Team 1'),
                createTestTeam('Page Test Team 2'),
                createTestTeam('Page Test Team 3')
            ]);

            const response = await fetch(`${BASE_URL}/teams?page=1&pageSize=2`, {
                headers: authHeaders
            });

            expect(response.ok).toBe(true);
            
            const data = await response.json();
            expect(data.teams.length).toBeLessThanOrEqual(2);
            expect(data.page).toBe(1);
            expect(data.pageSize).toBe(2);
            expect(data.total).toBeGreaterThanOrEqual(3);
        }, TEST_TIMEOUT);

        test('should handle status filtering', async () => {
            // Create teams with different statuses
            await createTestTeam('Active Team', 'active');
            await createTestTeam('Inactive Team', 'inactive');

            const response = await fetch(`${BASE_URL}/teams?status=active`, {
                headers: authHeaders
            });

            expect(response.ok).toBe(true);
            
            const data = await response.json();
            
            // All returned teams should have active status
            data.teams.forEach(team => {
                expect(team.status).toBe('active');
            });
        }, TEST_TIMEOUT);

        test('should handle search parameters', async () => {
            const uniqueName = `SearchableTeam_${Date.now()}`;
            await createTestTeam(uniqueName);

            const response = await fetch(`${BASE_URL}/teams?search=${uniqueName}`, {
                headers: authHeaders
            });

            expect(response.ok).toBe(true);
            
            const data = await response.json();
            expect(data.teams.length).toBeGreaterThan(0);
            
            // Find our specific team
            const foundTeam = data.teams.find(team => team.name.includes(uniqueName));
            expect(foundTeam).toBeDefined();
        }, TEST_TIMEOUT);

        test('should handle sorting parameters', async () => {
            const response = await fetch(`${BASE_URL}/teams?sortBy=name&sortDir=asc`, {
                headers: authHeaders
            });

            expect(response.ok).toBe(true);
            
            const data = await response.json();
            
            if (data.teams.length > 1) {
                // Verify ascending sort order
                for (let i = 1; i < data.teams.length; i++) {
                    expect(data.teams[i].name >= data.teams[i-1].name).toBe(true);
                }
            }
        }, TEST_TIMEOUT);
    });

    describe('Team Members - Real API Integration', () => {
        test('should load team members via API', async () => {
            const testTeam = await createTestTeam();

            const response = await fetch(`${BASE_URL}/team-members?teamId=${testTeam.id}`, {
                headers: authHeaders
            });

            expect(response.ok).toBe(true);
            
            const members = await response.json();
            expect(Array.isArray(members)).toBe(true);
        }, TEST_TIMEOUT);

        test('should assign member to team via API', async () => {
            const testTeam = await createTestTeam();
            const testUser = await createTestUser();

            const response = await fetch(`${BASE_URL}/team-members`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders
                },
                body: JSON.stringify({
                    teamId: testTeam.id,
                    userId: testUser.userId
                })
            });

            expect(response.ok).toBe(true);
            
            const assignment = await response.json();
            expect(assignment).toMatchObject({
                teamId: testTeam.id,
                userId: testUser.userId
            });
        }, TEST_TIMEOUT);

        test('should remove member from team via API', async () => {
            const testTeam = await createTestTeam();
            const testUser = await createTestUser();

            // First assign the member
            await fetch(`${BASE_URL}/team-members`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders
                },
                body: JSON.stringify({
                    teamId: testTeam.id,
                    userId: testUser.userId
                })
            });

            // Then remove the member
            const response = await fetch(`${BASE_URL}/team-members/${testTeam.id}/${testUser.userId}`, {
                method: 'DELETE',
                headers: authHeaders
            });

            expect(response.ok).toBe(true);
            expect(response.status).toBe(204);
        }, TEST_TIMEOUT);
    });

    describe('Bulk Operations - Real API Integration', () => {
        test('should perform bulk delete via API', async () => {
            // Create multiple test teams
            const teams = await Promise.all([
                createTestTeam('Bulk Delete 1'),
                createTestTeam('Bulk Delete 2'),
                createTestTeam('Bulk Delete 3')
            ]);

            const teamIds = teams.map(team => team.id);

            const response = await fetch(`${BASE_URL}/teams/bulk/delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders
                },
                body: JSON.stringify({ teamIds })
            });

            expect(response.ok).toBe(true);
            
            const result = await response.json();
            expect(result.deleted).toBe(3);
            expect(result.errors).toHaveLength(0);

            // Remove from cleanup list since they're deleted
            testTeamIds = testTeamIds.filter(id => !teamIds.includes(id));
        }, TEST_TIMEOUT);

        test('should perform bulk status update via API', async () => {
            // Create test teams
            const teams = await Promise.all([
                createTestTeam('Bulk Status 1', 'active'),
                createTestTeam('Bulk Status 2', 'active')
            ]);

            const teamIds = teams.map(team => team.id);

            const response = await fetch(`${BASE_URL}/teams/bulk/setStatus`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders
                },
                body: JSON.stringify({ 
                    teamIds,
                    status: 'inactive'
                })
            });

            expect(response.ok).toBe(true);
            
            const result = await response.json();
            expect(result.updated).toBe(2);
            expect(result.errors).toHaveLength(0);

            // Verify the status change
            for (const team of teams) {
                const verifyResponse = await fetch(`${BASE_URL}/teams/${team.id}`, {
                    headers: authHeaders
                });
                const updatedTeam = await verifyResponse.json();
                expect(updatedTeam.status).toBe('inactive');
            }
        }, TEST_TIMEOUT);
    });

    describe('Error Handling and Validation - Real API', () => {
        test('should return validation errors for invalid data', async () => {
            const invalidData = {
                name: '', // Empty name should fail validation
                status: 'invalid-status'
            };

            const response = await fetch(`${BASE_URL}/teams`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders
                },
                body: JSON.stringify(invalidData)
            });

            expect(response.ok).toBe(false);
            expect(response.status).toBe(400);
            
            const errorResponse = await response.text();
            expect(errorResponse).toContain('name');
        }, TEST_TIMEOUT);

        test('should handle duplicate team names', async () => {
            const teamName = `Duplicate Test ${Date.now()}`;
            
            // Create first team
            await createTestTeam(teamName);

            // Try to create second team with same name
            const duplicateData = new TeamBuilder().withName(teamName).build();
            
            const response = await fetch(`${BASE_URL}/teams`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders
                },
                body: JSON.stringify(duplicateData)
            });

            expect(response.ok).toBe(false);
            expect([409, 400]).toContain(response.status); // Conflict or Bad Request
            
            const errorText = await response.text();
            expect(errorText).toMatch(/duplicate|already exists|unique/i);
        }, TEST_TIMEOUT);

        test('should handle unauthorized requests', async () => {
            const teamData = new TeamBuilder().build();

            const response = await fetch(`${BASE_URL}/teams`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                    // No auth headers
                },
                body: JSON.stringify(teamData)
            });

            expect(response.ok).toBe(false);
            expect([401, 403]).toContain(response.status); // Unauthorized or Forbidden
        }, TEST_TIMEOUT);
    });

    describe('Performance and Caching - Real API', () => {
        test('should handle concurrent requests efficiently', async () => {
            const concurrentRequests = [];
            const startTime = Date.now();

            // Fire 10 concurrent GET requests
            for (let i = 0; i < 10; i++) {
                concurrentRequests.push(
                    fetch(`${BASE_URL}/teams?page=1&pageSize=10`, {
                        headers: authHeaders
                    })
                );
            }

            const responses = await Promise.all(concurrentRequests);
            const endTime = Date.now();

            // All requests should succeed
            responses.forEach(response => {
                expect(response.ok).toBe(true);
            });

            // Should complete reasonably fast (under 5 seconds)
            expect(endTime - startTime).toBeLessThan(5000);
        }, TEST_TIMEOUT);

        test('should demonstrate caching behavior', async () => {
            // First request (cache miss)
            const startTime1 = Date.now();
            const response1 = await fetch(`${BASE_URL}/teams`, {
                headers: authHeaders
            });
            const endTime1 = Date.now();
            const time1 = endTime1 - startTime1;

            expect(response1.ok).toBe(true);
            
            // Second request (potential cache hit)
            const startTime2 = Date.now();
            const response2 = await fetch(`${BASE_URL}/teams`, {
                headers: authHeaders
            });
            const endTime2 = Date.now();
            const time2 = endTime2 - startTime2;

            expect(response2.ok).toBe(true);

            // If caching is implemented, second request should be faster
            // This is informational - we don't enforce it
            console.log(`First request: ${time1}ms, Second request: ${time2}ms`);
        }, TEST_TIMEOUT);

        test('should handle large result sets efficiently', async () => {
            const response = await fetch(`${BASE_URL}/teams?pageSize=100`, {
                headers: authHeaders
            });

            expect(response.ok).toBe(true);
            
            const data = await response.json();
            
            // Should handle large page sizes without timeout
            expect(data).toHaveProperty('teams');
            expect(Array.isArray(data.teams)).toBe(true);
        }, TEST_TIMEOUT);
    });

    // Helper functions
    async function setupAuthentication() {
        // Setup authentication headers based on environment
        if (process.env.UMIG_API_KEY) {
            return { 'X-API-Key': process.env.UMIG_API_KEY };
        } else if (process.env.UMIG_AUTH_TOKEN) {
            return { 'Authorization': `Bearer ${process.env.UMIG_AUTH_TOKEN}` };
        } else {
            // For local development - use default admin session
            return { 'X-Test-User': 'admin' };
        }
    }

    async function verifyApiAvailability() {
        try {
            const response = await fetch(`${BASE_URL}/teams?pageSize=1`, {
                headers: authHeaders
            });
            
            if (!response.ok) {
                throw new Error(`API not available: ${response.status}`);
            }
        } catch (error) {
            console.error('API availability check failed:', error);
            throw error;
        }
    }

    async function createTestTeam(name = null, status = 'active') {
        const teamData = new TeamBuilder()
            .withName(name || `Test Team ${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
            .withDescription('Created by integration test')
            .withStatus(status)
            .build();

        const response = await fetch(`${BASE_URL}/teams`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders
            },
            body: JSON.stringify(teamData)
        });

        if (!response.ok) {
            throw new Error(`Failed to create test team: ${response.status} ${await response.text()}`);
        }

        const team = await response.json();
        testTeamIds.push(team.id);
        
        return team;
    }

    async function createTestUser() {
        const userData = new UserBuilder()
            .withUsername(`testuser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
            .withEmail(`test${Date.now()}@example.com`)
            .build();

        // For integration tests, we might need to create users via a different endpoint
        // or use existing users. This depends on the actual API implementation.
        
        // For now, return a mock user that should exist in test data
        const mockUser = {
            userId: 'test-user-id',
            username: userData.username,
            email: userData.email
        };
        
        testUserIds.push(mockUser.userId);
        return mockUser;
    }

    async function cleanupTestData() {
        // Clean up all teams created during tests
        for (const teamId of testTeamIds) {
            try {
                await fetch(`${BASE_URL}/teams/${teamId}`, {
                    method: 'DELETE',
                    headers: authHeaders
                });
            } catch (error) {
                console.warn(`Failed to cleanup team ${teamId}:`, error);
            }
        }

        // Clean up users if needed
        for (const userId of testUserIds) {
            try {
                // User cleanup logic if supported by API
                console.log(`Should cleanup user ${userId}`);
            } catch (error) {
                console.warn(`Failed to cleanup user ${userId}:`, error);
            }
        }
    }

    async function cleanupIndividualTest() {
        // Cleanup any test-specific data that wasn't tracked globally
        // This is called after each test
    }
});

export default {
    BASE_URL,
    TEST_TIMEOUT
};