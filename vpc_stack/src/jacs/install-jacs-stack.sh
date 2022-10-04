#!/bin/bash -xe

# Update with optional user data that will run on instance start.
# Learn more about user-data: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html
#
# Output is logged to /var/log/cloud-init-output.log

echo "Installing JACS Stack (install-jacs-stack.sh)... $@"

ADMIN_USER=$1
shift
JWT_KEY=$1
shift
MONGO_KEY=$1
shift
MONGO_ROOT_PASS=$1
shift
MONGO_APP_PASS=$MONGO_ROOT_PASS
RABBITMQ_PASS=$1
shift
JACS_API_KEY=$1
shift
JADE_API_KEY=$1
shift
SEARCH_MEM_GB=$1
shift
JACS_GIT_BRANCH=stable
if [[ "$1" == "--jacs-git-branch" ]]; then
    JACS_GIT_BRANCH=$2
    shift
    shift
fi
BACKUP_BUCKET=
BACKUP_FOLDER=
if [[ "$1" == "--no-backup" ]]; then
    shift
elif [[ "$1" == "--backup" ]]; then
    BACKUP_BUCKET=$2
    BACKUP_FOLDER=$3
    AWS_REGION=$4
    COGNITO_BACKUP_FUNCTION=$5
    shift
    shift
    shift
    shift
    shift
fi
RESTORE_BUCKET=
RESTORE_FOLDER=
if [[ "$1" == "--no-restore" ]]; then
    shift
elif [[ "$1" == "--restore" ]]; then
    RESTORE_BUCKET=$2
    RESTORE_FOLDER=$3
    shift
    shift
    shift
