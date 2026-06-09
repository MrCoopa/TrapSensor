Add-Type -AssemblyName System.Drawing
$sourcePath = "d:\CatchSensor\CatchSensor\client\public\icons\fox-logo.png"
$resRoot = "d:\CatchSensor\CatchSensor\client\android\app\src\main\res"

$sourceBmp = [System.Drawing.Bitmap]::FromFile($sourcePath)

# --- Automatic Bounding Box Detection ---
$minX = $sourceBmp.Width
$minY = $sourceBmp.Height
$maxX = 0
$maxY = 0

Write-Host "Detecting logo boundaries..."
for ($y = 0; $y -lt $sourceBmp.Height; $y++) {
    for ($x = 0; $x -lt $sourceBmp.Width; $x++) {
        $pixel = $sourceBmp.GetPixel($x, $y)
        $avg = ($pixel.R + $pixel.G + $pixel.B) / 3
        if ($avg -lt 250) {
            # Non-white pixel
            if ($x -lt $minX) { $minX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

$logoW = $maxX - $minX + 1
$logoH = $maxY - $minY + 1

# Add a tiny bit of padding (2%) so it doesn't touch the edges completely
$padding = [int]($logoW * 0.02)
$minX = [Math]::Max(0, $minX - $padding)
$minY = [Math]::Max(0, $minY - $padding)
$logoW = [Math]::Min($sourceBmp.Width - $minX, $logoW + 2 * $padding)
$logoH = [Math]::Min($sourceBmp.Height - $minY, $logoH + 2 * $padding)

Write-Host "Logo found at ($minX, $minY) with size ${logoW}x${logoH}"
$croppedBmp = $sourceBmp.Clone([System.Drawing.Rectangle]::new($minX, $minY, $logoW, $logoH), $sourceBmp.PixelFormat)

function Get-ResizedBitmap {
    param($src, $targetW, $targetH, $contentScale = 1.0)
    # create final bitmap
    $dest = New-Object System.Drawing.Bitmap($targetW, $targetH)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    
    # Calculate drawing area within target
    $drawW = $targetW * $contentScale
    $drawH = $targetH * $contentScale
    
    # Maintain aspect ratio of source
    $ratio = [Math]::Min($drawW / $src.Width, $drawH / $src.Height)
    $finalW = $src.Width * $ratio
    $finalH = $src.Height * $ratio
    
    $offsetX = ($targetW - $finalW) / 2
    $offsetY = ($targetH - $finalH) / 2
    
    $g.DrawImage($src, $offsetX, $offsetY, $finalW, $finalH)
    $g.Dispose()
    return $dest
}

function Get-MonochromaticBitmap {
    param($src)
    $dest = New-Object System.Drawing.Bitmap($src.Width, $src.Height)
    for ($y = 0; $y -lt $src.Height; $y++) {
        for ($x = 0; $x -lt $src.Width; $x++) {
            $pixel = $src.GetPixel($x, $y)
            # Alpha check (if source had transparency) or light threshold
            if ($pixel.A -gt 10 -and (($pixel.R + $pixel.G + $pixel.B) / 3 -lt 245)) {
                $dest.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, 255, 255, 255))
            }
            else {
                $dest.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
            }
        }
    }
    return $dest
}

function Get-TransparentBitmap {
    # Simply ensures background is transparent if it was white
    param($src)
    $dest = New-Object System.Drawing.Bitmap($src.Width, $src.Height)
    for ($y = 0; $y -lt $src.Height; $y++) {
        for ($x = 0; $x -lt $src.Width; $x++) {
            $pixel = $src.GetPixel($x, $y)
            $avg = ($pixel.R + $pixel.G + $pixel.B) / 3
            if ($avg -lt 250) {
                $dest.SetPixel($x, $y, $pixel)
            }
            else {
                $dest.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
            }
        }
    }
    return $dest
}

# 1. Notification Icons (Monochromatic)
# Android notification icons should be roughly 100% of the area (with small safe margin)
$notifSizes = @{ "drawable-mdpi" = 24; "drawable-hdpi" = 36; "drawable-xhdpi" = 48; "drawable-xxhdpi" = 72; "drawable-xxxhdpi" = 96 }
foreach ($folder in $notifSizes.Keys) {
    $size = $notifSizes[$folder]
    $path = Join-Path $resRoot $folder
    if (-not (Test-Path $path)) { New-Item -ItemType Directory -Path $path -Force }
    $resized = Get-ResizedBitmap $croppedBmp $size $size 0.9
    $mono = Get-MonochromaticBitmap $resized
    $mono.Save((Join-Path $path "ic_stat_notification.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $resized.Dispose(); $mono.Dispose()
    Write-Host "Generated Notification: $folder"
}

# 2. Legacy Launcher Icons (Rounded/Square)
$launcherSizes = @{ "mipmap-mdpi" = 48; "mipmap-hdpi" = 72; "mipmap-xhdpi" = 96; "mipmap-xxhdpi" = 144; "mipmap-xxxhdpi" = 192 }
foreach ($folder in $launcherSizes.Keys) {
    $size = $launcherSizes[$folder]
    $path = Join-Path $resRoot $folder
    if (-not (Test-Path $path)) { New-Item -ItemType Directory -Path $path -Force }
    $resized = Get-ResizedBitmap $croppedBmp $size $size 0.85
    $transparent = Get-TransparentBitmap $resized
    $transparent.Save((Join-Path $path "ic_launcher.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $transparent.Save((Join-Path $path "ic_launcher_round.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $resized.Dispose(); $transparent.Dispose()
    Write-Host "Generated Launcher: $folder"
}

# 3. Adaptive Foreground (Safe zone is center 66%)
foreach ($folder in $launcherSizes.Keys) {
    $size = $launcherSizes[$folder]
    $fSize = 108
    if ($folder -eq "mipmap-mdpi") { $fSize = 72 }
    elseif ($folder -eq "mipmap-hdpi") { $fSize = 108 }
    elseif ($folder -eq "mipmap-xhdpi") { $fSize = 162 }
    elseif ($folder -eq "mipmap-xxhdpi") { $fSize = 243 }
    elseif ($folder -eq "mipmap-xxxhdpi") { $fSize = 324 }
    
    $path = Join-Path $resRoot $folder
    # We use 0.65 to fit perfectly in the launcher safe zone
    $resized = Get-ResizedBitmap $croppedBmp $fSize $fSize 0.65
    $transparent = Get-TransparentBitmap $resized
    $transparent.Save((Join-Path $path "ic_launcher_foreground.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $resized.Dispose(); $transparent.Dispose()
    Write-Host "Generated Foreground: $folder"
}

# 4. Web PWA Icons (client/public/icons)
$webIconsPath = "d:\CatchSensor\CatchSensor\client\public\icons"
if (-not (Test-Path $webIconsPath)) { New-Item -ItemType Directory -Path $webIconsPath -Force }
$webSizes = @(48, 72, 96, 128, 192, 256, 512)
foreach ($size in $webSizes) {
    $resized = Get-ResizedBitmap $croppedBmp $size $size 0.9
    $transparent = Get-TransparentBitmap $resized
    # We save as .png because System.Drawing support for .webp is limited
    $transparent.Save((Join-Path $webIconsPath "icon-$size.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $resized.Dispose(); $transparent.Dispose()
    Write-Host "Generated Web Icon: ${size}x${size}"
}

$croppedBmp.Dispose(); $sourceBmp.Dispose()
Write-Host "All assets (Android + Web) regenerated successfully."
