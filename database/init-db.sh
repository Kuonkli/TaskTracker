#!/bin/bash

echo "PostgreSQL is ready. Executing init script..."

export PGPASSWORD=${POSTGRES_PASSWORD}

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<EOF
DO \$\$
DECLARE
    admin_password text := '${ADMIN_PASSWORD}';
    user_password text := '${USER_PASSWORD}';
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'task_tracker_admin') THEN
        EXECUTE 'CREATE USER task_tracker_admin WITH PASSWORD ' || quote_literal(admin_password) || ' SUPERUSER';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'task_tracker_user') THEN
        EXECUTE 'CREATE USER task_tracker_user WITH PASSWORD ' || quote_literal(user_password);
    END IF;
END \$\$ LANGUAGE plpgsql;

GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO task_tracker_user;
GRANT USAGE ON SCHEMA public TO task_tracker_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO task_tracker_user;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO task_tracker_user;

ALTER DEFAULT PRIVILEGES FOR USER task_tracker_admin IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO task_tracker_user;
ALTER DEFAULT PRIVILEGES FOR USER task_tracker_admin IN SCHEMA public
    GRANT USAGE ON SEQUENCES TO task_tracker_user;
ALTER DEFAULT PRIVILEGES FOR USER ${POSTGRES_USER} IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO task_tracker_user;
ALTER DEFAULT PRIVILEGES FOR USER ${POSTGRES_USER} IN SCHEMA public
    GRANT USAGE ON SEQUENCES TO task_tracker_user;

REVOKE CREATE ON SCHEMA public FROM task_tracker_user;
REVOKE CREATE ON DATABASE ${POSTGRES_DB} FROM task_tracker_user;
REVOKE ALL ON SCHEMA public FROM task_tracker_user;
GRANT USAGE ON SCHEMA public TO task_tracker_user;
EOF

echo "Init completed successfully"
