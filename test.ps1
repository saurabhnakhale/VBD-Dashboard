 = Get-Content -Raw wards.geojson | ConvertFrom-Json
Write-Host .features.Count
.features | ForEach-Object { Write-Host .properties.name }