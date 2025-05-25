# PowerShell script to create GitHub repository using API
# Usage: .\create-github-repo.ps1

Write-Host "🚀 HealthOS Web MVP - GitHub Repository Creation Script" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green

# Repository details
$repoName = "healthos-web"
$description = "HealthOS Web MVP - Comprehensive health data management platform with Google Fit integration, AI-powered lab report processing, and intelligent health assistant"
$username = "prajvalrasik"

Write-Host ""
Write-Host "Repository Details:" -ForegroundColor Yellow
Write-Host "  Name: $repoName" -ForegroundColor White
Write-Host "  Owner: $username" -ForegroundColor White
Write-Host "  Description: $description" -ForegroundColor White
Write-Host "  Visibility: Public" -ForegroundColor White
Write-Host ""

# Prompt for Personal Access Token
Write-Host "To create the repository, you need a GitHub Personal Access Token." -ForegroundColor Cyan
Write-Host "If you don't have one, create it at: https://github.com/settings/tokens" -ForegroundColor Cyan
Write-Host "Required scopes: 'repo' (Full control of private repositories)" -ForegroundColor Cyan
Write-Host ""

$token = Read-Host "Enter your GitHub Personal Access Token" -AsSecureString
$tokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($token))

if ([string]::IsNullOrEmpty($tokenPlain)) {
    Write-Host "❌ No token provided. Exiting..." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔄 Creating repository..." -ForegroundColor Yellow

# Create repository using GitHub API
$headers = @{
    "Authorization" = "token $tokenPlain"
    "Accept" = "application/vnd.github.v3+json"
    "User-Agent" = "HealthOS-Web-MVP"
}

$body = @{
    "name" = $repoName
    "description" = $description
    "private" = $false
    "has_issues" = $true
    "has_projects" = $true
    "has_wiki" = $true
    "auto_init" = $false
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method POST -Headers $headers -Body $body -ContentType "application/json"
    
    Write-Host "✅ Repository created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Repository Details:" -ForegroundColor Yellow
    Write-Host "  URL: $($response.html_url)" -ForegroundColor White
    Write-Host "  Clone URL (HTTPS): $($response.clone_url)" -ForegroundColor White
    Write-Host "  Clone URL (SSH): $($response.ssh_url)" -ForegroundColor White
    Write-Host ""
    
    Write-Host "🔄 Pushing code to GitHub..." -ForegroundColor Yellow
    
    # Push code to GitHub
    git push -u origin main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Code pushed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🎉 Repository setup complete!" -ForegroundColor Green
        Write-Host "   Repository URL: $($response.html_url)" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Next Steps:" -ForegroundColor Yellow
        Write-Host "  1. Deploy to Vercel: https://vercel.com/new" -ForegroundColor White
        Write-Host "  2. Configure environment variables" -ForegroundColor White
        Write-Host "  3. Test production deployment" -ForegroundColor White
    } else {
        Write-Host "❌ Failed to push code. You may need to authenticate with Git." -ForegroundColor Red
        Write-Host "   Try: git push -u origin main" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Failed to create repository:" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "   Check your Personal Access Token and permissions." -ForegroundColor Yellow
    } elseif ($_.Exception.Response.StatusCode -eq 422) {
        Write-Host "   Repository might already exist or name is invalid." -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Manual Alternative:" -ForegroundColor Cyan
    Write-Host "  1. Go to https://github.com/new" -ForegroundColor White
    Write-Host "  2. Create repository named: $repoName" -ForegroundColor White
    Write-Host "  3. Run: git push -u origin main" -ForegroundColor White
}

# Clear token from memory
$tokenPlain = $null
$token = $null

Write-Host ""
Write-Host "Script completed." -ForegroundColor Green 