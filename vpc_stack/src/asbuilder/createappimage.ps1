$ProjectTagValue = "MouseLight"

$AppName = "HortaWorkstation"
$AppFolderName = "Horta"
$AppPath = "C:\apps\runJaneliaWorkstation.ps1"
$AppIcon = "C:\apps\jws-icon.png"
$AppWorkingPath = "C:\apps\$AppFolderName"

$PSLauncher = " C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe"
$Params = "--name `"$AppName`" "
$Params += "--absolute-app-path `"$PSLauncher`" "
$Params += "--absolute-icon-path `"$AppIcon`" "
$Params += "--display-name `"Horta`" "
$Params += "--working-directory  $AppWorkingPath "
$Params += "--launch-parameters $AppPath "

$ImageAssistantPath = "C:\Program Files\Amazon\Photon\ConsoleImageBuilder"
$env:PATH += ";$ImageAssistantPath"
$ImageAssistant = "image-assistant.exe"

if ($args[0] -eq "--skip-registration") {
    Write-Output "Skip app registration"
} else {
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
}

$IBName = (get-item env:AppStream_Resource_Name).Value
$IBNameComps = $IBName.split('-')
$StageTagValue = $IBNameComps[$IBNameComps.length-1]

$ImageName = $IBName.replace('image-builder','HortaCloudWorkstation')
Write-Output "Create image $ImageName"
$CreateParams = "--name $ImageName --display-name `"Horta Workstation`" "
$CreateParams += "--tags PROJECT $ProjectTagValue STAGE $StageTagValue "
$CreateCMD = "$ImageAssistant create-image $CreateParams "

$Create = Invoke-Expression $CreateCMD | ConvertFrom-Json
if ($Create.status -eq 0) {
    Write-Host "Successfully started creating image $ImageName"
} else {
    Write-Host "ERROR creating Image $ImageName"
    Write-Host "$Create.message"
}
