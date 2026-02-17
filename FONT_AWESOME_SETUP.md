# Font Awesome 6.5.1 Setup Instructions

## Problem
Icons were loading from CDN, causing failures in Vercel production. This fix bundles Font Awesome fonts locally.

## Required Font Files

Download Font Awesome 6.5.1 webfonts and place them in `public/assets/fonts/`:

| File | Source |
|------|--------|
| `fa-solid-900.woff2` | https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-solid-900.woff2 |
| `fa-solid-900.woff` | https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-solid-900.woff |
| `fa-regular-400.woff2` | https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-regular-400.woff2 |
| `fa-regular-400.woff` | https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-regular-400.woff |
| `fa-brands-400.woff2` | https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-brands-400.woff2 |
| `fa-brands-400.woff` | https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-brands-400.woff |

## Quick Download (PowerShell - Windows)

```powershell
$fonts = @(
    "fa-solid-900.woff2",
    "fa-solid-900.woff",
    "fa-regular-400.woff2",
    "fa-regular-400.woff",
    "fa-brands-400.woff2",
    "fa-brands-400.woff"
)

$targetDir = "public/assets/fonts"
if (-not (Test-Path $targetDir)) { New-Item -ItemType Directory -Path $targetDir -Force }

foreach ($font in $fonts) {
    $url = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/$font"
    $output = "$targetDir/$font"
    Write-Host "Downloading $font..."
    Invoke-WebRequest -Uri $url -OutFile $output -UseBasicParsing
}

Write-Host "✓ All fonts downloaded to $targetDir"
```

## Quick Download (Linux/Mac)

```bash
mkdir -p public/assets/fonts

fonts=(
  "fa-solid-900.woff2"
  "fa-solid-900.woff"
  "fa-regular-400.woff2"
  "fa-regular-400.woff"
  "fa-brands-400.woff2"
  "fa-brands-400.woff"
)

for font in "${fonts[@]}"; do
  echo "Downloading $font..."
  curl -o "public/assets/fonts/$font" \
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/$font"
done

echo "✓ All fonts downloaded"
```

## Verification

After downloading, verify directory structure:
```
public/
└── assets/
    ├── css/
    ├── fonts/
    │   ├── fa-brands-400.woff
    │   ├── fa-brands-400.woff2
    │   ├── fa-regular-400.woff
    │   ├── fa-regular-400.woff2
    │   ├── fa-solid-900.woff
    │   └── fa-solid-900.woff2
    └── js/
```

## Testing

1. Run `npm start`
2. Visit http://localhost:5000
3. Verify icon circles display icons (not just empty circles)
4. Deploy to Vercel and verify production icons render
