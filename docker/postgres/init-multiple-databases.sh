#!/bin/sh
set -e

create_database() {
	database=$1
	echo "Checking and creating database '$database' if not exists..."
	psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" -d postgres <<-EOSQL
	    SELECT 'CREATE DATABASE $database'
	    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$database')\gexec
	    GRANT ALL PRIVILEGES ON DATABASE $database TO "$POSTGRES_USER";
EOSQL
}

if [ -n "$POSTGRES_MULTIPLE_DATABASES" ]; then
	echo "Multiple database initialization: $POSTGRES_MULTIPLE_DATABASES"
	for db in $(echo $POSTGRES_MULTIPLE_DATABASES | tr ',' ' '); do
		create_database "$db"
	done
	echo "All specified databases are ready."
fi
