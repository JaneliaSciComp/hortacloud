#!/bin/bash -xe

# Update with optional user data that will run on instance start.
# Learn more about user-data: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html
#
# Output is logged to /var/log/cloud-init-output.log

echo "Initializing server (server-init.sh)... $@"

dataBucketName=$1

# Install dependencies
yum update -y
amazon-linux-extras install -y epel
yum install -y docker git fuse-devel s3fs-fuse

mkfs -t ext4 /dev/xvdb
mkdir /data
echo -e '/dev/xvdb\t/data\text4\tdefaults\t0\t0' | tee -a /etc/fstab
mkdir /s3data
chmod 777 /s3data

if [ -n "${dataBucketName}" ] ; then
    # if the data bucket name is set mount it using s3fs
    echo -e "${dataBucketName}\t/s3data\tfuse.s3fs\t_netdev,iam_role=auto,allow_other,use_path_request_style,umask=0000\t0\t0" | tee -a /etc/fstab
else
    echo "No databucket name"
fi

mount -a

usermod -aG docker ec2-user

# Create Docker user 
groupadd -g 4444 docker-nobody
useradd --uid 4444 --gid 4444 --shell /sbin/nologin docker-nobody

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.2.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose ; chmod +x /usr/local/bin/docker-compose

cp /etc/sysconfig/docker-storage /etc/sysconfig/docker-storage.bak
sed s/^DOCKER_STORAGE_OPTIONS=.*/DOCKER_STORAGE_OPTIONS="\"-g \\/data\\/docker\""/ \
    /etc/sysconfig/docker-storage.bak > /etc/sysconfig/docker-storage

# Enable Docker at Boot, and allow user to run Docker without sudo
systemctl enable docker
systemctl start docker

echo "Completed initialization (server-init.sh)"
