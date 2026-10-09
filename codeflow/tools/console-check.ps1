# Sayfadaki JavaScript hatalarını, yüklenemeyen dosyaları ve console.error/warn çıktılarını listeler.
# Kullanım:  powershell -ExecutionPolicy Bypass -File tools\console-check.ps1                 (index.html)
#            powershell -ExecutionPolicy Bypass -File tools\console-check.ps1 -Page tests\index.html
#
# Yeni headless Chrome konsol mesajlarını dışarı yazmadığı için sayfanın geçici bir kopyasına küçük bir
# hata yakalayıcı eklenir, kopya çalıştırılır, sonuç okunur ve kopya silinir. Asıl dosyaya dokunulmaz.
param(
  [string]$Page = 'index.html',
  [int]$Budget = 8000
)
. "$PSScriptRoot\common.ps1"

$source = Join-Path $ProjectRoot $Page
$copy = Join-Path (Split-Path -Parent $source) ('__console-check-' + [System.IO.Path]::GetFileName($source))
$catcher = @'
<script>
(function () {
  var out = [];
  function add(kind, message) { out.push(kind + ': ' + message); }
  window.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t !== window && (t.src || t.href)) add('YUKLENEMEDI', t.src || t.href);
    else add('HATA', (e.message || '') + ' @ ' + (e.filename || '') + ':' + (e.lineno || ''));
  }, true);
  window.addEventListener('unhandledrejection', function (e) { add('PROMISE', String(e.reason && e.reason.stack || e.reason)); });
  ['error', 'warn'].forEach(function (level) {
    var original = console[level];
    console[level] = function () { add(level.toUpperCase(), Array.prototype.map.call(arguments, String).join(' ')); return original.apply(console, arguments); };
  });
  window.addEventListener('load', function () {
    setTimeout(function () {
      var pre = document.createElement('pre');
      pre.id = '__console-report';
      pre.textContent = JSON.stringify(out);
      document.body.appendChild(pre);
    }, 1500);
  });
})();
</script>
'@

$html = [System.IO.File]::ReadAllText($source, [System.Text.Encoding]::UTF8)
$html = [regex]::Replace($html, '(<head[^>]*>)', "`$1`n$catcher", 1)
[System.IO.File]::WriteAllText($copy, $html, (New-Object System.Text.UTF8Encoding($false)))

try {
  $dom = Join-Path $TmpDir 'console-dom.html'
  Invoke-Headless @("--virtual-time-budget=$Budget", '--dump-dom', (ConvertTo-FileUrl $copy)) $dom | Out-Null
  $result = Get-Content $dom -Raw -Encoding UTF8
} finally {
  Remove-Item $copy -Force -ErrorAction SilentlyContinue
}

$match = [regex]::Match($result, '<pre id="__console-report">(.*?)</pre>', 'Singleline')
if (-not $match.Success) { Write-Host 'Rapor okunamadı (sayfa yüklenmemiş olabilir).' -ForegroundColor Red; exit 1 }
$messages = @([System.Net.WebUtility]::HtmlDecode($match.Groups[1].Value) | ConvertFrom-Json)
$messages = @($messages | ForEach-Object { $_ -replace [regex]::Escape('__console-check-'), '' })

if ($messages.Count -eq 0) {
  Write-Host "$Page : hata yok." -ForegroundColor Green
} else {
  Write-Host "$Page : $($messages.Count) sorun" -ForegroundColor Yellow
  $messages | ForEach-Object { Write-Host "  $_" }
  exit 1
}
