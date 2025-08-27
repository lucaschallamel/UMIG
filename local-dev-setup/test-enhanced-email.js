#!/usr/bin/env node

import pg from 'pg';
const { Client } = pg;

// Database configuration
const dbConfig = {
    host: 'localhost',
    port: 5432,
    database: 'umig_app_db',
    user: 'umig_app_user',
    password: '123456'
};

class EmailDatabaseValidator {
    constructor() {
        this.client = new Client(dbConfig);
        this.results = [];
    }

    async connect() {
        try {
            await this.client.connect();
            this.logSuccess('✓ Database connection established');
            return true;
        } catch (error) {
            this.logError('✗ Database connection failed', error.message);
            return false;
        }
    }

    async disconnect() {
        try {
            await this.client.end();
            this.logSuccess('✓ Database connection closed');
        } catch (error) {
            this.logError('✗ Error closing database connection', error.message);
        }
    }

    async validateEmailTemplatesTable() {
        console.log('\n=== Email Templates Validation ===');
        
        try {
            // Check if table exists
            const tableExistsQuery = `
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_name = 'email_templates_emt'
                );
            `;
            
            const tableResult = await this.client.query(tableExistsQuery);
            if (!tableResult.rows[0].exists) {
                this.logError('✗ email_templates_emt table does not exist');
                return false;
            }
            this.logSuccess('✓ email_templates_emt table exists');

            // Check table structure
            const structureQuery = `
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'email_templates_emt'
                ORDER BY ordinal_position;
            `;
            
            const structureResult = await this.client.query(structureQuery);
            this.logInfo(`  → Table has ${structureResult.rows.length} columns`);
            
            // Check for active templates
            const activeTemplatesQuery = `
                SELECT emt_type, emt_is_active, emt_created_date
                FROM email_templates_emt 
                WHERE emt_is_active = true
                ORDER BY emt_type;
            `;
            
            const activeResult = await this.client.query(activeTemplatesQuery);
            if (activeResult.rows.length === 0) {
                this.logWarning('! No active email templates found');
                return false;
            }
            
            this.logSuccess(`✓ Found ${activeResult.rows.length} active email template(s)`);
            activeResult.rows.forEach(row => {
                this.logInfo(`  → ${row.emt_type} (created: ${row.emt_created_date?.toISOString().split('T')[0] || 'N/A'})`);
            });

            return true;

        } catch (error) {
            this.logError('✗ Error validating email_templates_emt', error.message);
            return false;
        }
    }

    async validateAuditLogTable() {
        console.log('\n=== Audit Log Email Validation ===');
        
        try {
            // Check if table exists
            const tableExistsQuery = `
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_name = 'audit_log_aud'
                );
            `;
            
            const tableResult = await this.client.query(tableExistsQuery);
            if (!tableResult.rows[0].exists) {
                this.logError('✗ audit_log_aud table does not exist');
                return false;
            }
            this.logSuccess('✓ audit_log_aud table exists');

            // Check table structure
            const structureQuery = `
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'audit_log_aud'
                ORDER BY ordinal_position;
            `;
            
            const structureResult = await this.client.query(structureQuery);
            this.logInfo(`  → Table has ${structureResult.rows.length} columns`);
            
            // Validate key columns exist for email audit logging
            const requiredColumns = ['aud_id', 'aud_timestamp', 'aud_action', 'aud_entity_type', 'aud_entity_id', 'aud_details'];
            const actualColumns = structureResult.rows.map(row => row.column_name);
            
            let allColumnsExist = true;
            requiredColumns.forEach(col => {
                if (actualColumns.includes(col)) {
                    this.logSuccess(`  ✓ Required column '${col}' exists`);
                } else {
                    this.logError(`  ✗ Required column '${col}' missing`);
                    allColumnsExist = false;
                }
            });

            // Check record count
            const countQuery = 'SELECT COUNT(*) as count FROM audit_log_aud';
            const countResult = await this.client.query(countQuery);
            this.logInfo(`  → Table contains ${countResult.rows[0].count} record(s)`);

            // Check for email-related audit entries
            const emailAuditQuery = `
                SELECT aud_action, aud_entity_type, COUNT(*) as count
                FROM audit_log_aud 
                WHERE aud_entity_type IN ('NOTIFICATION', 'EMAIL') 
                   OR aud_action LIKE '%EMAIL%'
                GROUP BY aud_action, aud_entity_type
                ORDER BY aud_action;
            `;
            
            const emailAuditResult = await this.client.query(emailAuditQuery);
            if (emailAuditResult.rows.length > 0) {
                this.logSuccess(`✓ Found ${emailAuditResult.rows.length} email-related audit entry type(s)`);
                emailAuditResult.rows.forEach(row => {
                    this.logInfo(`  → ${row.aud_action} (${row.aud_entity_type}): ${row.count} record(s)`);
                });
            } else {
                this.logInfo('  → No email-related audit entries found (this is normal for new installations)');
            }

            return allColumnsExist;

        } catch (error) {
            this.logError('✗ Error validating audit_log_aud for email auditing', error.message);
            return false;
        }
    }

