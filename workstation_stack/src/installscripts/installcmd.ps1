$ServerIP = $args[0]
echo "Use $ServerIP"

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

iwr -useb get.scoop.sh | iex

$env:SCOOP_GLOBAL='C:\'

scoop install git
scoop bucket add java
scoop install -g ojdkbuild8

$TmpDir = $env:TEMP

echo "Download certificate"
$certRes = Invoke-WebRequest `
   -Uri "https://$ServerIP/SCSW/cert.crt" `
   -OutFile $TmpDir\cert.crt
echo "Downloaded cert: $certRes"

echo "Install certificate"
c:\apps\ojdkbuild8\current\bin\keytool.exe -import `
    -noprompt `
    -alias mouse1selfcert -file cert.crt `
    -keystore "c:\apps\ojdkbuild8\current\jre\lib\security\cacerts" `
    -keypass changeit -storepass changeit

echo "Download workstation installer"
$wsInstallerRes = Invoke-WebRequest `
   -Uri https://$ServerIP/files/JaneliaWorkstation-windows.exe `
   -OutFile $TmpDir\jws-installer.exe
echo "Downloaded installer: $wsInstallerRes"

$JaneliaWSInstallDir = "C:\apps\JaneliaWorkstation"

$RunScriptContent = @"
# Set API Gateway
`$ApiGateway = "$ServerIP"

# get the appstream user
`$UserName = `$env:AppStream_UserName
`$JaneliaWSInstallDir = "$JaneliaWSInstallDir"
`$DataDir = "C:\Users"
`$JavaDir = `$env:JAVA_HOME
`$UserDir = "`$DataDir\`$UserName"

# Create user dir
if(!(Get-Item -Path `$UserDir -ErrorAction Ignore))
{
    Write-Host "Folder Doesn't Exists"
    New-Item `$UserDir -ItemType Directory
}

$JaneliaWSInstallDir\bin\janeliaws --jdkhome `$JavaDir ``
    -J"-Duser.home=`$UserDir" ``
    -J"-Dapi.gateway=https://`$ApiGateway" ``
    -J"-Dconsole.serverLogin=`$UserName" ``
    -J"-Dconsole.rememberPassword=true"
"@

$RunScriptName = "c:\apps\runJaneliaWorkstation.ps1"
if(!(Get-Item -Path $RunScriptName -ErrorAction Ignore))
{
    New-Item $RunScriptName
}
Set-Content $RunScriptName "$RunScriptContent"
