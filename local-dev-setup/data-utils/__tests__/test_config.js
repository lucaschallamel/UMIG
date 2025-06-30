const TEST_CONFIG = {
    TEAMS: { COUNT: 1 }, // Default, can be overridden in tests
    APPLICATIONS: { COUNT: 1 }, // Default
    USERS: {
        NORMAL: { COUNT: 5 },
        ADMIN: { COUNT: 2 },
        PILOT: { COUNT: 1 },
    },
    MIGRATIONS: {
        COUNT: 1,
        TYPE: 'MIGRATION',
        START_DATE_RANGE: ['2023-01-01', '2023-06-01'],
        DURATION_MONTHS: 6,
        ITERATIONS: {
            RUN: 1,
            DR: 1,
            CUTOVER: 1,
        },
    },
    CANONICAL_PLANS: { PER_MIGRATION: 1 },
    LABELS: {
        PER_STEP: { MIN: 0, MAX: 3 },
    },
};

module.exports = { TEST_CONFIG };
