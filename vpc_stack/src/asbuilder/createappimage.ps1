$ProjectTagValue = "MouseLight"

$AppName = "HortaWorkstation"
$AppPath = "C:\apps\runJaneliaWorkstation.ps1"
$AppWorkingPath = "C:\apps\JaneliaWorkstation"

$PSLauncher = " C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe"
$Params = "--name `"$AppName`" "
$Params += "--absolute-app-path `"$PSLauncher`" "
$Params += "--display-name `"Horta Workstation`" "
$Params += "--working-directory  $AppWorkingPath "
$Params += "--launch-parameters $AppPath "

# add application
$AddAppCMD = "image-assistant.exe add-application $Params"
$AddApp = Invoke-Expression  $AddAppCMD | ConvertFrom-Json
if ($AddApp.status -eq 0) {
    Write-Host "Added $AppName"
} else {
    Write-Host "ERROR adding $AppName" 
    Write-Host $AddApp.message
}

$IBName = (get-item env:AppStream_Resource_Name).Value
$IBNameComps = $IBName.split('-')
$StageTagValue = $IBNameComps[$IBNameComps.length-1]

$ImageName = $IBName.replace('image-builder','HortaCloudWorkstation')
Write-Output "Create image $ImageName"
$CreateParams = "--name $ImageName --display-name `"Horta Workstation`" "
$CreateParams += "--tags PROJECT $ProjectTagValue STAGE $StageTagValue "
$CreateCMD = "image-assistant.exe create-image $CreateParams "

$Create = Invoke-Expression $CreateCMD | ConvertFrom-Json
if ($Create.status -eq 0) {
    Write-Host "Successfully started creating image $ImageName"
} else {
    Write-Host "ERROR creating Image $ImageName"
    Write-Host "$Create.message"
}
