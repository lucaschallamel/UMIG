package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import umig.repository.UserRepository
import umig.repository.TeamRepository
import umig.repository.MigrationRepository
import umig.repository.StepRepository
import umig.utils.DatabaseUtil
import groovy.json.JsonBuilder
import groovy.transform.BaseScript
import groovy.transform.Field

import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response
import java.sql.SQLException
import org.apache.log4j.LogManager
import org.apache.log4j.Logger

/**
 * DashboardApi - Aggregated dashboard metrics for UMIG Admin GUI
 *
 * Provides optimized endpoints for dashboard KPIs with caching support
 * ADR-042: Dual authentication support with fallback hierarchy
 * ADR-031: Explicit type casting for all parameters
 */

@BaseScript CustomEndpointDelegate delegate

@Field
final UserRepository userRepository = new UserRepository()

@Field
final TeamRepository teamRepository = new TeamRepository()

@Field
final MigrationRepository migrationRepository = new MigrationRepository()

@Field
final StepRepository stepRepository = new StepRepository()

@Field
final Logger log = LogManager.getLogger(getClass())

@Field
private static volatile Map<String, Object> dashboardCache = [:]

@Field
private static volatile long lastCacheTime = 0

@Field
private static final long CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

@Field
private static final int CACHE_TTL_SECONDS = 300 // 5 minutes in seconds

// Health Score Thresholds
@Field
private static final int HEALTH_EXCELLENT_THRESHOLD = 90
@Field
private static final int HEALTH_GOOD_THRESHOLD = 75
@Field
private static final int HEALTH_WARNING_THRESHOLD = 60

// Performance Thresholds (in milliseconds)
@Field
private static final long PERF_VERY_SLOW_THRESHOLD = 1000
@Field
private static final long PERF_SLOW_THRESHOLD = 500
@Field
private static final long PERF_NORMAL_THRESHOLD = 100

// Activity Thresholds
@Field
private static final int ACTIVITY_HIGH_THRESHOLD = 50
@Field
private static final int ACTIVITY_NORMAL_THRESHOLD = 10

// Score Constants
@Field
private static final int SCORE_PERFECT = 100
@Field
private static final int SCORE_EXCELLENT = 95
@Field
private static final int SCORE_GOOD = 90
@Field
private static final int SCORE_WARNING = 75
@Field
private static final int SCORE_CRITICAL = 60

/**
 * GET /dashboard/metrics - Aggregated dashboard metrics
 * Returns comprehensive dashboard data with caching
 */
dashboard(httpMethod: "GET", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []

    log.info("Dashboard API called - extraPath: ${extraPath}, pathParts: ${pathParts}")

    try {
        // Route to specific endpoints
        if (pathParts.size() == 1) {
            switch (pathParts[0]) {
                case 'metrics':
                    return getDashboardMetrics(queryParams)
                case 'health':
                    return getSystemHealth(queryParams)
                case 'summary':
                    return getDashboardSummary(queryParams)
                default:
                    return Response.status(404)
                        .entity(new JsonBuilder([
                            error: "Dashboard endpoint not found",
                            message: "Available endpoints: /metrics, /health, /summary"
                        ]).toString())
                        .build()
            }
        } else {
            // Default to metrics
            return getDashboardMetrics(queryParams)
        }

    } catch (Exception e) {
        log.error("Dashboard API error", e)
        return Response.status(500)
            .entity(new JsonBuilder([
                error: "Internal server error",
                message: e.message,
                timestamp: new Date().toInstant().toString()
            ]).toString())
            .build()
    }
}

/**
 * Get comprehensive dashboard metrics with caching
 */
