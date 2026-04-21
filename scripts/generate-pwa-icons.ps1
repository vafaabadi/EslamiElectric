Add-Type -AssemblyName System.Drawing
$dir = Join-Path $PSScriptRoot "..\public\icons" | Resolve-Path
New-Item -ItemType Directory -Force -Path $dir | Out-Null
# dummy to trigger redeployment
function Save-LightningIcon([int]$size, [string]$outPath) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::FromArgb(255, 15, 23, 42))
  $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 245, 158, 11))
  $scale = $size / 512.0
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddLines(@(
    [System.Drawing.Point]::new([int](268 * $scale), [int](96 * $scale)),
    [System.Drawing.Point]::new([int](156 * $scale), [int](280 * $scale)),
    [System.Drawing.Point]::new([int](228 * $scale), [int](280 * $scale)),
    [System.Drawing.Point]::new([int](196 * $scale), [int](416 * $scale)),
    [System.Drawing.Point]::new([int](356 * $scale), [int](200 * $scale)),
    [System.Drawing.Point]::new([int](276 * $scale), [int](200 * $scale))
  ))
  $g.FillPath($brush, $path)
  $g.Dispose()
  $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

Save-LightningIcon 192 (Join-Path $dir "icon-192.png")
Save-LightningIcon 512 (Join-Path $dir "icon-512.png")
Write-Host "Wrote icon-192.png and icon-512.png"
