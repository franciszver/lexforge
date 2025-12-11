# Helper script to launch Amplify Sandbox
# Usage: .\sandbox.ps1

$env:AWS_REGION = "us-west-2"
Write-Host "Starting Amplify Sandbox (us-west-2) with profile 'default4'..." -ForegroundColor Cyan
npx ampx sandbox --profile default4
