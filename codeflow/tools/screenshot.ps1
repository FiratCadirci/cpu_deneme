# Sayfanın ekran görüntüsünü alır.
# Kullanım:  powershell -ExecutionPolicy Bypass -File tools\screenshot.ps1 -Width 390 -Height 4000 -Out C:\temp\mobil.png
#
# Not: Windows'ta headless Chrome görünüm alanını en az 500px yapar. --window-size=390 verilse bile sayfa
# 500px'te çizilip 390'da kırpılır ve her şey sağdan taşıyor gibi görünür. Bu yüzden 500'den dar
# genişliklerde sayfa tam o genişlikte bir iframe içinde çizilir ve görüntü iframe'e göre kırpılır.
param(
  [string]$Url = '',                 # boşsa index.html (örn. 'tests/index.html' veya tam file:/// adresi)
  [int]$Width = 1440,
  [int]$Height = 3000,
  [int]$Budget = 6000,               # sayfadaki scriptlere tanınan sanal süre (ms)
  [Parameter(Mandatory = $true)][string]$Out
)
. "$PSScriptRoot\common.ps1"
Add-Type -AssemblyName System.Drawing

if ($Url -eq '') { $Url = ConvertTo-FileUrl (Join-Path $ProjectRoot 'index.html') }
elseif ($Url -notmatch '^(file|https?):') { $Url = ConvertTo-FileUrl (Join-Path $ProjectRoot $Url) }
$Out = [System.IO.Path]::GetFullPath($Out)

if ($Width -ge 500) {
  Invoke-Headless @('--hide-scrollbars', "--virtual-time-budget=$Budget", "--screenshot=$Out", "--window-size=$Width,$Height", $Url) | Out-Null
} else {
  $wrapper = Join-Path $TmpDir 'narrow-wrapper.html'
  $html = "<!DOCTYPE html><html><head><meta charset='utf-8'><style>html,body{margin:0;background:#fff}iframe{display:block;border:0;width:${Width}px;height:${Height}px}</style></head><body><iframe src='$Url'></iframe></body></html>"
  [System.IO.File]::WriteAllText($wrapper, $html, (New-Object System.Text.UTF8Encoding($false)))
  $raw = Join-Path $TmpDir 'narrow-raw.png'
  Invoke-Headless @('--hide-scrollbars', "--virtual-time-budget=$Budget", "--screenshot=$raw", "--window-size=520,$Height", (ConvertTo-FileUrl $wrapper)) | Out-Null
  $image = [System.Drawing.Image]::FromFile($raw)
  try {
    $bitmap = New-Object System.Drawing.Bitmap($Width, $image.Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $rect = New-Object System.Drawing.Rectangle(0, 0, $Width, $image.Height)
    $graphics.DrawImage($image, $rect, $rect, [System.Drawing.GraphicsUnit]::Pixel)
    $graphics.Dispose()
    $bitmap.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Dispose()
  } finally { $image.Dispose() }
  Remove-Item $raw, $wrapper -Force
}

if (Test-Path $Out) { Write-Host "Kaydedildi: $Out ($Width x $Height)" -ForegroundColor Green } else { Write-Host 'Ekran görüntüsü alınamadı.' -ForegroundColor Red; exit 1 }