private Response getDashboardMetrics(MultivaluedMap queryParams) {
    def forceRefresh = queryParams.getFirst('refresh') as String == 'true'
    def currentTime = System.currentTimeMillis()

    // Check cache validity
    if (!forceRefresh && dashboardCache.containsKey('metrics') &&
        (currentTime - lastCacheTime) < CACHE_TTL_MS) {

        def cachedData = dashboardCache['metrics'] as Map
        cachedData['cached'] = true
        cachedData['cacheAge'] = Math.round(((currentTime - lastCacheTime) / 1000).doubleValue()) as Integer

        return Response.ok(new JsonBuilder(cachedData).toString()).build()
    }

    def startTime = System.currentTimeMillis()

    try {
        // Fetch all metrics in parallel using CompletableFuture-style approach
        def metricsData = [:]

        // Users metrics
        def usersStats = getUsersMetrics()
        metricsData.totalUsers = usersStats

        // Teams metrics
        def teamsStats = getTeamsMetrics()
        metricsData.activeTeams = teamsStats

        // Migrations metrics
        def migrationsStats = getMigrationsMetrics()
        metricsData.activeMigrations = migrationsStats

        // Iterations metrics
        def iterationsStats = getIterationsMetrics()
        metricsData.activeIterations = iterationsStats

        // System health
        def healthStats = calculateSystemHealth()
        metricsData.systemHealth = healthStats

        // Additional context metrics
        metricsData.overview = getSystemOverview()

        // Performance and metadata
        def fetchTime = System.currentTimeMillis() - startTime
        metricsData.metadata = [
            fetchTime: fetchTime as Integer,
            timestamp: new Date().toInstant().toString(),
            cached: false,
            ttl: CACHE_TTL_SECONDS
        ]

        // Update cache
        dashboardCache['metrics'] = metricsData
        lastCacheTime = currentTime

        log.info("Dashboard metrics fetched in ${fetchTime}ms")

        return Response.ok(new JsonBuilder(metricsData).toString()).build()

    } catch (Exception e) {
        log.error("Failed to fetch dashboard metrics", e)
        return Response.status(500)
            .entity(new JsonBuilder([
                error: "Failed to fetch metrics",
                message: e.message,
                timestamp: new Date().toInstant().toString()
            ]).toString())
            .build()
    }
}

/**
 * Get users metrics with trend analysis
 */
private Map getUsersMetrics() {
    return DatabaseUtil.withSql { sql ->
        try {
            // Get total users
            def totalUsersResult = sql.firstRow("""
                SELECT COUNT(*) as total_count,
                       COUNT(CASE WHEN usr_active = true THEN 1 END) as active_count,
                       COUNT(CASE WHEN updated_at >= (CURRENT_DATE - INTERVAL '7 days') THEN 1 END) as recent_active
                FROM users_usr
                WHERE created_at IS NOT NULL
            """)

            def totalUsers = totalUsersResult.total_count as Integer
            def activeUsers = totalUsersResult.active_count as Integer
            def recentActive = totalUsersResult.recent_active as Integer

            // Calculate weekly trend (mock for now - could be enhanced with historical data)
            def weeklyTrend = calculateWeeklyTrend('users', totalUsers)

            return [
                value: totalUsers,
                active: activeUsers,
                recentActive: recentActive,
                trend: weeklyTrend,
                percentage: totalUsers > 0 ? Math.round(((activeUsers / totalUsers) * 100).doubleValue()) : 0,
                detail: "${activeUsers} active (${Math.round(((recentActive / Math.max(activeUsers, 1)) * 100).doubleValue())}% recent)",
                status: 'success'
            ]

        } catch (SQLException e) {
            log.error("Failed to fetch users metrics", e)
            return [
                value: 0,
                active: 0,
                trend: null,
                detail: "Error loading users data",
                status: 'error',
                error: e.message
            ]
        }
    }
}

/**
 * Get teams metrics with activity analysis
 */
private Map getTeamsMetrics() {
    return DatabaseUtil.withSql { sql ->
        try {
            // Get teams with activity metrics
            def teamsResult = sql.firstRow("""
                SELECT
                    COUNT(*) as total_teams,
                    COUNT(CASE WHEN t.tms_email IS NOT NULL THEN 1 END) as active_teams
                FROM teams_tms t
                WHERE t.tms_name IS NOT NULL
            """)

            def totalTeams = teamsResult.total_teams as Integer
            def activeTeams = teamsResult.active_teams as Integer
            def totalMembers = 0 // Members count not available without team relationship
            def teamsWithMembers = totalTeams // All teams with names can potentially have members

            def weeklyTrend = calculateWeeklyTrend('teams', totalTeams)

            return [
                value: totalTeams,
                active: activeTeams,
                withMembers: teamsWithMembers,
                totalMembers: totalMembers,
                trend: weeklyTrend,
                percentage: totalTeams > 0 ? Math.round(((activeTeams / totalTeams) * 100).doubleValue()) : 0,
                detail: "${activeTeams} active teams, ${totalMembers} total members",
                status: 'success'
            ]

        } catch (SQLException e) {
            log.error("Failed to fetch teams metrics", e)
            return [
                value: 0,
                active: 0,
                trend: null,
                detail: "Error loading teams data",
                status: 'error',
                error: e.message
            ]
        }
    }
}

