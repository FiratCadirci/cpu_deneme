# tests/index.html'i headless tarayıcıda çalıştırır ve sonucu yazar.
# Kullanım:  powershell -ExecutionPolicy Bypass -File tools\run-tests.ps1
. "$PSScriptRoot\common.ps1"

$dom = Join-Path $TmpDir 'tests-dom.html'
$url = ConvertTo-FileUrl (Join-Path $ProjectRoot 'tests\index.html')
Invoke-Headless @('--virtual-time-budget=30000', '--dump-dom', $url) $dom | Out-Null

$html = Get-Content $dom -Raw -Encoding UTF8
$match = [regex]::Match($html, '<pre id="test-report"[^>]*>(.*?)</pre>', 'Singleline')
if (-not $match.Success -or $match.Groups[1].Value.Trim() -eq '') {
  Write-Host 'Test raporu bulunamadı: bir script hata vermiş olabilir. tests/index.html dosyasını tarayıcıda açıp bakın.' -ForegroundColor Red
  exit 1
}

$report = [System.Net.WebUtility]::HtmlDecode($match.Groups[1].Value) | ConvertFrom-Json
$color = if ($report.failed -eq 0) { 'Green' } else { 'Red' }
Write-Host "GEÇEN $($report.passed) / $($report.total)   KALAN $($report.failed)" -ForegroundColor $color
foreach ($failure in $report.failures) {
  Write-Host "----- [$($failure.suite)] $($failure.name)" -ForegroundColor Yellow
  Write-Host $failure.error
}
if ($report.failed -gt 0) { exit 1 }
