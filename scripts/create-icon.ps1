Add-Type -AssemblyName System.Drawing
$assets = Join-Path $PSScriptRoot '../assets'
New-Item -ItemType Directory -Force -Path $assets | Out-Null
$bitmap = New-Object System.Drawing.Bitmap 256,256
$g = [System.Drawing.Graphics]::FromImage($bitmap)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::FromArgb(52,117,104))
$brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(247,250,245))
$font = New-Object System.Drawing.Font 'Segoe UI', 155, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$g.DrawString('g',$font,$brush,38,9)
$pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(178,217,178)), 12
$g.DrawArc($pen,165,34,53,60,185,120)
$bitmap.Save((Join-Path $assets 'icon.png'),[System.Drawing.Imaging.ImageFormat]::Png)
$icon = [System.Drawing.Icon]::FromHandle($bitmap.GetHicon())
$stream = [System.IO.File]::Create((Join-Path $assets 'icon.ico'))
$icon.Save($stream)
$stream.Close()
$g.Dispose()
$bitmap.Dispose()

