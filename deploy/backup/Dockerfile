# Same base as the db, so pg_dump/pg_restore match the server's major (16); rclone talks S3.
FROM imresamu/postgis:16-3.5
RUN apt-get update && apt-get install -y --no-install-recommends rclone ca-certificates && rm -rf /var/lib/apt/lists/*
COPY backup.sh /usr/local/bin/backup.sh
