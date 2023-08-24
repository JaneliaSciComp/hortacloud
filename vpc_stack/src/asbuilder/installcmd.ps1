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
# enable powershell
Set-ExecutionPolicy unrestricted -s cu -f

Write-Output "Set environment"

Write-Output "Begin tool installation"
scoop install sudo
# install git
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
$certRes = Invoke-WebRequest `
   -Uri "https://$ServerIP/SCSW/cert.crt" `
   -OutFile $TmpDir\cert.crt
Write-Output "Downloaded cert: $certRes"

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

$WSInstallDir = "C:\apps\$AppFolderName"

# Copy the icon
Copy-Item $TmpDir\jws-icon.png "C:\apps" -Force

# Unzip blosc
Expand-Archive -LiteralPath "$TmpDir\blosc.zip" -DestinationPath "C:\apps\$AppFolderName\bin"

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

Write-Output "UserDir: `$UserDir"

# Create user dir if needed
if (!(Get-Item -Path `$UserDir -ErrorAction Ignore)) {
    New-Item `$UserDir -ItemType Directory
}

# Add app binary dir to the path
`$Env:Path += [IO.Path]::PathSeparator + `"$WSInstallDir\bin`"

Start-Process -Wait -FilePath $WSInstallDir\bin\$AppExeName -ArgumentList `$WSArgs
"@

$RunScriptName = "C:\apps\runJaneliaWorkstation.ps1"
if(!(Get-Item -Path $RunScriptName -ErrorAction Ignore))
{
    New-Item $RunScriptName
}
Set-Content $RunScriptName "$RunScriptContent"