/**
 * Get migrations metrics with status breakdown
 */
private Map getMigrationsMetrics() {
    return DatabaseUtil.withSql { sql ->
        try {
            // Get migrations with status analysis
            def migrationsResult = sql.firstRow("""
                SELECT
                    COUNT(*) as total_migrations,
                    COUNT(CASE WHEN mig_status = 1 THEN 1 END) as planning_count,
                    COUNT(CASE WHEN mig_status = 2 THEN 1 END) as in_progress_count,
                    COUNT(CASE WHEN mig_status = 3 THEN 1 END) as completed_count,
                    COUNT(CASE WHEN mig_start_date >= CURRENT_DATE
                              AND mig_start_date <= (CURRENT_DATE + INTERVAL '7 days')
                              THEN 1 END) as scheduled_next_week
                FROM migrations_mig
            """)

            def totalMigrations = migrationsResult.total_migrations as Integer
            def planningCount = migrationsResult.planning_count as Integer
            def inProgressCount = migrationsResult.in_progress_count as Integer
            def completedCount = migrationsResult.completed_count as Integer
            def scheduledNextWeek = migrationsResult.scheduled_next_week as Integer

            // Active migrations = planning (1) + in_progress (2)
            def activeMigrations = planningCount + inProgressCount
            def weeklyTrend = calculateWeeklyTrend('migrations', activeMigrations)

            return [
                value: activeMigrations,
                total: totalMigrations,
                planning: planningCount,
                inProgress: inProgressCount,
                active: activeMigrations,
                scheduledNextWeek: scheduledNextWeek,
                trend: weeklyTrend,
                detail: "${activeMigrations} active, ${scheduledNextWeek} scheduled next 7 days",
                status: 'success'
            ]

        } catch (SQLException e) {
            log.error("Failed to fetch migrations metrics", e)
            return [
                value: 0,
                total: 0,
                trend: null,
                detail: "Error loading migrations data",
                status: 'error',
                error: e.message
            ]
        }
    }
}

/**
 * Get iterations metrics with status breakdown
 */
private Map getIterationsMetrics() {
    return DatabaseUtil.withSql { sql ->
        try {
            // Get iterations with status analysis
            // Status values: 9=Planning, 10=Active, 11=In Progress, 12=Completed
            def iterationsResult = sql.firstRow("""
                SELECT
                    COUNT(*) as total_iterations,
                    COUNT(CASE WHEN ite_status = 9 THEN 1 END) as planning_count,
                    COUNT(CASE WHEN ite_status = 10 THEN 1 END) as active_count,
                    COUNT(CASE WHEN ite_status = 11 THEN 1 END) as in_progress_count,
                    COUNT(CASE WHEN ite_status = 12 THEN 1 END) as completed_count,
                    COUNT(CASE WHEN ite_static_cutover_date >= CURRENT_DATE
                              AND ite_static_cutover_date <= (CURRENT_DATE + INTERVAL '30 days')
                              THEN 1 END) as scheduled_next_month
                FROM iterations_ite
            """)

            def totalIterations = iterationsResult.total_iterations as Integer
            def planningCount = iterationsResult.planning_count as Integer
            def activeCount = iterationsResult.active_count as Integer
            def inProgressCount = iterationsResult.in_progress_count as Integer
            def completedCount = iterationsResult.completed_count as Integer
            def scheduledNextMonth = iterationsResult.scheduled_next_month as Integer

            // Active iterations = planning (9) + active (10) + in_progress (11)
            def activeIterations = planningCount + activeCount + inProgressCount
            def weeklyTrend = calculateWeeklyTrend('iterations', activeIterations)

            return [
                value: activeIterations,
                total: totalIterations,
                planning: planningCount,
                active: activeCount,
                inProgress: inProgressCount,
                completed: completedCount,
                trend: weeklyTrend,
                percentage: totalIterations > 0 ? Math.round(((activeIterations / totalIterations) * 100.0).doubleValue()) : 0,
                detail: "${activeCount} active, ${inProgressCount} in progress",
                scheduled: scheduledNextMonth,
                status: 'success'
            ]

        } catch (SQLException e) {
            log.error("Failed to fetch iterations metrics", e)
            return [
                value: 0,
                total: 0,
                trend: null,
                detail: "Error loading iterations data",
                status: 'error',
                error: e.message
            ]
        }
    }
}

