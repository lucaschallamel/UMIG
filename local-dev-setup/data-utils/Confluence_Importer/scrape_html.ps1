# scrape_html.ps1: Extracts step_name, step_type, step_number from exported HTML files in rawData/
# Usage: .\scrape_html.ps1 rawData/input.html

param(
    [Parameter(Mandatory=$true)]
    [string]$InFile
)

# Extract <title> content
$title = (Select-String -Path $InFile -Pattern '<title>(.*?)</title>').Matches[0].Groups[1].Value

# Extract step_name (XXX-nnnnn)
if ($title -match '([A-Z]{3}-\d{5})') {
    $step_name = $Matches[1]
    $step_type = $step_name.Substring(0,3)
    $step_number = [int]$step_name.Substring(4)
} else {
    $step_name = ""
    $step_type = ""
    $step_number = 0
}

# Output as JSON
$json = @{
    step_name = $step_name
    step_type = $step_type
    step_number = $step_number
} | ConvertTo-Json -Depth 2
Write-Output $json
