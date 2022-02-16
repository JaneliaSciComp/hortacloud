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

Invoke-Expression (New-Object System.Net.WebClient).DownloadString("https://get.scoop.sh")

$env:SCOOP_GLOBAL="C:\"

scoop install git
scoop bucket add java
scoop install -g zulu8-jdk

$TmpDir = $env:TEMP

$ProgressPreference = "SilentlyContinue"
$AppFolderName = "Horta"
$AppExeName = "horta"

Write-Output "Download certificate"
$certRes = Invoke-WebRequest `
   -Uri "https://$ServerIP/SCSW/cert.crt" `
   -OutFile $TmpDir\cert.crt
Write-Output "Downloaded cert: $certRes"

Write-Output "Install certificate"
c:\apps\zulu8-jdk\current\bin\keytool.exe -import `
    -noprompt `
    -alias mouse1selfcert -file $TmpDir\cert.crt `
    -keystore "c:\apps\zulu8-jdk\current\jre\lib\security\cacerts" `
    -keypass changeit -storepass changeit

Write-Output "Download workstation installer"
$wsInstallerRes = Invoke-WebRequest `
   -Uri https://$ServerIP/files/$AppFolderName-windows.exe `
   -OutFile $TmpDir\jws-installer.exe
Write-Output "Downloaded installer: $wsInstallerRes"

# Run the installer
Start-Process -Wait -FilePath $TmpDir\jws-installer.exe

$WSInstallDir = "C:\apps\$AppFolderName"

$RunScriptContent = @"
# Set API Gateway
`$ApiGateway = "$ServerIP"
`$WSInstallDir = "$WSInstallDir"
`$JavaDir = `$env:JAVA_HOME

# get the appstream user
`$UserName = `$env:AppStream_UserName
`$WindowsUserName = `$env:USERNAME

Write-Debug "AppUser: `$UserName, WindowsUser: `$WindowsUserName"

`$DataDir = "C:\Users\`$WindowsUserName"

if (!`$UserName) {
    `$UserDir = `$DataDir
    `$WSArgs = "--jdkhome `$JavaDir -J``"-Dapi.gateway=https://`$ApiGateway``" -J``"-Duser.home=`$UserDir``""
} else {
    `$UserDir = "`$DataDir\`$UserName"
    `$WSArgs = "--jdkhome `$JavaDir -J``"-Dapi.gateway=https://`$ApiGateway``" -J``"-Duser.home=`$UserDir``" -J``"-Dconsole.serverLogin=`$UserName``" -J``"-Dconsole.rememberPassword=true``""
}

Write-Output "UserDir: `$UserDir"

# Create user dir if needed
if (!(Get-Item -Path `$UserDir -ErrorAction Ignore)) {
    New-Item `$UserDir -ItemType Directory
}

Start-Process -Wait -FilePath $WSInstallDir\bin\$AppExeName -ArgumentList `$WSArgs
"@

$RunScriptName = "c:\apps\runJaneliaWorkstation.ps1"
if(!(Get-Item -Path $RunScriptName -ErrorAction Ignore))
{
    New-Item $RunScriptName
}
Set-Content $RunScriptName "$RunScriptContent"
