$ErrorActionPreference = "Stop"

Write-Host "Installing the official Kaggle CLI..."
python -m pip install --upgrade kaggle

Write-Host ""
Write-Host "Starting Kaggle authentication..."
Write-Host "A browser may open. Complete the Kaggle login/authorization." 
kaggle auth login

Write-Host ""
Write-Host "Authentication complete. Verify with:"
Write-Host "  kaggle datasets files andrihjonior/cert-insider-threat-dataset-r4-2"
