#!/bin/bash -xe

# Update with optional user data that will run on instance start.
# Learn more about user-data: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html
#
# Output is logged to /var/log/cloud-init-output.log

echo "Initializing server (server-init.sh)..."

# Install dependencies
yum update -y
yum install -y docker git

# Enable Docker at Boot, and allow user to run Docker without sudo
service docker start
sudo systemctl enable docker
usermod -aG docker ec2-user
usermod -aG docker ssm-user

# Create Docker user 
sudo groupadd -g 4444 docker-nobody
sudo useradd --uid 4444 --gid 4444 --shell /sbin/nologin docker-nobody

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose ; chmod +x /usr/local/bin/docker-compose

echo "Completed initialization (server-init.sh)"