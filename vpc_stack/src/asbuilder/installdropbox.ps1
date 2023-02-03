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

$TmpDir = "$env:HOMEPATH\Downloads"

Write-Output "Download DropBox"
$downloadRes = Invoke-WebRequest `
   -Uri "https://www.dropbox.com/download?full=1&os=win" `
   -OutFile $TmpDir\DropBox-full-installer.exe
Write-Output "Download result: $downloadRes"

# Start the installation
Write-Output "Install DropBox"
Start-Process -Wait -FilePath "$TmpDir\DropBox-full-installer.exe" -ArgumentList "/S"
