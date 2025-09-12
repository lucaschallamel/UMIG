/**
 * TeamBuilder - Test Data Builder Pattern for Teams Entity Testing
 * 
 * Provides fluent API for creating test data objects with realistic values
 * and comprehensive edge case coverage. Eliminates code duplication across tests
 * and ensures consistent test data structure.
 * 
 * @version 1.0.0
 * @created 2025-01-12 (US-082-C Remediation - Priority 1)
 * @coverage Complete edge case support for boundary testing
 */

import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';

export class TeamBuilder {
    constructor() {
        this.reset();
    }

    reset() {
        this.data = {
            id: uuidv4(),
            name: faker.company.name(),
            description: faker.lorem.paragraph(),
            status: 'active',
            memberCount: faker.number.int({ min: 1, max: 20 }),
            created: faker.date.past().toISOString(),
            updated: faker.date.recent().toISOString(),
            createdBy: faker.internet.userName(),
            updatedBy: faker.internet.userName(),
            permissions: ['view'],
            metadata: {}
        };
        return this;
    }

    /**
     * Set team ID
     */
    withId(id) {
        this.data.id = id;
        return this;
    }

    /**
     * Set team name with validation support
     */
    withName(name) {
        this.data.name = name;
        return this;
    }

    /**
     * Set team description
     */
    withDescription(description) {
        this.data.description = description;
        return this;
    }

    /**
     * Set team status (active, inactive, archived)
     */
    withStatus(status) {
        if (!['active', 'inactive', 'archived'].includes(status)) {
            throw new Error(`Invalid status: ${status}. Must be active, inactive, or archived`);
        }
        this.data.status = status;
        return this;
    }

    /**
     * Set member count
     */
    withMemberCount(count) {
        this.data.memberCount = count;
        return this;
    }

    /**
     * Set creation date
     */
    withCreatedDate(date) {
        this.data.created = date instanceof Date ? date.toISOString() : date;
        return this;
    }

    /**
     * Set created by user
     */
    withCreatedBy(user) {
        this.data.createdBy = user;
        return this;
    }

    /**
     * Set permissions array
     */
    withPermissions(permissions) {
        this.data.permissions = Array.isArray(permissions) ? permissions : [permissions];
        return this;
    }

    /**
     * Add metadata field
     */
    withMetadata(key, value) {
        this.data.metadata[key] = value;
        return this;
    }

    /**
     * Create team for boundary testing - exactly 100 characters (max limit)
     */
    withMaxLengthName() {
        this.data.name = 'A'.repeat(100); // Exactly at 100 character limit
        return this;
    }

    /**
     * Create team with name exceeding limit (101 characters)
     */
    withTooLongName() {
        this.data.name = 'A'.repeat(101); // Exceeds 100 character limit
        return this;
    }

    /**
     * Create team with empty name (validation test)
     */
    withEmptyName() {
        this.data.name = '';
        return this;
    }

    /**
     * Create team with whitespace-only name
     */
    withWhitespaceOnlyName() {
        this.data.name = '   ';
        return this;
    }

    /**
     * Create team with zero members
     */
    withZeroMembers() {
        this.data.memberCount = 0;
        return this;
    }

    /**
     * Create team with maximum members (boundary testing)
     */
    withMaxMembers() {
        this.data.memberCount = 1000; // Assume max limit
        return this;
    }

    /**
     * Create team with negative member count (invalid)
     */
    withNegativeMembers() {
        this.data.memberCount = -1;
        return this;
    }

    /**
     * Create archived team
     */
    asArchived() {
        this.data.status = 'archived';
        return this;
    }

    /**
     * Create inactive team
     */
    asInactive() {
        this.data.status = 'inactive';
        return this;
    }

    /**
     * Create team with XSS payload in name (security testing)
     */
    withXSSPayloadName() {
        this.data.name = '<script>alert("xss")</script>Team Name';
        return this;
    }

    /**
     * Create team with SQL injection payload in name
     */
    withSQLInjectionName() {
        this.data.name = "'; DROP TABLE teams; --";
        return this;
    }

    /**
     * Create team with special characters in name
     */
    withSpecialCharactersName() {
        this.data.name = 'Team!@#$%^&*()_+-={}[]|\\:";\'<>?,./`~';
        return this;
    }

    /**
     * Create team with unicode characters
     */
    withUnicodeCharactersName() {
        this.data.name = 'Team 测试 🚀 émojis Ñiño';
        return this;
    }

    /**
     * Create team with very long description (edge case)
     */
    withMaxLengthDescription() {
        this.data.description = faker.lorem.paragraphs(50).substring(0, 5000); // 5KB limit
        return this;
    }

    /**
     * Create team with null description
     */
    withNullDescription() {
        this.data.description = null;
        return this;
    }

    /**
     * Create team with undefined description
     */
    withUndefinedDescription() {
        this.data.description = undefined;
        return this;
    }

    /**
     * Create multiple teams (array)
     */
    buildMultiple(count = 5) {
        const teams = [];
        for (let i = 0; i < count; i++) {
            teams.push(this.build());
            this.reset(); // Reset for next team
        }
        return teams;
    }

    /**
     * Create paginated response structure
     */
    buildPaginatedResponse(page = 1, pageSize = 20, total = null) {
        const teams = this.buildMultiple(Math.min(pageSize, total || pageSize));
        return {
            teams,
            total: total || teams.length,
            page,
            pageSize,
            totalPages: total ? Math.ceil(total / pageSize) : 1
        };
    }

    /**
     * Create API response structure
     */
    buildApiResponse(success = true, status = 200) {
        if (success) {
            return {
                ok: true,
                status,
                json: () => Promise.resolve(this.data)
            };
        } else {
            return {
                ok: false,
                status,
                text: () => Promise.resolve('Error message')
            };
        }
    }

