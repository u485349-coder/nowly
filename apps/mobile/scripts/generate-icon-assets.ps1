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

  $leftInnerColor = if ($Monochrome) { [System.Drawing.Color]::Transparent } else { New-ColorFromHex "#1D1142" 240 }
  $rightInnerColor = if ($Monochrome) { [System.Drawing.Color]::Transparent } else { New-ColorFromHex "#2B3170" 209 }
  $leftInnerBrush = New-Object System.Drawing.SolidBrush $leftInnerColor
  $rightInnerBrush = New-Object System.Drawing.SolidBrush $rightInnerColor

  if ($Monochrome) {
    $Graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
    $leftInnerBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
    $rightInnerBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
  }

  $signalRadius = $(if ($isMinimal) { 11.9 } else { 12.3 }) * $unit
  $signalCenterY = 37.8 * $unit
  $leftCenterX = $(if ($isMinimal) { 40.5 } else { 40.3 }) * $unit
  $rightCenterX = $(if ($isMinimal) { 55.5 } else { 55.7 }) * $unit
  $Graphics.FillEllipse(
    $leftInnerBrush,
    $leftCenterX - $signalRadius,
    $signalCenterY - $signalRadius,
    $signalRadius * 2,
    $signalRadius * 2
  )
  $Graphics.FillEllipse(
    $rightInnerBrush,
    $rightCenterX - $signalRadius,
    $signalCenterY - $signalRadius,
    $signalRadius * 2,
    $signalRadius * 2
  )

  if ($Monochrome) {
    $Graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
  }

  $nodeCenterX = 48.0 * $unit
  $nodeCenterY = 37.7 * $unit

  if (-not $Monochrome) {
    $overlapRectX = $(if ($isMinimal) { 42.6 } else { 42.4 }) * $unit
    $overlapRectY = $(if ($isMinimal) { 29.8 } else { 29.3 }) * $unit
    $overlapRectWidth = $(if ($isMinimal) { 13.0 } else { 13.5 }) * $unit
    $overlapRectHeight = $(if ($isMinimal) { 15.8 } else { 17.1 }) * $unit
    $overlapBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
      ([System.Drawing.RectangleF]::new($overlapRectX, $overlapRectY, $overlapRectWidth, $overlapRectHeight)),
      (New-ColorFromHex "#6366F1" $(if ($isMinimal) { 41 } else { 46 })),
      (New-ColorFromHex "#22D3EE" $(if ($isMinimal) { 87 } else { 102 })),
      35
    )
    $overlapBlend = New-Object System.Drawing.Drawing2D.ColorBlend
    $overlapBlend.Colors = [System.Drawing.Color[]]@(
      (New-ColorFromHex "#6366F1" $(if ($isMinimal) { 41 } else { 46 })),
      (New-ColorFromHex "#6366F1" $(if ($isMinimal) { 54 } else { 61 })),
      (New-ColorFromHex "#22D3EE" $(if ($isMinimal) { 87 } else { 102 }))
    )
    $overlapBlend.Positions = [single[]]@(0.0, 0.58, 1.0)
    $overlapBrush.InterpolationColors = $overlapBlend
    $leftOverlapPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $leftOverlapPath.AddEllipse($leftCenterX - $signalRadius, $signalCenterY - $signalRadius, $signalRadius * 2, $signalRadius * 2)
    $clipState = $Graphics.Save()
    $Graphics.SetClip($leftOverlapPath)
    $Graphics.FillEllipse(
      $overlapBrush,
      $rightCenterX - $signalRadius,
      $signalCenterY - $signalRadius,
      $signalRadius * 2,
      $signalRadius * 2
    )
    $Graphics.Restore($clipState)
  }

  $monogramPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  if ($isMinimal) {
    $monogramPath.AddLine(37.1 * $unit, 51.4 * $unit, 37.1 * $unit, 63.2 * $unit)
    $monogramPath.AddLine(37.1 * $unit, 63.2 * $unit, 58.8 * $unit, 51.6 * $unit)
    $monogramPath.AddLine(58.8 * $unit, 51.6 * $unit, 58.8 * $unit, 63.2 * $unit)
  } else {
    $monogramPath.AddLine(36.6 * $unit, 50.5 * $unit, 36.6 * $unit, 64.2 * $unit)
    $monogramPath.AddLine(36.6 * $unit, 64.2 * $unit, 59.4 * $unit, 50.7 * $unit)
    $monogramPath.AddLine(59.4 * $unit, 50.7 * $unit, 59.4 * $unit, 64.2 * $unit)
  }

  $monogramClip = $Graphics.Save()
  $Graphics.SetClip($pinPath)
  if ($Monochrome) {
    $monogramPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(52, 255, 255, 255)), ($(if ($isMinimal) { 3.2 } else { 3.6 }) * $unit)
  } else {
    $monogramBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
      ([System.Drawing.RectangleF]::new(
        ($(if ($isMinimal) { 36.8 } else { 36.4 }) * $unit),
        ($(if ($isMinimal) { 50.9 } else { 49.8 }) * $unit),
        ($(if ($isMinimal) { 22.3 } else { 23.4 }) * $unit),
        ($(if ($isMinimal) { 12.7 } else { 14.8 }) * $unit)
      )),
      (New-ColorFromHex "#F8FAFC" $(if ($isMinimal) { 51 } else { 61 })),
      (New-ColorFromHex "#22D3EE" $(if ($isMinimal) { 56 } else { 71 })),
      35
    )
    $monogramBlend = New-Object System.Drawing.Drawing2D.ColorBlend
    $monogramBlend.Colors = [System.Drawing.Color[]]@(
      (New-ColorFromHex "#F8FAFC" $(if ($isMinimal) { 51 } else { 61 })),
      (New-ColorFromHex "#C4B5FD" $(if ($isMinimal) { 36 } else { 46 })),
      (New-ColorFromHex "#22D3EE" $(if ($isMinimal) { 56 } else { 71 }))
    )
    $monogramBlend.Positions = [single[]]@(0.0, 0.54, 1.0)
    $monogramBrush.InterpolationColors = $monogramBlend
    $monogramPen = New-Object System.Drawing.Pen $monogramBrush, ($(if ($isMinimal) { 3.7 } else { 4.2 }) * $unit)
  }
  $monogramPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $monogramPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $monogramPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $Graphics.DrawPath($monogramPen, $monogramPath)
  $Graphics.Restore($monogramClip)

  $centerColor = if ($Monochrome) { [System.Drawing.Color]::White } else { New-ColorFromHex "#F8FAFC" }
  $centerBrush = New-Object System.Drawing.SolidBrush $centerColor
  $dotSize = 6.1 * $unit
  $Graphics.FillEllipse(
    $centerBrush,
    $nodeCenterX - ($dotSize / 2),
    $nodeCenterY - ($dotSize / 2),
    $dotSize,
    $dotSize
  )
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
