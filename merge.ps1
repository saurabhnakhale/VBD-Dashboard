$raw = Get-Content -Raw "wards_utf8.geojson"
$j = ConvertFrom-Json $raw

$f29 = [PSCustomObject]@{
    type = 'Feature'
    properties = [PSCustomObject]@{
        name = 'Prabhag No. 29'
        description = 'Zone No 3. Hanuman Nagar'
    }
    geometry = [PSCustomObject]@{
        type = 'Polygon'
        coordinates = @(
            @(
                @(79.0882, 21.1060),
                @(79.1112, 21.1060),
                @(79.1112, 21.1250),
                @(79.0882, 21.1250),
                @(79.0882, 21.1060)
            )
        )
    }
}

$f31 = [PSCustomObject]@{
    type = 'Feature'
    properties = [PSCustomObject]@{
        name = 'Prabhag No. 31'
        description = 'Zone No 3. Hanuman Nagar'
    }
    geometry = [PSCustomObject]@{
        type = 'Polygon'
        coordinates = @(
            @(
                @(79.0882, 21.0850),
                @(79.1180, 21.0850),
                @(79.1180, 21.1060),
                @(79.0882, 21.1060),
                @(79.0882, 21.0850)
            )
        )
    }
}

$f32 = [PSCustomObject]@{
    type = 'Feature'
    properties = [PSCustomObject]@{
        name = 'Prabhag No. 32'
        description = 'Zone No 3. Hanuman Nagar'
    }
    geometry = [PSCustomObject]@{
        type = 'Polygon'
        coordinates = @(
            @(
                @(79.0882, 21.0500),
                @(79.1250, 21.0500),
                @(79.1250, 21.0850),
                @(79.0882, 21.0850),
                @(79.0882, 21.0500)
            )
        )
    }
}

$f34 = [PSCustomObject]@{
    type = 'Feature'
    properties = [PSCustomObject]@{
        name = 'Prabhag No. 34'
        description = 'Zone No 3. Hanuman Nagar'
    }
    geometry = [PSCustomObject]@{
        type = 'Polygon'
        coordinates = @(
            @(
                @(79.1180, 21.0850),
                @(79.1450, 21.0850),
                @(79.1450, 21.1250),
                @(79.1180, 21.1250),
                @(79.1180, 21.0850)
            )
        )
    }
}

$list = [System.Collections.ArrayList]::new()
foreach ($feat in $j.features) {
    $null = $list.Add($feat)
}
$null = $list.Add($f29)
$null = $list.Add($f31)
$null = $list.Add($f32)
$null = $list.Add($f34)

$j.features = $list
$jsonStr = ConvertTo-Json $j -Depth 10

[System.IO.File]::WriteAllText("C:\Users\msuna\.gemini\antigravity-ide\scratch\vbd-health-dashboard\wards.geojson", $jsonStr, [System.Text.Encoding]::UTF8)

$mappingStr = Get-Content -Raw "C:\Users\msuna\.gemini\antigravity-ide\scratch\vbd-health-dashboard\ward_zone_mapping.json"
$jsContent = "const WARDS_GEOJSON = " + $jsonStr + ";" + [Environment]::NewLine + "const WARD_ZONE_MAPPING = " + $mappingStr + ";"

[System.IO.File]::WriteAllText("C:\Users\msuna\.gemini\antigravity-ide\scratch\vbd-health-dashboard\js\wardsData.js", $jsContent, [System.Text.Encoding]::UTF8)
Write-Host "Success! Total features: " $list.Count
