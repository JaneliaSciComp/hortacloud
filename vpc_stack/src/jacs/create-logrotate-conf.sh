#!/bin/bash -xe

backupBucket="$1"
systemsBackupFolder=${2:-"hortacloud/systemlogs"}

echo "remove mlocate job and data"
mv /etc/cron.daily/mlocate /tmp || true
rm -f /var/lib/mlocate/mlocate.db || true

if [[ -z ${backupBucket} ]]; then
    echo "Skip setting up system log rotation"
    exit 0
fi

echo "Create system logs rotate configuration"

mkdir -p /s3data/${backupBucket}/${systemsBackupFolder}

mv /etc/logrotate.d/syslog /tmp || true

cat > /etc/logrotate.d/syslog <<EOF
var/log/cron
/var/log/maillog
/var/log/messages
/var/log/secure
/var/log/spooler
{
    weekly
    rotate 2
    missingok
    sharedscripts
    postrotate
        /bin/kill -HUP `cat /var/run/syslogd.pid 2> /dev/null` 2> /dev/null || true
        # move logs
        mv var/log/cron-???????? /s3data/${backupBucket}/${systemsBackupFolder}
        mv var/log/maillog-???????? /s3data/${backupBucket}/${systemsBackupFolder}
        mv var/log/messages-???????? /s3data/${backupBucket}/${systemsBackupFolder}
        mv var/log/spooler-???????? /s3data/${backupBucket}/${systemsBackupFolder}
    endscript
}
EOF
