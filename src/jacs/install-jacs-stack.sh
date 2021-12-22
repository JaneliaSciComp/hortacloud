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

# Install jacs-cm
DEPLOY_DIR=/data/deploy/jacs-stack
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

chown -R docker-nobody:docker-nobody /opt/jacs
chown -R docker-nobody:docker-nobody /data/deploy

# prepare config file
localip=$(ifconfig eth0 | grep inet | awk '$1=="inet" {print $2}')
cat > /tmp/scmd <<- EOF
    s/DEPLOYMENT=jacs/DEPLOYMENT=mouselight/
    s/DB_DIR=\$REDUNDANT_STORAGE/DB_DIR=\$NON_REDUNDANT_STORAGE/
    s/HOST1=/HOST1=${localip}/
    s/JWT_SECRET_KEY=/JWT_SECRET_KEY=${JWT_KEY}/
    s/MONGODB_SECRET_KEY=/MONGODB_SECRET_KEY=${MONGO_KEY}/
    s/MONGODB_INIT_ROOT_PASSWORD=/MONGODB_INIT_ROOT_PASSWORD=${MONGO_ROOT_PASS}/
    s/MONGODB_APP_PASSWORD=/MONGODB_APP_PASSWORD=${MONGO_APP_PASS}/
EOF

echo "Create env config from .env.template using /tmp/scmd"
sed -f /tmp/scmd .env.template > .env.config

./manage.sh init-local-filesystem
./manage.sh compose up -d
./manage.sh init-databases

echo "Completed JACS stack installation (install-jacs-stack.sh)"
