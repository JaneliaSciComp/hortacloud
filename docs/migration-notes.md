## Update the latest stack

cd /opt/jacs/deploy
git pull


## Backup mongo to an S3 bucket

./manage.sh mongo-backup /s3data/janelia-mouselight-backups-prod/hortacloud/backups/manual-backup

## Deploy another cognito stack (e.g. use a different stage) and enable reading from an existing cognito pool that requires backup

In order to do the before deploying cognito stack set READABLE_POOL_IDS to the pool Id that needs to be saved
.e.g.

READABLE_POOL_IDS=us-east-1_0byNKiLgS


## Define the payload for the backup procedure
cat > payload.json <<EOF
{
  "poolId": "us-east-1_0byNKiLgS",
  "backupBucket": "janelia-mouselight-backups-prod",
  "backupPrefix": "hortacloud/backups/manual-backup/cognito"
}
EOF

## Create a Cognito backup

aws lambda invoke \
    --function-name janelia-hc-cognito-backup-goinac \
    --payload fileb:///opt/jacs/deploy/local/cognito-backup-payload.json  \
    --region us-east-1 \
    /opt/jacs/deploy/local/manual-cognito-backup.json


## Set the restore bucket and restore folder in .env

HORTA_RESTORE_BUCKET="janelia-mouselight-backups-prod"
HORTA_RESTORE_FOLDER="/hortacloud/backups/manual-backup"

## Deploy all stacks - including cognito and set the options to import users
npm run deploy -- -u -r -b janelia-mouselight-backups-prod -f hortacloud/backups/manual-backup/cognito