    /**
     * Create API error response
     */
    buildErrorResponse(status = 500, message = 'Internal Server Error') {
        return {
            ok: false,
            status,
            text: () => Promise.resolve(message),
            json: () => Promise.reject(new Error('Response not JSON'))
        };
    }

    /**
     * Create network error (for testing fetch failures)
     */
    buildNetworkError(message = 'Network error') {
        return Promise.reject(new Error(message));
    }

    /**
     * Build final team object
     */
    build() {
        return { ...this.data };
    }

    /**
     * Static factory methods for common scenarios
     */
    static validTeam() {
        return new TeamBuilder().build();
    }

    static invalidTeam() {
        return new TeamBuilder().withEmptyName().build();
    }

    static archivedTeam() {
        return new TeamBuilder().asArchived().build();
    }

    static teamWithZeroMembers() {
        return new TeamBuilder().withZeroMembers().build();
    }

    static teamWithMaxLengthName() {
        return new TeamBuilder().withMaxLengthName().build();
    }

    static teamWithTooLongName() {
        return new TeamBuilder().withTooLongName().build();
    }

    static xssTeam() {
        return new TeamBuilder().withXSSPayloadName().build();
    }

    static sqlInjectionTeam() {
        return new TeamBuilder().withSQLInjectionName().build();
    }

    static unicodeTeam() {
        return new TeamBuilder().withUnicodeCharactersName().build();
    }

    /**
     * Create multiple teams with different statuses
     */
    static mixedStatusTeams(count = 10) {
        const teams = [];
        const statuses = ['active', 'inactive', 'archived'];
        
        for (let i = 0; i < count; i++) {
            const status = statuses[i % statuses.length];
            teams.push(new TeamBuilder().withStatus(status).build());
        }
        
        return teams;
    }

    /**
     * Create performance test dataset
     */
    static performanceDataset(size = 1000) {
        const teams = [];
        for (let i = 0; i < size; i++) {
            teams.push(new TeamBuilder()
                .withId(`perf-team-${i}`)
                .withName(`Performance Test Team ${i}`)
                .withMemberCount(Math.floor(Math.random() * 50))
                .build()
            );
        }
        return teams;
    }

    /**
     * Create concurrent modification test data
     */
    static concurrentModificationScenario() {
        const baseTeam = new TeamBuilder().withName('Concurrent Test Team').build();
        
        return {
            original: baseTeam,
            userAModification: {
                ...baseTeam,
                name: 'Modified by User A',
                updated: new Date(Date.now() + 1000).toISOString()
            },
            userBModification: {
                ...baseTeam,
                name: 'Modified by User B',
                updated: new Date(Date.now() + 2000).toISOString()
            }
        };
    }

    /**
     * Create bulk operations test data
     */
    static bulkOperationDataset(operation = 'delete', count = 50) {
        const teams = new TeamBuilder().buildMultiple(count);
        const teamIds = teams.map(team => team.id);
        
        return {
            teams,
            teamIds,
            operation,
            expectedResponse: {
                [operation === 'delete' ? 'deleted' : 'updated']: count,
                errors: []
            }
        };
    }
}

/**
 * User Builder for Team Member testing
 */
export class UserBuilder {
    constructor() {
        this.reset();
    }

    reset() {
        this.data = {
            userId: uuidv4(),
            username: faker.internet.userName(),
            email: faker.internet.email(),
            displayName: faker.person.fullName(),
            role: 'USER',
            active: true,
            created: faker.date.past().toISOString()
        };
        return this;
    }

    withUserId(userId) {
        this.data.userId = userId;
        return this;
    }

    withUsername(username) {
        this.data.username = username;
        return this;
    }

    withEmail(email) {
        this.data.email = email;
        return this;
    }

    withRole(role) {
        this.data.role = role;
        return this;
    }

    asAdmin() {
        this.data.role = 'ADMIN';
        return this;
    }

    asSuperAdmin() {
        this.data.role = 'SUPERADMIN';
        return this;
    }

    asInactive() {
        this.data.active = false;
        return this;
    }

    build() {
        return { ...this.data };
    }

    buildMultiple(count = 5) {
        const users = [];
        for (let i = 0; i < count; i++) {
            users.push(this.build());
            this.reset();
        }
        return users;
    }

    static adminUser() {
        return new UserBuilder().asAdmin().build();
    }

    static superAdminUser() {
        return new UserBuilder().asSuperAdmin().build();
    }

    static regularUser() {
        return new UserBuilder().build();
    }

    static inactiveUser() {
        return new UserBuilder().asInactive().build();
    }
}

/**
 * Team Member Assignment Builder
 */
export class TeamMemberBuilder {
    constructor() {
        this.reset();
    }

    reset() {
        this.data = {
            id: uuidv4(),
            teamId: uuidv4(),
            userId: uuidv4(),
            role: 'MEMBER',
            joined: faker.date.past().toISOString(),
            active: true
        };
        return this;
    }

    withTeamId(teamId) {
        this.data.teamId = teamId;
        return this;
    }

    withUserId(userId) {
        this.data.userId = userId;
        return this;
    }

    withRole(role) {
        this.data.role = role;
        return this;
    }

    asLead() {
        this.data.role = 'LEAD';
        return this;
    }

    asMember() {
        this.data.role = 'MEMBER';
        return this;
    }

    asInactive() {
        this.data.active = false;
        return this;
    }

    build() {
        return { ...this.data };
    }

    buildMultiple(count = 5) {
        const assignments = [];
        for (let i = 0; i < count; i++) {
            assignments.push(this.build());
            this.reset();
        }
        return assignments;
    }
}

export default TeamBuilder;