fi
JADE_DATA_BUCKETS=("$@")
JADE_DATA_BUCKETS_NAMES_WITH_SPACES=${JADE_DATA_BUCKETS[@]}     # space delimited string from array
JADE_DATA_BUCKETS_NAMES_WITH_COMMA=${JADE_DATA_BUCKETS_NAMES_WITH_SPACES// /,}   # comma delimited string

# Install jacs-cm
DEPLOY_DIR=/opt/jacs/deploy
CONFIG_DIR=/opt/jacs/config

mkdir -p $DEPLOY_DIR
mkdir -p $CONFIG_DIR

function prepareFilesystem() {
    local JACS_NR_BASE_DIR=/data
    local JACS_NR_STORAGE_DIRS="\
    ${JACS_NR_BASE_DIR}/db \
    ${JACS_NR_BASE_DIR}/backups \
    ${JACS_NR_BASE_DIR}/jacsstorage \
    ${JACS_NR_BASE_DIR}/elasticsearch"

    for d in ${JACS_NR_STORAGE_DIRS} ; do
        mkdir -p $d;
        chown -R docker-nobody:docker-nobody $d
    done
}

function prepareEnvConfig() {
    # prepare config file
    local CURRENT_HOST="$(wget -qO - http://169.254.169.254/latest/meta-data/public-hostname)"

    if [[ -z ${CURRENT_HOST} ]]; then
        CURRENT_HOST="$(wget -qO - http://169.254.169.254/latest/meta-data/local-hostname)"
    fi

    if [ ${#JADE_DATA_BUCKETS[@]} -eq 0 ] ; then
        JADE_BOOTSTRAPPED_VOLUMES="localstorage"
    else
        JADE_BOOTSTRAPPED_VOLUMES="localstorage,${JADE_DATA_BUCKETS_NAMES_WITH_COMMA}"
    fi

    sedcmds=(
        "s/DEPLOYMENT=jacs/DEPLOYMENT=mouselight/"
        "s/DB_DIR=\$REDUNDANT_STORAGE/DB_DIR=\$NON_REDUNDANT_STORAGE/"
        "s/HOST1=/HOST1=${CURRENT_HOST}/"
        "s/JWT_SECRET_KEY=/JWT_SECRET_KEY=${JWT_KEY}/"
        "s/MONGODB_SECRET_KEY=/MONGODB_SECRET_KEY=${MONGO_KEY}/"
        "s/MONGODB_INIT_ROOT_PASSWORD=/MONGODB_INIT_ROOT_PASSWORD=${MONGO_ROOT_PASS}/"
        "s/MONGODB_APP_PASSWORD=/MONGODB_APP_PASSWORD=${MONGO_APP_PASS}/"
        "s/RABBITMQ_PASSWORD=/RABBITMQ_PASSWORD=${RABBITMQ_PASS}/"
        "s/JADE_AGENT_VOLUMES=.*$/JADE_AGENT_VOLUMES=${JADE_BOOTSTRAPPED_VOLUMES}/"
        "s/JACS_API_KEY=.*$/JACS_API_KEY=${JACS_API_KEY}/"
        "s/JADE_API_KEY=.*$/JADE_API_KEY=${JADE_API_KEY}/"
        "s/SEARCH_INIT_MEM_SIZE=.*$/SEARCH_INIT_MEM_SIZE=${SEARCH_MEM_GB}/"
        "s/SEARCH_MAX_MEM_SIZE=.*$/SEARCH_MAX_MEM_SIZE=${SEARCH_MEM_GB}/"
    )
    printf '%s\n' "${sedcmds[@]}" > /tmp/scmd

    echo "Create env config from .env.template using /tmp/scmd"
    sed -f /tmp/scmd .env.template > .env.config
}

function prepareJacsConfig() {
    local jacsService=$1

    mv /opt/jacs/config/${jacsService}/jacs.properties /opt/jacs/config/${jacsService}/jacs.bak

    local jacsprops=(
        "service.JacsDataDir=/data/jacs"
        "service.DefaultWorkingDir=/data/jacs/devstore"
        "service.DefaultScratchDir=/data/jacs/scratch"

        "service.dispatcher.InitialDelayInSeconds=1"
        "service.dispatcher.PeriodInSeconds=2"
        "service.queue.InitialDelayInSeconds=1"
        "service.queue.PeriodInSeconds=2"
        "service.cluster.checkIntervalInSeconds=2"
        "service.cluster.requiresAccountInfo=false"
    )
    printf '%s\n' "${jacsprops[@]}" > /opt/jacs/config/${jacsService}/jacs.properties
}

function prepareJadeConfig() {
    mv /opt/jacs/config/jade/config.properties /opt/jacs/config/jade/config.bak

    if [ ${#JADE_DATA_BUCKETS[@]} -eq 0 ] ; then
        JADE_BOOTSTRAP="StorageAgent.BootstrappedVolumes=localstorage"
    else
        JADE_BOOTSTRAP="StorageAgent.BootstrappedVolumes=localstorage,${JADE_DATA_BUCKETS_NAMES_WITH_COMMA}"
    fi
    OVERFLOW_ROOT_DIR="/data/jacsstorage/overflow"

    local jadeprops=(
        "MongoDB.Database=jade"
        "MongoDB.AuthDatabase=admin"
        "MongoDB.ReplicaSet=rsJacs"
        "MongoDB.Username="
        "MongoDB.Password="
        "MongoDB.ConnectionWaitQueueSize=5000"
        "MongoDB.ConnectTimeout=120000"
        "${JADE_BOOTSTRAP}"

        "Storage.Email.SenderEmail="
        "Storage.Email.SenderPassword="
        "Storage.Email.AuthRequired=false"
        "Storage.Email.EnableTLS=false"
        "Storage.Email.SMTPHost="
        "Storage.Email.SMTPPort=25"
        "Storage.Email.Recipients="

        "StorageVolume.OVERFLOW_VOLUME.RootDir=${OVERFLOW_ROOT_DIR}/${username}"
        "StorageVolume.OVERFLOW_VOLUME.VirtualPath=/overflow/jade"
        "StorageVolume.OVERFLOW_VOLUME.Tags=jade,overflow,includesUserFolder"
        "StorageVolume.OVERFLOW_VOLUME.VolumePermissions=READ,WRITE,DELETE"

        "StorageVolume.localstorage.RootDir=/data/jacsstorage"
        "StorageVolume.localstorage.VirtualPath=/jade"
        "StorageVolume.localstorage.Shared=false"
        "StorageVolume.localstorage.Tags=local,jade"
        "StorageVolume.localstorage.VolumePermissions=READ,WRITE,DELETE"
    )

    for dataBucketName in ${JADE_DATA_BUCKETS[@]}; do
        local dataBucketVolProps=(
            "StorageVolume.${dataBucketName}.RootDir=/s3data/${dataBucketName}"
            "StorageVolume.${dataBucketName}.VirtualPath=/${dataBucketName}"
            "StorageVolume.${dataBucketName}.Shared=true"
            "StorageVolume.${dataBucketName}.Tags=shared"
            "StorageVolume.${dataBucketName}.VolumePermissions=READ,WRITE,DELETE"
        )
        jadeprops=("${jadeprops[@]}" "${dataBucketVolProps[@]}")
    done

    printf '%s\n' "${jadeprops[@]}" > /opt/jacs/config/jade/config.properties
}

function prepareJadeVolumesYML() {
    local jade_vols_yml=(
        "version: '3.7'"
        ""
        "services:"
        ""
        "  jade-agent1:"
        "    volumes:"
        "      - /s3data:/s3data"
    )

    mkdir -p ${DEPLOY_DIR}/local
    printf '%s\n' "${jade_vols_yml[@]}" > ${DEPLOY_DIR}/local/docker-jade-volumes.yml
}

function createAdminUser() {
    local admin_user_json=(
        "{"
        "  \"class\" : \"org.janelia.model.security.User\","
        "  \"key\": \"user:${ADMIN_USER}\","
        "  \"name\": \"${ADMIN_USER}\","
        "  \"fullName\": \"Administrator\","
        "  \"email\": \"${ADMIN_USER}\","
        "  \"password\": \"\","
        "  \"userGroupRoles\": ["
        "    {"
        "      \"groupKey\": \"group:admin\","
        "      \"role\": \"Admin\""
        "    },"
        "    {"
        "      \"groupKey\": \"group:mouselight\","
        "      \"role\": \"Admin\""
        "    }"
        "  ]"
        "}"
    )

    mkdir -p ${DEPLOY_DIR}/local
    printf '%s\n' "${admin_user_json[@]}" > ${DEPLOY_DIR}/local/admin_user.json

    echo "Create admin user ${ADMIN_USER} from $(cat ${DEPLOY_DIR}/local/admin_user.json)"
    ./manage.sh createUserFromJson ${DEPLOY_DIR}/local/admin_user.json
}

function createScheduledJobs() {
    local scheduled_jobs_json=(
        "{"
        "    \"_id\" : { \"\$numberLong\": \"2736342547164094475\" }, "
        "    \"name\": \"FullSolrReindex\", "
        "    \"serviceName\": \"solrIndexBuilder\", "
        "    \"ownerKey\" : \"user:root\", "
        "    \"serviceArgs\" : [ "
        "       \"-clearIndex\" "
        "    ], "
        "    \"cronScheduleDescriptor\": \"40 1 * * *\", "
        "    \"entityName\" : \"JacsScheduledServiceData\" "
        "}"
        "{"
        "    \"_id\": { \"\$numberLong\": \"2736342547164102667\" }, "
        "    \"name\" : \"DBMaintenance\", "
        "    \"serviceName\" : \"dbMaintenance\", "
        "    \"ownerKey\" : \"user:root\", "
        "    \"serviceArgs\" : [ "
        "       \"-refreshTmSampleSync\", "
        "       \"-refreshPermissions\", "
        "       \"-refreshIndexes\" "
        "    ], "
        "    \"cronScheduleDescriptor\" : \"0 23 * * *\", "
        "    \"entityName\" : \"JacsScheduledServiceData\" "
        "}"
    )

    mkdir -p ${DEPLOY_DIR}/local
    printf '%s\n' "${scheduled_jobs_json[@]}" > ${DEPLOY_DIR}/local/scheduled_jobs.json

    echo "Create scheduled jobs from $(cat ${DEPLOY_DIR}/local/scheduled_jobs.json)"
    ./manage.sh mongo \
    -tool mongoimport \
    -notty -run-opts "-v ${DEPLOY_DIR}/local:/local" \
    --collection jacsScheduledService /local/scheduled_jobs.json
}

function backupSystemConfig() {
    local installDate=$(date +%Y%m%d%H%M%S)
    local installConfigBackupDir="/s3data/${BACKUP_BUCKET}${BACKUP_FOLDER}/installs/${installDate}"
    echo "Backup system configuration to ${installConfigBackupDir}"
    mkdir -p ${installConfigBackupDir}
    cp -a ${CONFIG_DIR} ${installConfigBackupDir}
    cp "${DEPLOY_DIR}/.env.config" "${installConfigBackupDir}/env.config"
    chmod -R g-rwx,o-rwx ${installConfigBackupDir}
}

function createBackupJob() {
    if [[ -n ${BACKUP_BUCKET} ]]; then
        # backup current system config
        backupSystemConfig

        mkdir -p ${DEPLOY_DIR}/local

        local backup_rotate_config=(
            "[/s3data/${BACKUP_BUCKET}${BACKUP_FOLDER}]"
            "daily = 7"
            "weekly = 4 * 2"
            "monthly = 12"
            "yearly = always"
            "ionice = idle"
        )
        printf '%s\n' "${backup_rotate_config[@]}" > ${DEPLOY_DIR}/local/rotate-backups.ini

        # create a cronjob to backup mongo regularly
        echo "Create backup job to /s3data/${BACKUP_BUCKET}${BACKUP_FOLDER}"

        local backup_script=(
            "#!/bin/sh"
            "cd ${DEPLOY_DIR}"
            "current_date=\$(date +%Y%m%d%H%M%S)"
            "backup_location=${BACKUP_FOLDER}/\${current_date}"
            "backup_data=\"{ \
                \\\"backupBucket\\\": \\\"${BACKUP_BUCKET}\\\", \
                \\\"backupPrefix\\\": \\\"\${backup_location}/cognito\\\" \
            }\""
            "./manage.sh mongo-backup /s3data/${BACKUP_BUCKET}\${backup_location} > ${DEPLOY_DIR}/local/latest-backup.log 2>&1"
            "echo \"\${backup_data}\" > ${DEPLOY_DIR}/local/cognito-backup-input.json"
            "aws lambda invoke \
            --function-name ${COGNITO_BACKUP_FUNCTION} \
            --payload fileb://${DEPLOY_DIR}/local/cognito-backup-input.json \
            --region ${AWS_REGION} \
            ${DEPLOY_DIR}/local/latest-cognito-backup.json"
            "cd /s3data/${BACKUP_BUCKET}/${BACKUP_FOLDER}"
            "rm -f latest"
            "ln -s \${current_date} latest"
            "echo 'run backup rotation'"
            "/usr/local/bin/rotate-backups -c ${DEPLOY_DIR}/local/rotate-backups.ini >> ${DEPLOY_DIR}/local/latest-backup.log 2>&1"
        )
        # create the script
        printf '%s\n' "${backup_script[@]}" > ${DEPLOY_DIR}/local/run-backup.sh
        # allow exec
        chmod 755 ${DEPLOY_DIR}/local/run-backup.sh
        # cron job entry - run this at 3AM
        local cron_job_entry=(
            "SHELL=/bin/bash"
            "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
            "0 3 * * * root ${DEPLOY_DIR}/local/run-backup.sh"
        )
        # create the cronjob
        printf '%s\n' "${cron_job_entry[@]}" > /etc/cron.d/jacs-backup
    fi
}

function restoreDatabase() {
    echo "Restore database from /s3data/${RESTORE_BUCKET}${RESTORE_FOLDER}/jacs"
    # drop the treeNode so that the workspace and treeNode entries get restored with the previous IDs
    ./manage.sh mongo -notty --eval "db.treeNode.drop()"
    ./manage.sh mongo-restore "/s3data/${RESTORE_BUCKET}${RESTORE_FOLDER}/jacs"
}

prepareFilesystem

cd $DEPLOY_DIR
git clone --branch $JACS_GIT_BRANCH https://github.com/JaneliaSciComp/jacs-cm.git .

prepareEnvConfig

prepareJadeVolumesYML

# change the ownership of the comfig base so that
# the initialization step has permissions to write there
chown -R docker-nobody:docker-nobody /opt/jacs

# initialize jacs config
./manage.sh init-local-filesystem
# copy the cert to the external location
cp /opt/jacs/config/certs/cert.crt /opt/jacs/config/api-gateway/content

chown -R docker-nobody:docker-nobody /opt/jacs/config

prepareJacsConfig jacs-async
prepareJacsConfig jacs-sync
prepareJadeConfig

# pull db images
time ./manage.sh compose pull

echo "Start services for database setup"
time ./manage.sh compose up -d
./manage.sh compose ps

time ./manage.sh init-databases

sleep 90

# bounce it again after the databases have been initialized
echo "Bounce services"
./manage.sh compose down || true
sleep 10
# bring up all services
echo "Start up all services"
./manage.sh compose up -d
# sleep for 30s to give time to the service to start
sleep 30
./manage.sh compose ps
./manage.sh compose logs

# create scheduled jobs
createScheduledJobs

restore_data_folder="/s3data/${RESTORE_BUCKET}${RESTORE_FOLDER}/jacs"
echo "Check restore bucket -> ${RESTORE_BUCKET} and restore folder -> ${restore_data_folder}"
if [[ -n "${RESTORE_BUCKET}" && -e "${restore_data_folder}" ]]; then
    # if the restore folder was specified and if it exists restore database 
    # because some groups have already been created there will some clash but that is acceptable
    restoreDatabase
else
    # create admin user only if we are not restoring a previous database
    createAdminUser
fi

# create the backup job
createBackupJob

echo "Completed JACS stack installation (install-jacs-stack.sh)"
