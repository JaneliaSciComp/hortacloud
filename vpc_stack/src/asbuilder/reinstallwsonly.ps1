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

# enable powershell
Set-ExecutionPolicy unrestricted -s cu -f

Write-Output "Set environment"

$env:JAVA_HOME = "$env:SystemDrive\ProgramData\scoop\apps\zulu8-jdk\current"

$TmpDir = $env:TEMP

$AppFolderName = "Horta"
$AppIconName = "horta48"

Write-Output "Download certificate"
$certRes = Invoke-WebRequest `
   -Uri "https://$ServerIP/SCSW/cert.crt" `
   -OutFile $TmpDir\cert.crt
Write-Output "Downloaded cert: $certRes"

Write-Output "Remove old certificate"
sudo $env:JAVA_HOME\bin\keytool.exe -delete `
    -noprompt `
    -alias mouse1selfcert `
    -keystore "$env:JAVA_HOME\jre\lib\security\cacerts" `
    -keypass changeit -storepass changeit

# Uninstall application
Write-Output "Remove application"
Invoke-Expression  "C:\apps\$AppFolderName\uninstall --silent --nosspacecheck"

Write-Output "Install certificate"
sudo $env:JAVA_HOME\bin\keytool.exe -import `
    -noprompt `
    -alias mouse1selfcert -file $TmpDir\cert.crt `
    -keystore "$env:JAVA_HOME\jre\lib\security\cacerts" `
    -keypass changeit -storepass changeit

Write-Output "Download workstation installer"
$wsInstallerRes = Invoke-WebRequest `
   -Uri https://$ServerIP/files/$AppFolderName-windows.exe `
   -OutFile $TmpDir\jws-installer.exe
Write-Output "Downloaded installer: $wsInstallerRes"

Write-Output "Download application icon"
$wsIconRes = Invoke-WebRequest `
   -Uri https://$ServerIP/files/$AppIconName.png `
   -OutFile $TmpDir\jws-icon.png
Write-Output "Downloaded application icon: $wsIconRes"

Write-Output "Download BLOSC Libraries"
$bloscRes = Invoke-WebRequest `
   -Uri "https://$ServerIP/SCSW/downloads/blosc.zip" `
   -OutFile $TmpDir\blosc.zip
Write-Output "Downloaded blosc libs result: $bloscRes"

$vc2010RedistDownloadLink = "https://download.microsoft.com/download/1/6/5/165255E7-1014-4D0A-B094-B6A430A6BFFC/vcredist_x64.exe"
$vc2010RedistPackage = "vc2010_redist.x64.exe"
$vc2010RedistInstallFlags = "/passive /norestart"

Write-Output "VS redist installer"
$vsRedistInstallerRes = Invoke-WebRequest `
   -Uri $vc2010RedistDownloadLink `
   -OutFile "$TmpDir\$vc2010RedistPackage"

# Run the VS redist installer
Write-Output "Install VS redist package"
Start-Process -Wait -FilePath "$TmpDir\$vc2010RedistPackage" -ArgumentList $vc2010RedistInstallFlags

# Generate the installer state for the silent install
$InstallerStateContent = @"
<state xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
       xsi:noNamespaceSchemaLocation="state-file.xsd">
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
if(!(Get-Item -Path $InstallerStateName -ErrorAction Ignore))
{
    New-Item $InstallerStateName
}
Set-Content $InstallerStateName "$InstallerStateContent"

# Run the installer
Start-Process -Wait -FilePath $TmpDir\jws-installer.exe -ArgumentList "--silent --state $InstallerStateName"

# Copy the icon
Copy-Item $TmpDir\jws-icon.png "C:\apps" -Force

# Unzip blosc
New-Item -Path "C:\apps" -Name "blosc" -ItemType "directory" -Force
Expand-Archive -LiteralPath "$TmpDir\blosc.zip" -DestinationPath "C:\apps\blosc" -Force
# Add blosc dlls location to the path
$env:Path += [IO.Path]::PathSeparator + "C:\apps\blosc"
