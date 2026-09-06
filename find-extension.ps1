# PowerShell script to find and copy SCELE Summary extension
# Run this script to automatically locate and copy the extension files

$ExtensionId = "gkejenggnbfacaomfddmpdedpjbjgabn"
$ProjectRoot = $PSScriptRoot
$DestinationFolder = Join-Path $ProjectRoot "extension"

Write-Host "Searching for SCELE Summary extension..." -ForegroundColor Cyan
Write-Host ""

# Possible Chrome extension locations
$ChromePaths = @(
    "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Extensions",
    "$env:LOCALAPPDATA\Google\Chrome\User Data\Profile 1\Extensions",
    "$env:LOCALAPPDATA\Google\Chrome\User Data\Profile 2\Extensions",
    "$env:APPDATA\Google\Chrome\User Data\Default\Extensions"
)

$FoundExtension = $false

foreach ($ChromePath in $ChromePaths) {
    $ExtensionPath = Join-Path $ChromePath $ExtensionId
    
    if (Test-Path $ExtensionPath) {
        Write-Host "[SUCCESS] Found extension at: $ExtensionPath" -ForegroundColor Green
        
        # Get the version folder (usually the only folder inside)
        $VersionFolders = Get-ChildItem -Path $ExtensionPath -Directory
        
        if ($VersionFolders.Count -eq 0) {
            Write-Host "[WARNING] No version folders found" -ForegroundColor Yellow
            continue
        }
        
        # Use the first (or only) version folder
        $SourceFolder = $VersionFolders[0].FullName
        Write-Host "[INFO] Version folder: $($VersionFolders[0].Name)" -ForegroundColor Cyan
        
        # Check if manifest.json exists
        $ManifestPath = Join-Path $SourceFolder "manifest.json"
        if (-not (Test-Path $ManifestPath)) {
            Write-Host "[ERROR] manifest.json not found in this folder" -ForegroundColor Red
            continue
        }
        
        Write-Host "[SUCCESS] manifest.json found!" -ForegroundColor Green
        Write-Host ""
        
        # Create destination folder if it doesn't exist
        if (-not (Test-Path $DestinationFolder)) {
            New-Item -ItemType Directory -Path $DestinationFolder | Out-Null
            Write-Host "[INFO] Created extension folder" -ForegroundColor Green
        }
        
        # Copy all files
        Write-Host "[INFO] Copying extension files..." -ForegroundColor Cyan
        Copy-Item -Path "$SourceFolder\*" -Destination $DestinationFolder -Recurse -Force
        
        Write-Host "[SUCCESS] Extension files copied successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "[INFO] Extension location: $DestinationFolder" -ForegroundColor Cyan
        
        # List copied files
        Write-Host ""
        Write-Host "Copied files:" -ForegroundColor Cyan
        Get-ChildItem -Path $DestinationFolder | ForEach-Object {
            Write-Host "  - $($_.Name)" -ForegroundColor Gray
        }
        
        $FoundExtension = $true
        break
    }
}

if (-not $FoundExtension) {
    Write-Host "[ERROR] Extension not found in any Chrome profile" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possible reasons:" -ForegroundColor Yellow
    Write-Host "  1. Extension is not installed in Chrome" -ForegroundColor Gray
    Write-Host "  2. Extension is installed in a different browser" -ForegroundColor Gray
    Write-Host "  3. Extension is installed in a non-default profile" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Solutions:" -ForegroundColor Yellow
    Write-Host "  1. Install the extension from Chrome Web Store" -ForegroundColor Gray
    Write-Host "  2. Check if extension ID is correct: $ExtensionId" -ForegroundColor Gray
    Write-Host "  3. Manually copy extension files to: $DestinationFolder" -ForegroundColor Gray
    Write-Host ""
    Write-Host "See EXTENSION_EXTRACTION_GUIDE.md for detailed instructions" -ForegroundColor Cyan
    exit 1
}

Write-Host ""
Write-Host "[SUCCESS] Done! You can now continue with the setup." -ForegroundColor Green
Write-Host "[INFO] Next step: Follow SETUP_GUIDE.md to configure Google Cloud and GitHub" -ForegroundColor Cyan

# Made with Bob
