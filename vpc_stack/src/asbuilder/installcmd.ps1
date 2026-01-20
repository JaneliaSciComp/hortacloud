$ServerIP = $args[0]
Write-Output "Use $ServerIP"

# -------------------------------
# TLS + cert handling
# -------------------------------
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

# -------------------------------
# Tooling
# -------------------------------
Invoke-Expression (New-Object System.Net.WebClient).DownloadString("https://get.scoop.sh")
Set-ExecutionPolicy unrestricted -s cu -f

scoop install sudo
sudo scoop install git -g
sudo scoop bucket add java
sudo scoop install zulu8-jdk -g
$env:JAVA_HOME = "$env:SystemDrive\ProgramData\scoop\apps\zulu8-jdk\current"

# -------------------------------
# App install
# -------------------------------
$TmpDir = "$env:HOMEPATH\Downloads"
$ProgressPreference = "SilentlyContinue"

$AppFolderName = "Horta"
$AppExeName    = "horta"
$AppIconName   = "horta48"

Invoke-WebRequest "https://$ServerIP/SCSW/cert.crt" -OutFile "$TmpDir\cert.crt"

sudo $env:JAVA_HOME\bin\keytool.exe -import -noprompt `
  -alias mouse1selfcert `
  -file "$TmpDir\cert.crt" `
  -keystore "$env:JAVA_HOME\jre\lib\security\cacerts" `
  -keypass changeit -storepass changeit

Invoke-WebRequest "https://$ServerIP/files/$AppFolderName-windows.exe" -OutFile "$TmpDir\installer.exe"
Invoke-WebRequest "https://$ServerIP/files/$AppIconName.png" -OutFile "$TmpDir\icon.png"
Invoke-WebRequest "https://$ServerIP/SCSW/downloads/blosc.zip" -OutFile "$TmpDir\blosc.zip"

Start-Process -Wait "$TmpDir\installer.exe" `
  -ArgumentList "--silent --state $TmpDir\state.xml"

Expand-Archive "$TmpDir\blosc.zip" "C:\apps\blosc" -Force
Copy-Item "$TmpDir\icon.png" "C:\apps" -Force

# -------------------------------
# Create DCV latency logger
# -------------------------------
$DcvLatencyScript = @'
# DCV Client Round Trip Latency Logger
# Writes to AppStream Home Folder

$SessionId = $env:APPSTREAM_SESSION_ID
if (-not $SessionId) {
    $SessionId = "$env:COMPUTERNAME-$env:USERNAME"
}

$HomeDir = [Environment]::GetFolderPath("MyDocuments")
$LogFile = Join-Path $HomeDir "dcv_latency.log"

"$(Get-Date -Format o) SESSION_START SessionId=$SessionId" |
    Out-File -Append $LogFile

$CounterPath = "\DCV Server\Round-Trip Time ms"

while ($true) {
    try {
        $samples = (Get-Counter $CounterPath).CounterSamples
        if ($samples.Count -gt 0) {
            $rtt = [math]::Round($samples[0].CookedValue)
            "$(Get-Date -Format o) RTT_MS=$rtt SessionId=$SessionId" |
                Out-File -Append $LogFile
        } else {
            "$(Get-Date -Format o) DCV_COUNTER_NOT_READY" |
                Out-File -Append $LogFile
        }
    } catch {
        "$(Get-Date -Format o) DCV_COUNTER_NOT_READY" |
            Out-File -Append $LogFile
    }
    Start-Sleep -Seconds 10
}
'@

Set-Content "C:\apps\monitorDcvLatency.ps1" $DcvLatencyScript -Encoding UTF8

# -------------------------------
# Create runJaneliaWorkstation.ps1
# -------------------------------
$RunScript = @"
# Start DCV latency monitor (background)
Start-Process powershell `
  -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File C:\apps\monitorDcvLatency.ps1' `
  -WindowStyle Hidden

# Launch workstation
`$ApiGateway = "$ServerIP"
`$JavaDir = `$env:JAVA_HOME
`$WSInstallDir = "C:\apps\$AppFolderName"

`$Args = "--jdkhome `$JavaDir -J``"-Dapi.gateway=https://`$ApiGateway``""

Start-Process -Wait `$WSInstallDir\bin\$AppExeName -ArgumentList `$Args
"@

Set-Content "C:\apps\runJaneliaWorkstation.ps1" $RunScript -Encoding UTF8

Write-Output "installcmd completed successfully"

