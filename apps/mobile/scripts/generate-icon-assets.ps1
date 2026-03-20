Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"

$assetsDir = Join-Path $PSScriptRoot "..\assets"
New-Item -ItemType Directory -Force -Path $assetsDir | Out-Null

function New-ColorFromHex {
  param(
    [Parameter(Mandatory = $true)][string]$Hex,
    [int]$Alpha = 255
  )

  $clean = $Hex.TrimStart("#")
  if ($clean.Length -ne 6) {
    throw "Expected a 6-digit hex color, got '$Hex'."
  }

  $r = [Convert]::ToInt32($clean.Substring(0, 2), 16)
  $g = [Convert]::ToInt32($clean.Substring(2, 2), 16)
  $b = [Convert]::ToInt32($clean.Substring(4, 2), 16)
  return [System.Drawing.Color]::FromArgb($Alpha, $r, $g, $b)
}

function New-RoundedRectPath {
  param(
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [float]$Radius
  )

  $diameter = $Radius * 2
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-PinPath {
  param(
    [int]$CanvasSize,
    [switch]$Minimal
  )

  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $radius = if ($Minimal) { $CanvasSize * (28.4 / 96) } else { $CanvasSize * (29 / 96) }
  $path.AddEllipse(($CanvasSize / 2) - $radius, ($CanvasSize / 2) - $radius, $radius * 2, $radius * 2)
  return $path
}

function Set-HighQualityDrawing {
  param([System.Drawing.Graphics]$Graphics)

  $Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $Graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $Graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
}

function Draw-Symbol {
  param(
    [System.Drawing.Graphics]$Graphics,
    [int]$CanvasSize,
    [switch]$TransparentBackground,
    [switch]$Monochrome,
    [ValidateSet("primary", "minimal")][string]$Variant = "primary"
  )

  $centerX = $CanvasSize / 2
  $centerY = $CanvasSize * 0.482
  $unit = $CanvasSize / 96
  $isMinimal = $Variant -eq "minimal"

  if (-not $TransparentBackground) {
    $backgroundPath = New-RoundedRectPath 0 0 $CanvasSize $CanvasSize ($CanvasSize * 0.22)
    $backgroundBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
      ([System.Drawing.RectangleF]::new(0, 0, $CanvasSize, $CanvasSize)),
      (New-ColorFromHex "#111827"),
      (New-ColorFromHex "#020617"),
      45
    )
    $backgroundBlend = New-Object System.Drawing.Drawing2D.ColorBlend
    $backgroundBlend.Colors = [System.Drawing.Color[]]@(
      (New-ColorFromHex "#111827"),
      (New-ColorFromHex "#0B1020"),
      (New-ColorFromHex "#020617")
    )
    $backgroundBlend.Positions = [single[]]@(0.0, 0.52, 1.0)
    $backgroundBrush.InterpolationColors = $backgroundBlend
    $Graphics.FillPath($backgroundBrush, $backgroundPath)

  }

  $pinPath = New-PinPath -CanvasSize $CanvasSize -Minimal:$isMinimal

  if ($Monochrome) {
    $pinBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    $Graphics.FillPath($pinBrush, $pinPath)
  } else {
    $pinBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
      ([System.Drawing.RectangleF]::new($centerX - ($CanvasSize * 0.29), $centerY - ($CanvasSize * 0.34), $CanvasSize * 0.58, $CanvasSize * 0.76)),
      (New-ColorFromHex "#A855F7"),
      (New-ColorFromHex "#22D3EE"),
      55
    )
    $blend = New-Object System.Drawing.Drawing2D.ColorBlend
    $blend.Colors = [System.Drawing.Color[]]@(
      (New-ColorFromHex "#A855F7"),
      (New-ColorFromHex "#6366F1"),
      (New-ColorFromHex "#22D3EE")
    )
    $blend.Positions = [single[]]@(0.0, 0.58, 1.0)
    $pinBrush.InterpolationColors = $blend
    $Graphics.FillPath($pinBrush, $pinPath)

    $clipState = $Graphics.Save()
    $Graphics.SetClip($pinPath)
    $highlightBrush = New-Object System.Drawing.SolidBrush (New-ColorFromHex "#FFFFFF" $(if ($isMinimal) { 12 } else { 18 }))
    $highlightCenterX = $(if ($isMinimal) { 34.4 } else { 34.5 }) * $unit
    $highlightCenterY = $(if ($isMinimal) { 24.1 } else { 24.2 }) * $unit
    $highlightRadiusX = $(if ($isMinimal) { 10.5 } else { 11.2 }) * $unit
    $highlightRadiusY = $(if ($isMinimal) { 7.4 } else { 8.1 }) * $unit
    $Graphics.FillEllipse(
      $highlightBrush,
      $highlightCenterX - $highlightRadiusX,
      $highlightCenterY - $highlightRadiusY,
      $highlightRadiusX * 2,
      $highlightRadiusY * 2
    )
    $Graphics.Restore($clipState)
  }

  $nLeftX = $(if ($isMinimal) { 38.7 } else { 38.6 }) * $unit
  $nRightX = $(if ($isMinimal) { 57.1 } else { 57.4 }) * $unit
  $nTopY = $(if ($isMinimal) { 39.8 } else { 39.4 }) * $unit
  $nBottomY = $(if ($isMinimal) { 56.3 } else { 56.6 }) * $unit
  $glowRadius = $(if ($isMinimal) { 3.2 } else { 3.5 }) * $unit

  if (-not $Monochrome) {
    $leftGlowBrush = New-Object System.Drawing.SolidBrush (New-ColorFromHex "#60A5FA" $(if ($isMinimal) { 36 } else { 41 }))
    $rightGlowBrush = New-Object System.Drawing.SolidBrush (New-ColorFromHex "#22D3EE" $(if ($isMinimal) { 41 } else { 46 }))
    foreach ($point in @(
      @{ X = $nLeftX; Y = $nTopY; Brush = $leftGlowBrush },
      @{ X = $nLeftX; Y = $nBottomY; Brush = $leftGlowBrush },
      @{ X = $nRightX; Y = $nTopY; Brush = $rightGlowBrush },
      @{ X = $nRightX; Y = $nBottomY; Brush = $rightGlowBrush }
    )) {
      $Graphics.FillEllipse(
        $point.Brush,
        $point.X - $glowRadius,
        $point.Y - $glowRadius,
        $glowRadius * 2,
        $glowRadius * 2
      )
    }
  }

  $nPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $nPath.AddLine($nLeftX, $nTopY, $nLeftX, $nBottomY)
  $nPath.AddLine($nLeftX, $nBottomY, $nRightX, $nTopY)
  $nPath.AddLine($nRightX, $nTopY, $nRightX, $nBottomY)

  $nClip = $Graphics.Save()
  $Graphics.SetClip($pinPath)

  if ($Monochrome) {
    $glowPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(32, 255, 255, 255)), ($(if ($isMinimal) { 7.4 } else { 8.2 }) * $unit)
    $mainPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(143, 11, 16, 32)), ($(if ($isMinimal) { 4.1 } else { 4.6 }) * $unit)
  } else {
    $nGlowBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
      ([System.Drawing.RectangleF]::new($nLeftX, $nTopY, $nRightX - $nLeftX, $nBottomY - $nTopY)),
      (New-ColorFromHex "#60A5FA" $(if ($isMinimal) { 61 } else { 71 })),
      (New-ColorFromHex "#22D3EE" $(if ($isMinimal) { 66 } else { 77 })),
      35
    )
    $nGlowBlend = New-Object System.Drawing.Drawing2D.ColorBlend
    $nGlowBlend.Colors = [System.Drawing.Color[]]@(
      (New-ColorFromHex "#60A5FA" $(if ($isMinimal) { 61 } else { 71 })),
      (New-ColorFromHex "#6366F1" 20),
      (New-ColorFromHex "#22D3EE" $(if ($isMinimal) { 66 } else { 77 }))
    )
    $nGlowBlend.Positions = [single[]]@(0.0, 0.5, 1.0)
    $nGlowBrush.InterpolationColors = $nGlowBlend
    $glowPen = New-Object System.Drawing.Pen $nGlowBrush, ($(if ($isMinimal) { 7.4 } else { 8.2 }) * $unit)
    $mainPen = New-Object System.Drawing.Pen ((New-ColorFromHex "#F8FAFC")), ($(if ($isMinimal) { 4.1 } else { 4.6 }) * $unit)
  }

  foreach ($pen in @($glowPen, $mainPen)) {
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $Graphics.DrawPath($pen, $nPath)
  }

  $Graphics.Restore($nClip)
}

