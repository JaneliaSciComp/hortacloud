$ServerIP = $args[0]
Write-Output "Use $ServerIP"

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

add-type @"
    using System.Net;
    using System.Security.Cryptography.X509Certificates;
    public class TrustAllCertsPolicy : ICertificatePolicy {
        public bool CheckValidationResult(
            ServicePoint srvPoint, X509Certificate certificate,
            WebRequest request, int certificateProblem) {
            return true;
        }
    }
"@

[System.Net.ServicePointManager]::CertificatePolicy = New-Object TrustAllCertsPolicy

Write-Output "Download scoop"
Invoke-Expression (New-Object System.Net.WebClient).DownloadString("https://get.scoop.sh")
Set-ExecutionPolicy unrestricted -s cu -f

Write-Output "Begin tool installation"
scoop install sudo
sudo scoop install git -g
sudo scoop bucket add java
sudo scoop install zulu8-jdk -g
$env:JAVA_HOME = "$env:SystemDrive\ProgramData\scoop\apps\zulu8-jdk\current"

$TmpDir = "$env:HOMEPATH\Downloads"

$ProgressPreference = "SilentlyContinue"
$AppFolderName = "Horta"
$AppExeName = "horta"
$AppIconName = "horta48"

Write-Output "Download certificate"
Invoke-WebRequest -Uri "https://$ServerIP/SCSW/cert.crt" -OutFile $TmpDir\cert.crt

Write-Output "Install certificate"
sudo $env:JAVA_HOME\bin\keytool.exe -import -noprompt -alias mouse1selfcert -file $TmpDir\cert.crt -keystore "$env:JAVA_HOME\jre\lib\security\cacerts" -keypass changeit -storepass changeit

Invoke-WebRequest -Uri https://$ServerIP/files/$AppFolderName-windows.exe -OutFile $TmpDir\jws-installer.exe
Invoke-WebRequest -Uri https://$ServerIP/files/$AppIconName.png -OutFile $TmpDir\jws-icon.png
Invoke-WebRequest -Uri "https://$ServerIP/SCSW/downloads/blosc.zip" -OutFile $TmpDir\blosc.zip

$vc2010RedistDownloadLink = "https://download.microsoft.com/download/1/6/5/165255E7-1014-4D0A-B094-B6A430A6BFFC/vcredist_x64.exe"
$vc2010RedistPackage = "vc2010_redist.x64.exe"
$vc2010RedistInstallFlags = "/passive /norestart"

Invoke-WebRequest -Uri $vc2010RedistDownloadLink -OutFile "$TmpDir\$vc2010RedistPackage"
Start-Process -Wait -FilePath "$TmpDir\$vc2010RedistPackage" -ArgumentList $vc2010RedistInstallFlags

$InstallerStateContent = @"
<state xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="state-file.xsd">
    <components>
        <product platform="generic" status="to-be-installed" uid="workstation" version="1.0.0.0.0">
            <properties>
                <property name="installation.location">`$N{install}/Horta</property>
                <property name="create.desktop.shortcut">true</property>
                <property name="desktop.shortcut.location">all.users</property>
                <property name="installation.location.windows">C:\apps\$AppFolderName</property>
                <property name="create.start.menu.shortcut">false</property>
                <property name="installation.location.macosx">`$N{install}/$AppFolderName.app</property>
            </properties>
        </product>
    </components>
</state>
"@

$InstallerStateName = "$TmpDir\jws-installer.xml"
New-Item -Path $InstallerStateName -Force | Out-Null
Set-Content $InstallerStateName "$InstallerStateContent"

Start-Process -Wait -FilePath $TmpDir\jws-installer.exe -ArgumentList "--silent --state $InstallerStateName"

$WSInstallDir = "C:\apps\$AppFolderName"
Copy-Item $TmpDir\jws-icon.png "C:\apps" -Force

New-Item -Path "C:\apps\blosc" -ItemType Directory -Force | Out-Null
Expand-Archive -LiteralPath "$TmpDir\blosc.zip" -DestinationPath "C:\apps\blosc"
$env:Path += [IO.Path]::PathSeparator + "C:\apps\blosc"

# -------------------------------
# DCV Latency Script (NEW)
# -------------------------------

$DcvLatencyContent = @"
# DCV Client Round Trip Latency Logger
`$SessionId = `$env:APPSTREAM_SESSION_ID
if (-not `$SessionId) { `$SessionId = "`$env:COMPUTERNAME-`$env:USERNAME" }

`$HomeDir = Join-Path `$env:USERPROFILE "My Files\Home Folder"
`$LogFile = Join-Path `$HomeDir "dcv_latency.log"
`$CounterPath = "\DCV Server\Round-Trip Time ms"

"`$(Get-Date -Format o) SESSION_START SessionId=`$SessionId" | Out-File -Append -Encoding UTF8 `$LogFile

while (`$true) {
    try {
        `$v = (Get-Counter `$CounterPath).CounterSamples[0].CookedValue
        "`$(Get-Date -Format o) RTT_MS=`$([math]::Round(`$v)) SessionId=`$SessionId" | Out-File -Append -Encoding UTF8 `$LogFile
    } catch {
        "`$(Get-Date -Format o) DCV_COUNTER_NOT_READY" | Out-File -Append -Encoding UTF8 `$LogFile
    }
    Start-Sleep -Seconds 10
}
"@

Set-Content "C:\apps\monitorDcvLatency.ps1" $DcvLatencyContent -Encoding UTF8

# -------------------------------
# runJaneliaWorkstation.ps1 (MINIMAL ADD)
# -------------------------------

$RunScriptContent = @"
Start-Process powershell.exe -WindowStyle Hidden -ArgumentList '-ExecutionPolicy Bypass -File C:\apps\monitorDcvLatency.ps1'

# Set API Gateway
`$ApiGateway = "$ServerIP"
`$WSInstallDir = "$WSInstallDir"
`$JavaDir = `$env:JAVA_HOME

`$UserName = `$env:AppStream_UserName
`$WindowsUserName = `$env:USERNAME
`$DataDir = "C:\Users\`$WindowsUserName"

`$WSArgs = "--jdkhome `$JavaDir "
`$WSArgs += "-J``"-Dapi.gateway=https://`$ApiGateway``" "

if (!`$UserName) {
    `$UserDir = `$DataDir
    `$WSArgs += "-J``"-Duser.home=`$UserDir``" "
} else {
    `$UserDir = "`$DataDir\`$UserName"
    `$WSArgs += "-J``"-Duser.home=`$UserDir``" "
    `$WSArgs += "-J``"-Dconsole.serverLogin=`$UserName``" "
    `$WSArgs += "-J``"-Dconsole.rememberPassword=true``" "
    `$WSArgs += "-J``"-DSessionMgr.ShowReleaseNotes=false``" "
    `$WSArgs += "-J``"-DLogin.Disabled=true``" "
}

if (!(Get-Item -Path `$UserDir -ErrorAction Ignore)) {
    New-Item `$UserDir -ItemType Directory
}

`$env:Path += [IO.Path]::PathSeparator + "C:\apps\blosc"

Start-Process -Wait -FilePath $WSInstallDir\bin\$AppExeName -ArgumentList `$WSArgs
"@

Set-Content "C:\apps\runJaneliaWorkstation.ps1" "$RunScriptContent"

