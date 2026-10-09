# Ortak yardımcılar: proje kökü, tarayıcı yolu ve geçici klasör.
# Diğer scriptler bunu ". $PSScriptRoot\common.ps1" ile yükler.

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$TmpDir = Join-Path $PSScriptRoot '.tmp'
New-Item -ItemType Directory -Force $TmpDir | Out-Null

function Get-Browser {
  $candidates = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
  )
  foreach ($path in $candidates) { if ($path -and (Test-Path $path)) { return $path } }
  throw 'Chrome veya Edge bulunamadı.'
}

function ConvertTo-FileUrl([string]$Path) {
  return 'file:///' + ((Resolve-Path $Path).Path -replace '\\', '/')
}

# Headless tarayıcıyı çalıştırır ve bitmesini bekler. Her çağrı kendi profil klasörünü kullanır.
function Invoke-Headless([string[]]$Arguments, [string]$StdOut, [string]$StdErr) {
  $browser = Get-Browser
  $profile = Join-Path $TmpDir ('profile-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
  $all = @('--headless=new', '--disable-gpu', '--no-first-run', "--user-data-dir=$profile") + $Arguments
  $params = @{ FilePath = $browser; ArgumentList = $all; Wait = $true; NoNewWindow = $true; PassThru = $true }
  if ($StdOut) { $params.RedirectStandardOutput = $StdOut }
  if ($StdErr) { $params.RedirectStandardError = $StdErr } else { $params.RedirectStandardError = (Join-Path $TmpDir 'stderr.txt') }
  $process = Start-Process @params
  Remove-Item $profile -Recurse -Force -ErrorAction SilentlyContinue
  return $process.ExitCode
}