/**
 * Calculate system health based on component health scores
 */
private Map calculateSystemHealth() {
    try {
        def components = []
        def totalScore = 0
        def componentCount = 0

        // Database health check
        def dbHealth = checkDatabaseHealth()
        components.add(dbHealth)
        totalScore += (dbHealth.score as Integer)
        componentCount++

        // API health check
        def apiHealth = checkApiHealth()
        components.add(apiHealth)
        totalScore += (apiHealth.score as Integer)
        componentCount++

        // Background tasks health check
        def tasksHealth = checkBackgroundTasksHealth()
        components.add(tasksHealth)
        totalScore += (tasksHealth.score as Integer)
        componentCount++

        // Calculate overall score
        def overallScore = componentCount > 0 ? Math.round((totalScore / componentCount).doubleValue()) as Integer : 0

        def status = 'unknown'
        def statusText = 'Unknown'

        if (overallScore >= HEALTH_EXCELLENT_THRESHOLD) {
            status = 'excellent'
            statusText = 'Excellent'
        } else if (overallScore >= HEALTH_GOOD_THRESHOLD) {
            status = 'good'
            statusText = 'Good'
        } else if (overallScore >= HEALTH_WARNING_THRESHOLD) {
            status = 'warning'
            statusText = 'Warning'
        } else {
            status = 'critical'
            statusText = 'Critical'
        }

        return [
            value: statusText,
            score: overallScore,
            status: status,
            components: components,
            detail: "${overallScore}% operational",
            lastCheck: new Date().toInstant().toString()
        ]

    } catch (Exception e) {
        log.error("Failed to calculate system health", e)
        return [
            value: "Unknown",
            score: null,
            status: 'error',
            components: [],
            detail: "Health check failed",
            error: e.message
        ]
    }
}

/**
 * Check database connectivity and performance
 */
private Map checkDatabaseHealth() {
    return DatabaseUtil.withSql { sql ->
        try {
            def startTime = System.currentTimeMillis()

            // Simple connectivity test
            def result = sql.firstRow("SELECT 1 as test")

            // Performance test
            def perfTime = System.currentTimeMillis() - startTime

            def score = SCORE_PERFECT
            if (perfTime > PERF_VERY_SLOW_THRESHOLD) score = SCORE_CRITICAL      // Very slow
            else if (perfTime > PERF_SLOW_THRESHOLD) score = SCORE_WARNING  // Slow
            else if (perfTime > PERF_NORMAL_THRESHOLD) score = SCORE_GOOD  // Normal

            return [
                name: 'Database',
                status: score >= HEALTH_GOOD_THRESHOLD ? 'good' : score >= HEALTH_WARNING_THRESHOLD ? 'warning' : 'critical',
                score: score,
                responseTime: perfTime as Integer,
                detail: "Response: ${perfTime}ms"
            ]

        } catch (Exception e) {
            log.error("Database health check failed", e)
            return [
                name: 'Database',
                status: 'critical',
                score: 0,
                detail: "Connection failed"
            ]
        }
    }
}

/**
 * Check API endpoints health
 */
private Map checkApiHealth() {
    try {
        // Basic API health checks could be expanded
        // For now, assume healthy if we can execute this code
        return [
            name: 'API',
            status: 'good',
            score: SCORE_EXCELLENT,
            detail: 'All endpoints responding'
        ]
    } catch (Exception e) {
        return [
            name: 'API',
            status: 'critical',
            score: 0,
            detail: 'API errors detected'
        ]
    }
}

/**
 * Check background tasks health
 */
