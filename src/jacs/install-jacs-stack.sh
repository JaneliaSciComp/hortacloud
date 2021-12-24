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

JACS_NR_BASE_DIR=/data
JACS_NR_STORAGE_DIRS="\
${JACS_NR_BASE_DIR}/db \
${JACS_NR_BASE_DIR}/backups \
${JACS_NR_BASE_DIR}/jacsstorage \
${JACS_NR_BASE_DIR}/elasticsearch"

for d in ${JACS_NR_STORAGE_DIRS} ; do
    mkdir -p $d;
    chown -R docker-nobody:docker-nobody $d
done

cd $DEPLOY_DIR
git clone --branch $JACS_STACK_BRANCH https://github.com/JaneliaSciComp/jacs-cm.git .

# prepare config file
CURRENT_HOST="$(wget -qO - http://169.254.169.254/latest/meta-data/public-hostname)"

if [[ -z ${CURRENT_HOST} ]]; then
    CURRENT_HOST="$(wget -qO - http://169.254.169.254/latest/meta-data/local-hostname)"
fi

cat > /tmp/scmd <<- EOF
    s/DEPLOYMENT=jacs/DEPLOYMENT=mouselight/
    s/DB_DIR=\$REDUNDANT_STORAGE/DB_DIR=\$NON_REDUNDANT_STORAGE/
    s/HOST1=/HOST1=${CURRENT_HOST}/
    s/JWT_SECRET_KEY=/JWT_SECRET_KEY=${JWT_KEY}/
    s/MONGODB_SECRET_KEY=/MONGODB_SECRET_KEY=${MONGO_KEY}/
    s/MONGODB_INIT_ROOT_PASSWORD=/MONGODB_INIT_ROOT_PASSWORD=${MONGO_ROOT_PASS}/
    s/MONGODB_APP_PASSWORD=/MONGODB_APP_PASSWORD=${MONGO_APP_PASS}/
    s/RABBITMQ_PASSWORD=/RABBITMQ_PASSWORD=${RABBITMQ_PASS}/
    s/JACS_API_KEY=.*$/JACS_API_KEY=${JACS_API_KEY}/
    s/JADE_API_KEY=.*$/JADE_API_KEY=${JADE_API_KEY}/
    s/SEARCH_INIT_MEM_SIZE=.*$/SEARCH_INIT_MEM_SIZE=${SEARCH_MEM_GB}/
    s/SEARCH_MAX_MEM_SIZE=.*$/SEARCH_MAX_MEM_SIZE=${SEARCH_MEM_GB}/
EOF

echo "Create env config from .env.template using /tmp/scmd"
sed -f /tmp/scmd .env.template > .env.config

# change the ownership of the comfig base so that
# the initialization step has permissions to write there
chown -R docker-nobody:docker-nobody /opt/jacs

# initialize jacs config
./manage.sh init-local-filesystem
# copy the cert to the external location
cp /opt/jacs/config/certs/cert.crt /opt/jacs/config/api-gateway/content

chown -R docker-nobody:docker-nobody /opt/jacs/config

./manage.sh compose up -d
# initialize all databases
./manage.sh init-databases

echo "Completed JACS stack installation (install-jacs-stack.sh)"
