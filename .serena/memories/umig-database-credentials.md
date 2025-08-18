# UMIG Database Credentials

**CRITICAL REFERENCE**: Database connection details for UMIG application

## Database Connection Details

- **Host**: localhost (via podman container)
- **Port**: 5432
- **Database Name**: umig_app_db
- **Username**: umig_app_user
- **Password**: 123456
- **Container Access**: `podman exec -it umig-postgres-1 psql -h localhost -U umig_app_user -d umig_app_db`

## Key Tables

- `migrations_mig`: Contains 5 migration records
- `iterations_ite`: Iteration data
- `plans_pli`: Plan instances linked to iterations

## Environment File Location

- **Path**: `/Users/lucaschallamel/Documents/GitHub/UMIG/local-dev-setup/.env`
- Contains complete database configuration including Confluence and UMIG app database settings

## Container Management

- **Service**: umig-postgres-1 (via podman-compose)
- **Access Method**: Use podman exec, NOT local psql connections
- **Status Check**: `podman ps` to verify container is running

This information is critical for debugging database connectivity issues and validating data state during testing.
