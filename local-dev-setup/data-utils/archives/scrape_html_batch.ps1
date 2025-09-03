#!/usr/bin/env pwsh
# scrape_html_batch.ps1 : Enhanced PowerShell version with wildcard/batch support
# Generates compact JSON from HTML files - supports single file or batch processing

param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$InputPath,
    
    [Parameter(Mandatory=$false)]
    [switch]$Recursive,
    
    [Parameter(Mandatory=$false)]
    [switch]$VerboseOutput
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# --- Helper Functions ---

function Extract-SingleTeam {
    param(
        [string]$DataName,
        [string]$Content
    )
    
    $lines = $Content -split "`n"
    $state = 0
    
    foreach ($line in $lines) {
        if ($state -eq 0 -and $line -match "data-name=`"$DataName`"") {
            $state = 1
            continue
        }
        if ($state -eq 1) {
            if ($line -match "</div>") { $state = 0 }
            if ($line -match 'class="[^"]*aui-lozenge[^"]*"') { $state = 2 }
            continue
        }
        if ($state -eq 2) {
            if ($line -match ">") { $state = 3 }
            continue
        }
        if ($state -eq 3) {
            $cleanLine = $line -replace '<[^>]+>', '' -replace '^\s+|\s+$', ''
            if ($cleanLine -ne "") {
                return $cleanLine
            }
        }
    }
    return ""
}

function Extract-MultipleTeams {
    param(
        [string]$DataName,
        [string]$Content
    )
    
    $lines = $Content -split "`n"
    $state = 0
    $teams = @()
    
    foreach ($line in $lines) {
        if ($state -eq 0 -and $line -match "data-name=`"$DataName`"") {
            $state = 1
            continue
        }
        if ($state -eq 1) {
            if ($line -match "</div>") { break }
            if ($line -match 'class="[^"]*aui-lozenge[^"]*"') { 
                $state = 2 
            }
            continue
        }
        if ($state -eq 2) {
            if ($line -match ">") { $state = 3 }
            continue
        }
        if ($state -eq 3) {
            $cleanLine = $line -replace '<[^>]+>', '' -replace '^\s+|\s+$', ''
            if ($cleanLine -ne "" -and $cleanLine -ne "-") {
                $teams += $cleanLine
            }
            $state = 1
        }
    }
    return $teams -join ","
}

function Extract-Instructions {
    param(
        [string]$Content
    )
    
    # Extract table block between TASKLIST header and </table>
    $pattern = '(?s)<h1[^>]*id="[^"]*-TASKLIST"[^>]*>.*?</table>'
    if ($Content -match $pattern) {
        $tableBlock = $Matches[0]
        
        # Remove newlines and split by </tr>
        $tableBlock = $tableBlock -replace "`r`n", "" -replace "`n", ""
        $rows = $tableBlock -split '</tr>'
        
        $instructions = @()
        
        foreach ($row in $rows) {
            # Skip header row
            if ($row -match 'Assigned to') { continue }
            
            # Extract cells
            $cells = $row -split '<td'
            if ($cells.Count -gt 3) {
                # Extract ID
                $idCell = $cells[1] -replace '^[^>]+>', '' -replace '</td>.*', ''
                if ($idCell -match '([A-Z]{3}-[0-9]+(-[0-9]+)?)') {
                    $id = $Matches[1]
                }
                else {
                    $id = ""
                }
                
                # Extract text
                $textCell = $cells[2] -replace '^[^>]+>', '' -replace '</td>.*', ''
                $text = $textCell -replace '<[^>]+>', '' -replace '&nbsp;', ' ' -replace '^\s+|\s+$', ''
                $text = $text -replace '"', '\"'
                
                # Extract assignee
                $assigneeCell = $cells[3] -replace '^[^>]+>', '' -replace '</td>.*', ''
                $assignee = $assigneeCell -replace '<[^>]+>', '' -replace '&nbsp;', ' ' -replace '^\s+|\s+$', ''
                
                if ($id -ne "") {
                    $instructions += @{
                        id = $id
                        text = $text
                        assignee = $assignee
                    }
                }
            }
        }
        
        return $instructions | ConvertTo-Json -Compress
    }
    
    return "[]"
}

function Extract-MacroTimeSequence {
    param(
        [string]$Content
    )
    
    $pattern = '(?s)data-name="Macro_Time_Sequence"[^>]*>(.*?)</div>'
    if ($Content -match $pattern) {
        $buffer = $Matches[1]
        $buffer = $buffer -replace '<[^>]+>', ' ' -replace '&nbsp;', ' '
        $buffer = $buffer -replace '^\s+|\s+$', '' -replace '\s{2,}', ' '
        return $buffer
    }
    return ""
}

function Extract-TimeSequence {
    param(
        [string]$Content
    )
    
    $pattern = '(?s)data-name="Time_Sequence"[^>]*>(.*?)</div>'
    if ($Content -match $pattern) {
        $buffer = $Matches[1]
        $buffer = $buffer -replace '<[^>]+>', ' ' -replace '&nbsp;', ' '
        $buffer = $buffer -replace '^\s+|\s+$', '' -replace '\s{2,}', ' '
        return $buffer
    }
    return ""
}

function Validate-JsonNumber {
    param(
        [string]$Value
    )
    
    if ($Value -match '^-?[0-9]+$') {
        return $Value
    }
    else {
        return "null"
    }
}

function Process-HtmlFile {
    param(
        [string]$FilePath
    )
    
    if (-not (Test-Path $FilePath)) {
        Write-Warning "File not found: $FilePath"
        return
    }
    
    if ($VerboseOutput) {
        Write-Host "Processing: $FilePath" -ForegroundColor Cyan
    }
    
    $content = Get-Content -Path $FilePath -Raw -Encoding UTF8
    
    # Extract title and step name
    $titleMatch = [regex]::Match($content, '<title>(.*?)</title>')
    if ($titleMatch.Success) {
        $title = $titleMatch.Groups[1].Value
    }
    else {
        $title = ""
    }
    
    $stepNameMatch = [regex]::Match($title, '([A-Z]{3}-[0-9]{5})')
    if (-not $stepNameMatch.Success) {
        Write-Warning "No step name found in '$FilePath'. Skipping."
        return
    }
    
    $stepName = $stepNameMatch.Groups[1].Value
    $stepType = $stepName.Split('-')[0]
    $stepNumber = $stepName.Split('-')[1] -replace '^0+', ''
    
    # Extract step title
    $titlePattern = '(?s)<div[^>]*class="table-excerpt tei[^"]*"[^>]*data-name="TITLE"[^>]*>.*?<strong>(.*?)</strong>'
    $titleMatch = [regex]::Match($content, $titlePattern)
    if ($titleMatch.Success) {
        $stepTitle = $titleMatch.Groups[1].Value
        $stepTitle = $stepTitle -replace '<[^>]+>', ''
        $stepTitle = $stepTitle -replace '^\s+|\s+$', ''
        $stepTitle = $stepTitle -replace '( - [^ -]+( [0-9]+)? PART *[0-9]+)$', ''
        $stepTitle = $stepTitle -replace '( - [0-9]+)$', ''
        $stepTitle = $stepTitle -replace '[\r\n\t]', ''
        $stepTitle = $stepTitle -replace '"', '\"'
    }
    else {
        $stepTitle = ""
    }
    
    # Extract predecessor
    $predPattern = '(?s)<div[^>]*class="table-excerpt tei[^"]*"[^>]*data-name="Predecessor"[^>]*>.*?([A-Z]{3}-[0-9]{1,5}(-[A-Za-z])?)'
    $predMatch = [regex]::Match($content, $predPattern)
    if ($predMatch.Success) {
        $stepPredecessor = $predMatch.Groups[1].Value
    }
    else {
        $stepPredecessor = ""
    }
    
    # Extract successor
    $succPattern = '(?s)<div[^>]*class="table-excerpt tei[^"]*"[^>]*data-name="Successor"[^>]*>.*?([A-Z]{3}-[0-9]{1,5}(-[A-Za-z])?)'
    $succMatch = [regex]::Match($content, $succPattern)
    if ($succMatch.Success) {
        $stepSuccessor = $succMatch.Groups[1].Value
    }
    else {
        $stepSuccessor = ""
    }
    
    # Extract teams and other data
    $stepAssignedTeam = Extract-SingleTeam -DataName "Primary_Assignee" -Content $content
    $stepImpactedTeams = Extract-MultipleTeams -DataName "Impacted_Teams" -Content $content
    $stepInstructions = Extract-Instructions -Content $content
    $stepMacroTimeSequence = Extract-MacroTimeSequence -Content $content
    $stepTimeSequence = Extract-TimeSequence -Content $content
    
    # Prepare output path
    $fileName = [System.IO.Path]::GetFileNameWithoutExtension($FilePath)
    $baseDir = [System.IO.Path]::GetDirectoryName($FilePath)
    
    if ($baseDir -notmatch 'json$') {
        $outDir = Join-Path $baseDir "json"
    }
    else {
        $outDir = $baseDir
    }
    
    if (-not (Test-Path $outDir)) {
        New-Item -ItemType Directory -Path $outDir -Force | Out-Null
    }
    
    $outFile = Join-Path $outDir "$fileName.json"
    
    # Validate step number for JSON
    $stepNumberJson = Validate-JsonNumber -Value $stepNumber
    
    # Create JSON object
    if ($stepNumberJson -eq "null") {
        $stepNumberValue = $null
    }
    else {
        $stepNumberValue = [int]$stepNumberJson
    }
    
    if ($stepInstructions -eq "[]") {
        $stepInstructionsValue = @()
    }
    else {
        $stepInstructionsValue = $stepInstructions | ConvertFrom-Json
    }
    
    $jsonObject = @{
        step_name = $stepName
        step_type = $stepType
        step_number = $stepNumberValue
        step_title = $stepTitle
        step_predecessor = $stepPredecessor
        step_successor = $stepSuccessor
        step_assigned_team = $stepAssignedTeam
        step_impacted_teams = $stepImpactedTeams
        step_macro_time_sequence = $stepMacroTimeSequence
        step_time_sequence = $stepTimeSequence
        step_instructions = $stepInstructionsValue
    }
    
    # Convert to compact JSON and save
    $jsonObject | ConvertTo-Json -Compress -Depth 10 | Set-Content -Path $outFile -Encoding UTF8
    
    Write-Host "✓ Created: $outFile" -ForegroundColor Green
}

# --- Main Script ---

Write-Host "" -ForegroundColor Yellow
Write-Host "=== HTML to JSON Converter ===" -ForegroundColor Yellow
Write-Host "Input: $InputPath" -ForegroundColor Cyan

# Determine if input is a file or pattern
if (Test-Path $InputPath -PathType Leaf) {
    # Single file
    Write-Host "Processing single file..." -ForegroundColor Yellow
    Process-HtmlFile -FilePath $InputPath
}
else {
    # Pattern or directory
    Write-Host "Processing multiple files..." -ForegroundColor Yellow
    
    # Get all matching HTML files
    $searchParams = @{
        Path = $InputPath
        ErrorAction = 'SilentlyContinue'
    }
    
    if ($Recursive) {
        $searchParams['Recurse'] = $true
        Write-Host "Recursive search enabled" -ForegroundColor Cyan
    }
    
    $files = @(Get-ChildItem @searchParams | Where-Object { $_.Extension -eq '.html' })
    
    if ($files.Count -eq 0) {
        Write-Warning "No HTML files found matching: $InputPath"
        exit 1
    }
    
    Write-Host "Found $($files.Count) HTML file(s) to process" -ForegroundColor Cyan
    Write-Host "" -ForegroundColor Cyan
    
    $processed = 0
    $skipped = 0
    
    foreach ($file in $files) {
        try {
            Process-HtmlFile -FilePath $file.FullName
            $processed++
        }
        catch {
            Write-Error "Error processing $($file.Name): $_"
            $skipped++
        }
    }
    
    Write-Host "" -ForegroundColor Yellow
    Write-Host "=== Summary ===" -ForegroundColor Yellow
    Write-Host "Processed: $processed files" -ForegroundColor Green
    if ($skipped -gt 0) {
        Write-Host "Skipped: $skipped files" -ForegroundColor Red
    }

}

Write-Host "Done!" -ForegroundColor Green