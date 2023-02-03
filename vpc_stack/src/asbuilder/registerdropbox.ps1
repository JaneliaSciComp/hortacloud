$ProjectTagValue = "MouseLight"

$AppName = "Dropbox"
$AppPath = "C:\Program Files (x86)\Dropbox\Client"
$AppExeName = "Dropbox.exe"

$Params = "--name `"$AppName`" "
$Params += "--absolute-app-path `"$AppPath/$AppExeName`" "
$Params += "--display-name `"Dropbox`" "
$Params += "--working-directory  `"$AppPath`" "
$Params += "--launch-parameters `"/home`" "

$ImageAssistantPath = "C:\Program Files\Amazon\Photon\ConsoleImageBuilder"
$env:PATH += ";$ImageAssistantPath"
$ImageAssistant = "image-assistant.exe"

# add application
$AddAppCMD = "$ImageAssistant add-application $Params"
Write-Output "Add application command: $AddAppCMD"

$AddApp = Invoke-Expression  $AddAppCMD | ConvertFrom-Json
if ($AddApp.status -eq 0) {
    Write-Host "Added $AppName"
} else {
    Write-Host "ERROR adding $AppName"
    Write-Host $AddApp.message
}
