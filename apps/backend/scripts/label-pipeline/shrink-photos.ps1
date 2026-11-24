# RafSkoru - Codex icin kucultulmus fotograf kopyalari (ADR-009 par. 16).
#
# Kullanim: powershell -NoProfile -ExecutionPolicy Bypass -File shrink-photos.ps1 -BatchDir <parti klasoru> [-MaxSide 2000]
#
# <parti>/<barkod>/*.jpg -> <parti>/<barkod>/codex/<ayni ad>.jpg
# Uzun kenar MaxSide pikselden buyukse orantili kucultulur (JPEG kalite 90); degilse aynen kopyalanir.
# EXIF yonu varsa uygulanir. Asil fotograflara dokunulmaz; var olan kopyanin uzerine yazilmaz.
# Yeni paket gerekmez: Windows'un kendi System.Drawing kutuphanesi kullanilir.
param(
  [Parameter(Mandatory = $true)][string]$BatchDir,
  [int]$MaxSide = 2000
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]90)

$made = 0; $copied = 0; $kept = 0
Get-ChildItem -LiteralPath $BatchDir -Directory | ForEach-Object {
  $productDir = $_.FullName
  $photos = Get-ChildItem -LiteralPath $productDir -File -Filter *.jpg
  if ($photos.Count -eq 0) { return }
  $outDir = Join-Path $productDir 'codex'
  if (-not (Test-Path -LiteralPath $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }
  foreach ($photo in $photos) {
    $target = Join-Path $outDir $photo.Name
    if (Test-Path -LiteralPath $target) { $kept++; continue }
    $img = [System.Drawing.Image]::FromFile($photo.FullName)
    try {
      # EXIF yonu (0x0112)
      if ($img.PropertyIdList -contains 0x0112) {
        $o = $img.GetPropertyItem(0x0112).Value[0]
        switch ($o) {
          3 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipNone) }
          6 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipNone) }
          8 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipNone) }
        }
      }
      $long = [Math]::Max($img.Width, $img.Height)
      if ($long -le $MaxSide -and -not ($img.PropertyIdList -contains 0x0112)) {
        $img.Dispose(); $img = $null
        Copy-Item -LiteralPath $photo.FullName -Destination $target
        $copied++
        continue
      }
      $scale = [Math]::Min(1.0, $MaxSide / $long)
      $w = [int][Math]::Round($img.Width * $scale); $h = [int][Math]::Round($img.Height * $scale)
      $bmp = New-Object System.Drawing.Bitmap($w, $h)
      $g = [System.Drawing.Graphics]::FromImage($bmp)
      $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $g.DrawImage($img, 0, 0, $w, $h)
      $g.Dispose()
      $tmp = "$target.tmp"
      $bmp.Save($tmp, $jpegCodec, $encParams)
      $bmp.Dispose()
      Move-Item -LiteralPath $tmp -Destination $target
      $made++
    } finally {
      if ($img) { $img.Dispose() }
    }
  }
}
Write-Output "Kucultuldu: $made, aynen kopyalandi: $copied, zaten vardi: $kept"
