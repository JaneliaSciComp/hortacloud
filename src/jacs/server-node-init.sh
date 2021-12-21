#!/bin/bash -xe

# Update with optional user data that will run on instance start.
# Learn more about user-data: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html
#
# Output is logged to /var/log/cloud-init-output.log

echo "Initializing server (server-init.sh)..."

# Install dependencies
yum update -y
yum install -y docker git fuse-devel s3fs-fuse

# Enable Docker at Boot, and allow user to run Docker without sudo
service docker start
systemctl enable docker
usermod -aG docker ec2-user

mkfs -t ext4 /dev/sdb
mkdir /data
echo -e '/dev/sdb\t/data\text4\tdefaults\t0\t0' | tee -a /etc/fstab

mount –a

# Create Docker user 
groupadd -g 4444 docker-nobody
useradd --uid 4444 --gid 4444 --shell /sbin/nologin docker-nobody

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.2.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose ; chmod +x /usr/local/bin/docker-compose

# Install jacs-cm
DEPLOY_DIR=/data/deploy/jacs-stack
CONFIG_DIR=/opt/jacs/config
JACS_STACK_BRANCH=docker20

mkdir -p $DEPLOY_DIR
mkdir -p $CONFIG_DIR

cd $DEPLOY_DIR
git clone --branch $JACS_STACK_BRANCH https://github.com/JaneliaSciComp/jacs-cm.git .

echo "Completed initialization (server-init.sh)"
