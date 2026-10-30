# Original Mirello monogram; same geometry as renderer/assets/brand-mark.svg.
# Generates PNG-backed ICO entries at all common Windows scales. No font dependency.
Add-Type -AssemblyName System.Drawing
$iconScriptRoot = $PSScriptRoot
if (-not $iconScriptRoot) { $iconScriptRoot = Join-Path (Get-Location) 'scripts' }
$assets = [IO.Path]::GetFullPath((Join-Path $iconScriptRoot '../assets'))
if ($assets -ne [IO.Path]::GetFullPath((Join-Path (Get-Location) 'assets'))) { throw 'Run from the project root.' }
New-Item -ItemType Directory -Force -Path $assets | Out-Null
$sizes = @(16, 24, 32, 48, 64, 128, 256)
$images = [Collections.Generic.List[byte[]]]::new()
foreach ($size in $sizes) {
    $bitmap = [Drawing.Bitmap]::new($size * 4, $size * 4)
    $g = [Drawing.Graphics]::FromImage($bitmap)
    $g.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([Drawing.Color]::Transparent)
    $g.ScaleTransform($size * 4 / 24.0, $size * 4 / 24.0)
    $background = [Drawing.Drawing2D.GraphicsPath]::new()
    $background.AddArc(0, 0, 6, 6, 180, 90)
    $background.AddArc(18, 0, 6, 6, 270, 90)
    $background.AddArc(18, 18, 6, 6, 0, 90)
    $background.AddLine(21, 24, 1, 24)
    $background.AddArc(0, 22, 2, 2, 90, 90)
    $background.CloseFigure()
    $brush = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#347568'))
    $g.FillPath($brush, $background)
    $mark = [Drawing.Drawing2D.GraphicsPath]::new()
    $mark.AddLine(4.5, 18, 4.5, 7.7)
    $mark.AddBezier(4.5, 7.7, 4.5, 6.4, 6.1, 5.9, 6.9, 6.9)
    $mark.AddLine(6.9, 6.9, 12, 13)
    $mark.AddLine(12, 13, 17.1, 6.9)
    $mark.AddBezier(17.1, 6.9, 17.9, 5.9, 19.5, 6.4, 19.5, 7.7)
    $mark.AddLine(19.5, 7.7, 19.5, 18)
    $pen = [Drawing.Pen]::new([Drawing.Color]::White, 2.5)
    $pen.StartCap = $pen.EndCap = [Drawing.Drawing2D.LineCap]::Round
    $pen.LineJoin = [Drawing.Drawing2D.LineJoin]::Round
    $g.DrawPath($pen, $mark)
    $small = [Drawing.Bitmap]::new($size, $size)
    $resize = [Drawing.Graphics]::FromImage($small)
    $resize.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $resize.DrawImage($bitmap, 0, 0, $size, $size)
    $png = [IO.MemoryStream]::new()
    $small.Save($png, [Drawing.Imaging.ImageFormat]::Png)
    $images.Add($png.ToArray())
    if ($size -eq 256) { [IO.File]::WriteAllBytes((Join-Path $assets 'icon.png'), $png.ToArray()) }
    $png.Dispose()
    $resize.Dispose()
    $small.Dispose()
    $pen.Dispose()
    $mark.Dispose()
    $brush.Dispose()
    $background.Dispose()
    $g.Dispose()
    $bitmap.Dispose()
}
$stream = [IO.File]::Create((Join-Path $assets 'icon.ico'))
$writer = [IO.BinaryWriter]::new($stream)
try {
    $writer.Write([uint16]0)
    $writer.Write([uint16]1)
    $writer.Write([uint16]$sizes.Count)
    $offset = 6 + 16 * $sizes.Count
    for ($i = 0; $i -lt $sizes.Count; $i++) {
        $dimension = if ($sizes[$i] -eq 256) { 0 } else { $sizes[$i] }
        $writer.Write([byte]$dimension)
        $writer.Write([byte]$dimension)
        $writer.Write([byte]0)
        $writer.Write([byte]0)
        $writer.Write([uint16]1)
        $writer.Write([uint16]32)
        $writer.Write([uint32]$images[$i].Length)
        $writer.Write([uint32]$offset)
        $offset += $images[$i].Length
    }
    foreach ($bytes in $images) { $writer.Write($bytes) }
} finally { $writer.Dispose(); $stream.Dispose() }
Write-Output 'Created Mirello icon.png and multi-resolution icon.ico.'

