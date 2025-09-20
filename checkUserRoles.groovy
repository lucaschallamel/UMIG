#!/usr/bin/env groovy

// Simple script to check user roles in the database
@Grab('org.postgresql:postgresql:42.7.3')

import groovy.sql.Sql
import java.sql.DriverManager

def url = 'jdbc:postgresql://localhost:5432/umig_app_db'
def user = 'umig_app_user'
def password = 'umig_dev_password'
def driver = 'org.postgresql.Driver'

try {
    def sql = Sql.newInstance(url, user, password, driver)

    println "=== UMIG Users Database Check ==="
    println "Checking for users in tbl_users_master..."

    def users = sql.rows("""
        SELECT usr_id, usr_code, usr_first_name, usr_last_name, role_code, usr_username
        FROM tbl_users_master
        ORDER BY usr_id
    """)

    if (users.isEmpty()) {
        println "❌ No users found in tbl_users_master table"
    } else {
        println "✅ Found ${users.size()} users:"
        users.each { row ->
            println "  ID: ${row.usr_id}, Username: ${row.usr_username ?: row.usr_code}, Role: ${row.role_code ?: 'NULL'}, Name: ${row.usr_first_name} ${row.usr_last_name}"
        }
    }

    println "\n=== Specific check for 'adm' user ==="
    def admUser = sql.firstRow("""
        SELECT usr_id, usr_code, usr_first_name, usr_last_name, role_code, usr_username
        FROM tbl_users_master
        WHERE usr_username = ? OR usr_code = ?
    """, ['adm', 'adm'])

    if (admUser) {
        println "✅ Found 'adm' user:"
        println "  ID: ${admUser.usr_id}, Username: ${admUser.usr_username ?: admUser.usr_code}, Role: ${admUser.role_code ?: 'NULL'}"
        if (admUser.role_code != 'ADMIN') {
            println "⚠️ WARNING: 'adm' user role is '${admUser.role_code}', should be 'ADMIN'"
        }
    } else {
        println "❌ 'adm' user not found in database"
        println "💡 This explains why 'adm' user gets null role in step-view"
    }

    println "\n=== Role Distribution ==="
    def roleStats = sql.rows("""
        SELECT role_code, COUNT(*) as count
        FROM tbl_users_master
        GROUP BY role_code
        ORDER BY role_code
    """)

    roleStats.each { row ->
        println "  ${row.role_code ?: 'NULL'}: ${row.count} users"
    }

    sql.close()

} catch (Exception e) {
    println "❌ Database connection failed: ${e.message}"
    println "💡 Make sure PostgreSQL is running and accessible"
}