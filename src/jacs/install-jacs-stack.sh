#!/bin/bash -xe

# Update with optional user data that will run on instance start.
# Learn more about user-data: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html
#
# Output is logged to /var/log/cloud-init-output.log

echo "Installing JACS Stack (install-jacs-stack.sh)... $@"

JWT_KEY=$1
MONGO_KEY=$2
MONGO_ROOT_PASS=$3
MONGO_APP_PASS=$MONGO_ROOT_PASS
RABBITMQ_PASS=$4
JACS_API_KEY=$5
JADE_API_KEY=$6
SEARCH_MEM_GB=$7

# Install jacs-cm
DEPLOY_DIR=/opt/jacs/deploy
CONFIG_DIR=/opt/jacs/config
JACS_STACK_BRANCH=docker20

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

    sedcmds=(
        "s/DEPLOYMENT=jacs/DEPLOYMENT=mouselight/"
        "s/DB_DIR=\$REDUNDANT_STORAGE/DB_DIR=\$NON_REDUNDANT_STORAGE/"
        "s/HOST1=/HOST1=${CURRENT_HOST}/"
        "s/JWT_SECRET_KEY=/JWT_SECRET_KEY=${JWT_KEY}/"
        "s/MONGODB_SECRET_KEY=/MONGODB_SECRET_KEY=${MONGO_KEY}/"
        "s/MONGODB_INIT_ROOT_PASSWORD=/MONGODB_INIT_ROOT_PASSWORD=${MONGO_ROOT_PASS}/"
        "s/MONGODB_APP_PASSWORD=/MONGODB_APP_PASSWORD=${MONGO_APP_PASS}/"
        "s/RABBITMQ_PASSWORD=/RABBITMQ_PASSWORD=${RABBITMQ_PASS}/"
        "s/JADE_AGENT_VOLUMES=.*$/JADE_AGENT_VOLUMES=localstorage,s3storage/"
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

    local jadeprops=(
        "MongoDB.Database=jade"
        "MongoDB.AuthDatabase=admin"
        "MongoDB.ReplicaSet=rsJacs"
        "MongoDB.Username="
        "MongoDB.Password="
        "MongoDB.ConnectionWaitQueueSize=5000"
        "MongoDB.ConnectTimeout=120000"

        "StorageVolume.localstorage.RootDir=/data/jacsstorage"
        "StorageVolume.localstorage.VirtualPath=/jade"
        "StorageVolume.localstorage.Shared=false"
        "StorageVolume.localstorage.Tags=local,jade"
        "StorageVolume.localstorage.VolumePermissions=READ,WRITE,DELETE"

        "StorageVolume.s3storage.RootDir=/s3data"
        "StorageVolume.s3storage.VirtualPath=/s3jade"
        "StorageVolume.s3storage.Shared=true"
        "StorageVolume.s3storage.Tags=shared"
        "StorageVolume.s3storage.VolumePermissions=READ,WRITE,DELETE"

        "StorageVolume.OVERFLOW_VOLUME.RootDir=/s3data/jade_overflow/${username}"
        "StorageVolume.OVERFLOW_VOLUME.VirtualPath=/overflow/jade"
        "StorageVolume.OVERFLOW_VOLUME.Tags=jade,overflow,includesUserFolder"
        "StorageVolume.OVERFLOW_VOLUME.VolumePermissions=READ,WRITE,DELETE"

        "Storage.Email.SenderEmail="
        "Storage.Email.SenderPassword="
        "Storage.Email.AuthRequired=false"
        "Storage.Email.EnableTLS=false"
        "Storage.Email.SMTPHost="
        "Storage.Email.SMTPPort=25"
        "Storage.Email.Recipients="
    )
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
        ""
        "  jacs-async:"
        "    volumes:"
        "      - /s3data:/s3data"
    )

    mkdir -p ${DEPLOY_DIR}/local
    printf '%s\n' "${jade_vols_yml[@]}" > ${DEPLOY_DIR}/local/docker-jade-volumes.yml

}

function waitForRabbitMQ() {
    local rabbitmq_retries=0
    local rabbitmq_running=

    echo "Wait for RabbitMQ"
    while [ ${rabbitmq_retries} -lt 10 ] ; do
        rabbitmq_running=`./manage.sh compose logs | grep "Management plugin started. Port: 15672"`
        if [[ -n "${rabbitmq_running}" ]]; then
            break
        fi
        sleep 5
        ((rabbitmq_retries++))
    done

    if [ -z "${rabbitmq_running}" ] ; then
        echo "RabbitMQ might not be initialized properly"
    else
        echo "RabbitMQ started"
    fi
}

prepareFilesystem

cd $DEPLOY_DIR
git clone --branch $JACS_STACK_BRANCH https://github.com/JaneliaSciComp/jacs-cm.git .

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
./manage.sh compose pull --dbonly

./manage.sh compose up --dbonly -d
./manage.sh compose ps

./manage.sh init-databases

# bounce it again after the databases have been initialized
./manage.sh compose down
# bring up all services
./manage.sh compose up -d

echo "Completed JACS stack installation (install-jacs-stack.sh)"