    async validateSystemConfigurationTable() {
        console.log('\n=== System Configuration Validation ===');
        
        try {
            // Check if table exists
            const tableExistsQuery = `
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_name = 'system_configuration_scf'
                );
            `;
            
            const tableResult = await this.client.query(tableExistsQuery);
            if (!tableResult.rows[0].exists) {
                this.logError('✗ system_configuration_scf table does not exist');
                return false;
            }
            this.logSuccess('✓ system_configuration_scf table exists');

            // Check for email-related configurations
            const emailConfigQuery = `
                SELECT scf_key, scf_value, scf_is_active 
                FROM system_configuration_scf 
                WHERE scf_key LIKE '%email%' OR scf_key LIKE '%smtp%' OR scf_key LIKE '%stepview%'
                ORDER BY scf_key;
            `;
            
            const configResult = await this.client.query(emailConfigQuery);
            if (configResult.rows.length === 0) {
                this.logWarning('! No email-related configurations found');
                return false;
            }
            
            this.logSuccess(`✓ Found ${configResult.rows.length} email/system configuration(s)`);
            configResult.rows.forEach(row => {
                const status = row.scf_is_active ? 'ACTIVE' : 'INACTIVE';
                this.logInfo(`  → ${row.scf_key}: ${row.scf_value} (${status})`);
            });

            // Specifically check for StepView URL configuration
            const stepViewConfigQuery = `
                SELECT scf_value, scf_is_active 
                FROM system_configuration_scf 
                WHERE scf_key = 'stepview.base.url'
            `;
            
            const stepViewResult = await this.client.query(stepViewConfigQuery);
            if (stepViewResult.rows.length > 0) {
                const config = stepViewResult.rows[0];
                if (config.scf_is_active) {
                    this.logSuccess(`✓ StepView URL configured: ${config.scf_value}`);
                } else {
                    this.logWarning('! StepView URL configuration exists but is inactive');
                }
            } else {
                this.logWarning('! StepView URL configuration not found');
            }

            return true;

        } catch (error) {
            this.logError('✗ Error validating system_configuration_scf', error.message);
            return false;
        }
    }

    async validateEmailInfrastructure() {
        console.log('\n=== Email Infrastructure Health Check ===');
        
        try {
            // Check for any email-related foreign key relationships
            const fkQuery = `
                SELECT 
                    tc.table_name, 
                    kcu.column_name, 
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name 
                FROM 
                    information_schema.table_constraints AS tc 
                    JOIN information_schema.key_column_usage AS kcu
                      ON tc.constraint_name = kcu.constraint_name
                      AND tc.table_schema = kcu.table_schema
                    JOIN information_schema.constraint_column_usage AS ccu
                      ON ccu.constraint_name = tc.constraint_name
                      AND ccu.table_schema = tc.table_schema
                WHERE tc.constraint_type = 'FOREIGN KEY' 
                  AND (tc.table_name LIKE '%email%' OR tc.table_name LIKE '%audit%')
                ORDER BY tc.table_name;
            `;
            
            const fkResult = await this.client.query(fkQuery);
            if (fkResult.rows.length > 0) {
                this.logSuccess(`✓ Found ${fkResult.rows.length} email/audit-related foreign key relationship(s)`);
                fkResult.rows.forEach(row => {
                    this.logInfo(`  → ${row.table_name}.${row.column_name} → ${row.foreign_table_name}.${row.foreign_column_name}`);
                });
            } else {
                this.logInfo('  → No email/audit-related foreign key relationships found');
            }

            return true;

        } catch (error) {
            this.logError('✗ Error checking email infrastructure', error.message);
            return false;
        }
    }

    logSuccess(message) {
        console.log(`\x1b[32m${message}\x1b[0m`);
        this.results.push({ type: 'success', message });
    }

    logError(message, detail = '') {
        console.log(`\x1b[31m${message}\x1b[0m`);
        if (detail) {
            console.log(`  Details: ${detail}`);
        }
        this.results.push({ type: 'error', message, detail });
    }

    logWarning(message) {
        console.log(`\x1b[33m${message}\x1b[0m`);
        this.results.push({ type: 'warning', message });
    }

    logInfo(message) {
        console.log(`\x1b[36m${message}\x1b[0m`);
        this.results.push({ type: 'info', message });
    }

    printSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('                    VALIDATION SUMMARY');
        console.log('='.repeat(60));
        
        const successes = this.results.filter(r => r.type === 'success').length;
        const errors = this.results.filter(r => r.type === 'error').length;
        const warnings = this.results.filter(r => r.type === 'warning').length;
        
        console.log(`✓ Successes: ${successes}`);
        console.log(`✗ Errors: ${errors}`);
        console.log(`! Warnings: ${warnings}`);
        
        if (errors === 0 && warnings === 0) {
            console.log('\n🎉 ALL VALIDATIONS PASSED! Email database tables are properly configured.');
        } else if (errors === 0) {
            console.log('\n⚠️  VALIDATION COMPLETED WITH WARNINGS. Review the warnings above.');
        } else {
            console.log('\n❌ VALIDATION FAILED. Please address the errors above.');
        }
        
        console.log('='.repeat(60));
    }
}

// Main execution
async function main() {
    console.log('🔍 US-039 Enhanced Email Database Validation');
    console.log('='.repeat(60));
    
    const validator = new EmailDatabaseValidator();
    
    try {
        const connected = await validator.connect();
        if (!connected) {
            return process.exit(1);
        }

        await validator.validateEmailTemplatesTable();
        await validator.validateAuditLogTable();
        await validator.validateSystemConfigurationTable();
        await validator.validateEmailInfrastructure();

        await validator.disconnect();
        validator.printSummary();
        
        const errors = validator.results.filter(r => r.type === 'error').length;
        process.exit(errors > 0 ? 1 : 0);
        
    } catch (error) {
        console.error('\n❌ Unexpected error during validation:', error.message);
        await validator.disconnect();
        process.exit(1);
    }
}

// Run the validation
main();

export default EmailDatabaseValidator;