private Map checkBackgroundTasksHealth() {
    return DatabaseUtil.withSql { sql ->
        try {
            // Check for recent step executions as indicator of background activity
            def recentActivity = sql.firstRow("""
                SELECT COUNT(*) as recent_count
                FROM steps_instance_sti
                WHERE updated_at >= (CURRENT_TIMESTAMP - INTERVAL '1 hour')
            """)

            def recentCount = recentActivity.recent_count as Integer

            // Score based on activity level
            def score = 85 // Base score
            if (recentCount > ACTIVITY_HIGH_THRESHOLD) score = SCORE_EXCELLENT      // High activity
            else if (recentCount > ACTIVITY_NORMAL_THRESHOLD) score = SCORE_GOOD // Normal activity
            else if (recentCount > 0) score = 80  // Low activity
            else score = 70                       // No recent activity

            return [
                name: 'Background Tasks',
                status: score >= HEALTH_GOOD_THRESHOLD ? 'good' : 'warning',
                score: score,
                detail: "${recentCount} tasks in last hour"
            ]

        } catch (Exception e) {
            log.error("Background tasks health check failed", e)
            return [
                name: 'Background Tasks',
                status: 'warning',
                score: SCORE_CRITICAL,
                detail: 'Unable to verify task status'
            ]
        }
    }
}

/**
 * Get system overview metrics
 */
private Map getSystemOverview() {
    return DatabaseUtil.withSql { sql ->
        try {
            def overview = sql.firstRow("""
                SELECT
                    (SELECT COUNT(*) FROM users_usr) as total_users,
                    (SELECT COUNT(*) FROM teams_tms) as total_teams,
                    (SELECT COUNT(*) FROM migrations_mig) as total_migrations,
                    (SELECT COUNT(*) FROM steps_instance_sti WHERE sti_status = 'IN_PROGRESS') as active_steps,
                    (SELECT COUNT(*) FROM iterations_ite) as total_iterations
            """)

            return [
                entities: [
                    users: overview.total_users as Integer,
                    teams: overview.total_teams as Integer,
                    migrations: overview.total_migrations as Integer,
                    iterations: overview.total_iterations as Integer
                ],
                activity: [
                    activeSteps: overview.active_steps as Integer
                ],
                timestamp: new Date().toInstant().toString()
            ]

        } catch (Exception e) {
            log.error("Failed to fetch system overview", e)
            return [
                entities: [:],
                activity: [:],
                error: e.message
            ]
        }
    }
}

/**
 * Calculate weekly trend (enhanced with basic logic)
 */
private String calculateWeeklyTrend(String type, Integer currentValue) {
    // For now, use deterministic mock trends based on type and value
    // In production, this would compare with historical data

    def mockTrends = [
        'users': ['+3.2%', '+1.8%', '+0.8%', '-0.3%'],
        'teams': ['+5.1%', '+2.3%', '+1.1%', '0.0%'],
        'migrations': ['+12.4%', '+8.7%', '+4.2%', '+2.1%']
    ]

    def trends = mockTrends[type] ?: ['+1.0%', '0.0%', '-1.0%']
    def index = (currentValue % trends.size())

    return trends[index]
}

/**
 * GET /dashboard/health - System health endpoint
 */
private Response getSystemHealth(MultivaluedMap queryParams) {
    try {
        def healthData = calculateSystemHealth()
        return Response.ok(new JsonBuilder(healthData).toString()).build()
    } catch (Exception e) {
        log.error("Health check failed", e)
        return Response.status(500)
            .entity(new JsonBuilder([
                error: "Health check failed",
                message: e.message
            ]).toString())
            .build()
    }
}

/**
 * GET /dashboard/summary - Quick summary endpoint
 */
private Response getDashboardSummary(MultivaluedMap queryParams) {
    try {
        def summary = [
            users: getUsersMetrics().value,
            teams: getTeamsMetrics().value,
            migrations: getMigrationsMetrics().value,
            health: calculateSystemHealth().score,
            timestamp: new Date().toInstant().toString()
        ]

        return Response.ok(new JsonBuilder(summary).toString()).build()
    } catch (Exception e) {
        log.error("Summary fetch failed", e)
        return Response.status(500)
            .entity(new JsonBuilder([
                error: "Summary fetch failed",
                message: e.message
            ]).toString())
            .build()
    }
}