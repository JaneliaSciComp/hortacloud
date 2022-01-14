#!/bin/bash -xe

# Update with optional user data that will run on instance start.
# Learn more about user-data: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html
#
# Output is logged to /var/log/cloud-init-output.log

echo "Cleanup user data"

# remove user data script
rm -rf /var/lib/cloud/instance/scripts/*

echo "Completed user data cleanup"
