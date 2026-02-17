#!/usr/bin/env powershell
# Font Awesome 6.5.1 - Auto Download Script
# Run this to complete the icon fix

# Font files to download
$fonts = @(
    @{ name = "fa-solid-900.woff2"; url = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-solid-900.woff2" },
    @{ name = "fa-regular-400.woff2"; url = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-regular-400.woff2" },
    @{ name = "fa-brands-400.woff2"; url = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-brands-400.woff2" },
    @{ name = "fa-solid-900.woff"; url = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff" },
    @{ name = "fa-regular-400.woff"; url = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.woff" },
    @{ name = "fa-brands-400.woff"; url = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff" }
)

# Setup target directory
$targetDir = "./public/assets/fonts"
if (-not (Test-Path $targetDir)) {
    Write-Host "Creating directory: $targetDir" -ForegroundColor Green
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

# Download fonts
Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "Font Awesome 6.5.1 Font Downloader" -ForegroundColor Cyan
Write-Host "======================================`n" -ForegroundColor Cyan

$successCount = 0
$failCount = 0

foreach ($font in $fonts) {
    $output = "$targetDir/$($font.name)"
    $size = 0
    
    try {
        Write-Host "Downloading: $($font.name)..." -NoNewline
        $response = Invoke-WebRequest -Uri $font.url -OutFile $output -UseBasicParsing -ErrorAction Stop
        
        if (Test-Path $output) {
            $fileSize = (Get-Item $output).Length / 1KB
            Write-Host " [OK] ($([Math]::Round($fileSize, 0)) KB)" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host " [FAILED] (file not created)" -ForegroundColor Red
            $failCount++
        }
    } catch {
        Write-Host " [FAILED] ($($_.Exception.Message))" -ForegroundColor Red
        $failCount++
    }
}

# Summary
Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "Download Summary" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Success: $successCount/6" -ForegroundColor $(if ($successCount -eq 6) { 'Green' } else { 'Yellow' })
Write-Host "Failed:  $failCount/6" -ForegroundColor $(if ($failCount -eq 0) { 'Green' } else { 'Red' })

# Verify
Write-Host "`nVerifying installation..." -ForegroundColor Cyan
$installedFonts = @(Get-ChildItem $targetDir -Filter "*.woff*" 2>$null).Count
Write-Host "Fonts in $targetDir : $installedFonts/6" -ForegroundColor $(if ($installedFonts -eq 6) { 'Green' } else { 'Yellow' })

if ($successCount -eq 6 -and $installedFonts -eq 6) {
    Write-Host "`n[SUCCESS] All fonts downloaded!" -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "  1. Run: npm start" -ForegroundColor White
    Write-Host "  2. Visit: http://localhost:5000" -ForegroundColor White
    Write-Host "  3. Check icon-circle elements (should show icons)" -ForegroundColor White
    Write-Host "  4. Deploy to Vercel" -ForegroundColor White
} else {
    Write-Host "`n[WARNING] Some fonts failed to download" -ForegroundColor Yellow
    Write-Host "   Try running again or manually download from:" -ForegroundColor Yellow
    Write-Host "   https://cdnjs.com/libraries/font-awesome/6.5.1" -ForegroundColor Yellow
}

Write-Host "`n"
