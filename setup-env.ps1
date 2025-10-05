# Fox Trading Platform - Environment Setup Script
# Run this script to set up your development environment

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "prod")]
    [string]$Environment
)

$apiPath = "api"

switch ($Environment) {
    "dev" {
        Write-Host "🦊 Setting up DEVELOPMENT environment..." -ForegroundColor Green
        
        if (Test-Path "$apiPath\.env.local") {
            Copy-Item "$apiPath\.env.local" "$apiPath\.env" -Force
            Write-Host "✅ Copied .env.local to .env" -ForegroundColor Green
        } else {
            Write-Host "❌ .env.local not found. Please create it first." -ForegroundColor Red
            Write-Host "📝 Use the template in .env.example and add your actual values." -ForegroundColor Yellow
            exit 1
        }
        
        Write-Host "🚀 Development environment ready!" -ForegroundColor Green
        Write-Host "💡 Your actual secrets are now in api/.env for local development" -ForegroundColor Cyan
    }
    
    "prod" {
        Write-Host "🏭 Setting up PRODUCTION placeholders..." -ForegroundColor Yellow
        
        if (Test-Path "$apiPath\.env.example") {
            Copy-Item "$apiPath\.env.example" "$apiPath\.env" -Force
            Write-Host "✅ Copied .env.example to .env (placeholders only)" -ForegroundColor Yellow
        } else {
            Write-Host "❌ .env.example not found." -ForegroundColor Red
            exit 1
        }
        
        Write-Host "⚠️  Production placeholders set!" -ForegroundColor Yellow
        Write-Host "🔧 Remember to set actual environment variables in your production environment" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "📚 Next steps:" -ForegroundColor Magenta
Write-Host "  1. cd api" -ForegroundColor White
Write-Host "  2. npm run dev" -ForegroundColor White
Write-Host ""