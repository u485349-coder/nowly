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

  $unit = $CanvasSize / 96
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  if ($Minimal) {
    $start = [System.Drawing.PointF]::new(48 * $unit, 11.9 * $unit)
    $path.StartFigure()
    $path.AddBezier($start, ([System.Drawing.PointF]::new(32.3 * $unit, 11.9 * $unit)), ([System.Drawing.PointF]::new(19.8 * $unit, 23.9 * $unit)), ([System.Drawing.PointF]::new(19.8 * $unit, 39.1 * $unit)))
    $path.AddBezier(([System.Drawing.PointF]::new(19.8 * $unit, 39.1 * $unit)), ([System.Drawing.PointF]::new(19.8 * $unit, 49.6 * $unit)), ([System.Drawing.PointF]::new(26.0 * $unit, 59.0 * $unit)), ([System.Drawing.PointF]::new(33.3 * $unit, 66.9 * $unit)))
    $path.AddBezier(([System.Drawing.PointF]::new(33.3 * $unit, 66.9 * $unit)), ([System.Drawing.PointF]::new(38.9 * $unit, 73.0 * $unit)), ([System.Drawing.PointF]::new(44.1 * $unit, 78.7 * $unit)), ([System.Drawing.PointF]::new(46.8 * $unit, 81.8 * $unit)))
    $path.AddBezier(([System.Drawing.PointF]::new(46.8 * $unit, 81.8 * $unit)), ([System.Drawing.PointF]::new(47.4 * $unit, 82.6 * $unit)), ([System.Drawing.PointF]::new(48.6 * $unit, 82.6 * $unit)), ([System.Drawing.PointF]::new(49.2 * $unit, 81.8 * $unit)))
    $path.AddBezier(([System.Drawing.PointF]::new(49.2 * $unit, 81.8 * $unit)), ([System.Drawing.PointF]::new(51.9 * $unit, 78.7 * $unit)), ([System.Drawing.PointF]::new(57.1 * $unit, 73.0 * $unit)), ([System.Drawing.PointF]::new(62.7 * $unit, 66.9 * $unit)))
    $path.AddBezier(([System.Drawing.PointF]::new(62.7 * $unit, 66.9 * $unit)), ([System.Drawing.PointF]::new(70.0 * $unit, 59.0 * $unit)), ([System.Drawing.PointF]::new(76.2 * $unit, 49.6 * $unit)), ([System.Drawing.PointF]::new(76.2 * $unit, 39.1 * $unit)))
    $path.AddBezier(([System.Drawing.PointF]::new(76.2 * $unit, 39.1 * $unit)), ([System.Drawing.PointF]::new(76.2 * $unit, 23.9 * $unit)), ([System.Drawing.PointF]::new(63.7 * $unit, 11.9 * $unit)), $start)
    $path.CloseFigure()
    return $path
  } else {
    $start = [System.Drawing.PointF]::new(48 * $unit, 11.5 * $unit)
    $path.StartFigure()
    $path.AddBezier($start, ([System.Drawing.PointF]::new(31.7 * $unit, 11.5 * $unit)), ([System.Drawing.PointF]::new(18.8 * $unit, 23.8 * $unit)), ([System.Drawing.PointF]::new(18.8 * $unit, 39.5 * $unit)))
    $path.AddBezier(([System.Drawing.PointF]::new(18.8 * $unit, 39.5 * $unit)), ([System.Drawing.PointF]::new(18.8 * $unit, 50.2 * $unit)), ([System.Drawing.PointF]::new(25.1 * $unit, 59.8 * $unit)), ([System.Drawing.PointF]::new(32.7 * $unit, 68.1 * $unit)))
    $path.AddBezier(([System.Drawing.PointF]::new(32.7 * $unit, 68.1 * $unit)), ([System.Drawing.PointF]::new(38.5 * $unit, 74.4 * $unit)), ([System.Drawing.PointF]::new(44.0 * $unit, 80.2 * $unit)), ([System.Drawing.PointF]::new(46.7 * $unit, 83.3 * $unit)))
    $path.AddBezier(([System.Drawing.PointF]::new(46.7 * $unit, 83.3 * $unit)), ([System.Drawing.PointF]::new(47.4 * $unit, 84.1 * $unit)), ([System.Drawing.PointF]::new(48.6 * $unit, 84.1 * $unit)), ([System.Drawing.PointF]::new(49.3 * $unit, 83.3 * $unit)))
    $path.AddBezier(([System.Drawing.PointF]::new(49.3 * $unit, 83.3 * $unit)), ([System.Drawing.PointF]::new(52.0 * $unit, 80.2 * $unit)), ([System.Drawing.PointF]::new(57.5 * $unit, 74.4 * $unit)), ([System.Drawing.PointF]::new(63.3 * $unit, 68.1 * $unit)))
    $path.AddBezier(([System.Drawing.PointF]::new(63.3 * $unit, 68.1 * $unit)), ([System.Drawing.PointF]::new(70.9 * $unit, 59.8 * $unit)), ([System.Drawing.PointF]::new(77.2 * $unit, 50.2 * $unit)), ([System.Drawing.PointF]::new(77.2 * $unit, 39.5 * $unit)))
    $path.AddBezier(([System.Drawing.PointF]::new(77.2 * $unit, 39.5 * $unit)), ([System.Drawing.PointF]::new(77.2 * $unit, 23.8 * $unit)), ([System.Drawing.PointF]::new(64.3 * $unit, 11.5 * $unit)), $start)
    $path.CloseFigure()
    return $path
  }
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

    $floorGlowBrush = New-Object System.Drawing.SolidBrush (New-ColorFromHex "#3447C8" $(if ($isMinimal) { 28 } else { 46 }))
    $Graphics.FillEllipse(
      $floorGlowBrush,
      $centerX - ($(if ($isMinimal) { 17.2 } else { 18.4 }) * $unit),
      ($(if ($isMinimal) { 77.0 } else { 76.9 }) * $unit),
      ($(if ($isMinimal) { 34.4 } else { 36.8 }) * $unit),
      ($(if ($isMinimal) { 5.2 } else { 5.8 }) * $unit)
    )

    $floorCoreBrush = New-Object System.Drawing.SolidBrush (New-ColorFromHex "#22D3EE" $(if ($isMinimal) { 44 } else { 68 }))
    $Graphics.FillEllipse(
      $floorCoreBrush,
      $centerX - ($(if ($isMinimal) { 9.9 } else { 10.6 }) * $unit),
      ($(if ($isMinimal) { 78.05 } else { 78.1 }) * $unit),
      ($(if ($isMinimal) { 19.8 } else { 21.2 }) * $unit),
      ($(if ($isMinimal) { 3.1 } else { 3.4 }) * $unit)
    )
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
    $highlightCenterX = $(if ($isMinimal) { 34.1 } else { 34.0 }) * $unit
    $highlightCenterY = $(if ($isMinimal) { 21.4 } else { 21.2 }) * $unit
    $highlightRadiusX = $(if ($isMinimal) { 10.2 } else { 10.8 }) * $unit
    $highlightRadiusY = $(if ($isMinimal) { 7.2 } else { 7.6 }) * $unit
    $Graphics.FillEllipse(
      $highlightBrush,
      $highlightCenterX - $highlightRadiusX,
      $highlightCenterY - $highlightRadiusY,
      $highlightRadiusX * 2,
      $highlightRadiusY * 2
    )
    $Graphics.Restore($clipState)
  }

  $nLeftX = $(if ($isMinimal) { 38.8 } else { 38.4 }) * $unit
  $nRightX = $(if ($isMinimal) { 56.9 } else { 57.6 }) * $unit
  $nTopY = $(if ($isMinimal) { 30.2 } else { 29.9 }) * $unit
  $nBottomY = $(if ($isMinimal) { 45.6 } else { 46.2 }) * $unit
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