function Save-Png {
  param(
    [int]$CanvasSize,
    [string]$OutputPath,
    [switch]$TransparentBackground,
    [switch]$Monochrome,
    [switch]$EnsureOpaqueBackground,
    [ValidateSet("primary", "minimal")][string]$Variant = "primary"
  )

  $bitmap = New-Object System.Drawing.Bitmap $CanvasSize, $CanvasSize
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  Set-HighQualityDrawing $graphics
  if ($EnsureOpaqueBackground) {
    $graphics.Clear((New-ColorFromHex "#0B1020"))
  } else {
    $graphics.Clear([System.Drawing.Color]::Transparent)
  }
  Draw-Symbol -Graphics $graphics -CanvasSize $CanvasSize -TransparentBackground:$TransparentBackground -Monochrome:$Monochrome -Variant $Variant
  $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()
}

Save-Png -CanvasSize 1024 -OutputPath (Join-Path $assetsDir "icon.png") -EnsureOpaqueBackground
Save-Png -CanvasSize 1024 -OutputPath (Join-Path $assetsDir "adaptive-icon.png") -TransparentBackground
Save-Png -CanvasSize 1024 -OutputPath (Join-Path $assetsDir "adaptive-icon-monochrome.png") -TransparentBackground -Monochrome
Save-Png -CanvasSize 1024 -OutputPath (Join-Path $assetsDir "icon-minimal.png") -Variant minimal -EnsureOpaqueBackground
Save-Png -CanvasSize 1024 -OutputPath (Join-Path $assetsDir "adaptive-icon-minimal.png") -TransparentBackground -Variant minimal
Save-Png -CanvasSize 256 -OutputPath (Join-Path $assetsDir "favicon.png") -Variant minimal -EnsureOpaqueBackground
Save-Png -CanvasSize 1024 -OutputPath (Join-Path $assetsDir "splash-icon.png") -TransparentBackground
Save-Png -CanvasSize 256 -OutputPath (Join-Path $assetsDir "notification-icon.png") -TransparentBackground -Monochrome

Write-Output "Generated icon assets in $assetsDir"
