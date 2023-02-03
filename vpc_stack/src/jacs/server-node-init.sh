#!/bin/bash -xe

# Update with optional user data that will run on instance start.
# Learn more about user-data: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html
#
# Output is logged to /var/log/cloud-init-output.log

echo "Initializing server (server-init.sh)... $@"

dataBucketNames=("$@")

# Install dependencies
yum update -y
amazon-linux-extras install -y epel
yum install -y docker git fuse-devel s3fs-fuse python3-pip

pip3 install rotate-backups

mkfs -t ext4 /dev/xvdb
mkdir /data
echo -e '/dev/xvdb\t/data\text4\tdefaults\t0\t0' | tee -a /etc/fstab
mkdir "/s3data"
chmod 777 "/s3data"

if [ ${#dataBucketNames[@]} -eq 0 ] ; then
    echo "No databucket name"
else
    # if the data bucket names are set mount them using s3fs
    for dataBucketName in ${dataBucketNames[@]}; do
        mkdir -p "/s3data/${dataBucketName}"
        chmod 777 "/s3data/${dataBucketName}"
        echo -e "${dataBucketName}\t/s3data/${dataBucketName}\tfuse.s3fs\t_netdev,iam_role=auto,allow_other,multireq_max=5,umask=0000\t0\t0" | tee -a /etc/fstab
    done
fi

mount -a

usermod -aG docker ec2-user
# do not fail if ssm-user already exists
useradd -d /home/ssm-user -s /bin/bash ssm-user || true
usermod -aG docker ssm-user

# give ssm-user sudo
echo "ssm-user ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/ssm-agent-users

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
