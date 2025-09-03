#!/usr/bin/env pwsh
# Generates compact JSON from HTML files


param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$InputFile
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
                } else {
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
    } else {
        return "null"
    }
}


# --- Main Script ---


if (-not (Test-Path $InputFile)) {
    Write-Error "File not found: $InputFile"
    exit 1
}


$content = Get-Content -Path $InputFile -Raw -Encoding UTF8


# Extract title and step name
$titleMatch = [regex]::Match($content, '<title>(.*?)</title>')
if ($titleMatch.Success) {
    $title = $titleMatch.Groups[1].Value
} else {
    $title = ""
}


$stepNameMatch = [regex]::Match($title, '([A-Z]{3}-[0-9]{5})')
if (-not $stepNameMatch.Success) {
    Write-Warning "No step name found in '$InputFile'. Skipping."
    exit 0
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
} else {
    $stepTitle = ""
}


# Extract predecessor
$predPattern = '(?s)<div[^>]*class="table-excerpt tei[^"]*"[^>]*data-name="Predecessor"[^>]*>.*?([A-Z]{3}-[0-9]{1,5}(-[A-Za-z])?)'
$predMatch = [regex]::Match($content, $predPattern)
$stepPredecessor = if ($predMatch.Success) { $predMatch.Groups[1].Value } else { "" }


# Extract successor
$succPattern = '(?s)<div[^>]*class="table-excerpt tei[^"]*"[^>]*data-name="Successor"[^>]*>.*?([A-Z]{3}-[0-9]{1,5}(-[A-Za-z])?)'
$succMatch = [regex]::Match($content, $succPattern)
$stepSuccessor = if ($succMatch.Success) { $succMatch.Groups[1].Value } else { "" }


# Extract teams and other data
$stepAssignedTeam = Extract-SingleTeam -DataName "Primary_Assignee" -Content $content
$stepImpactedTeams = Extract-MultipleTeams -DataName "Impacted_Teams" -Content $content
$stepInstructions = Extract-Instructions -Content $content
$stepMacroTimeSequence = Extract-MacroTimeSequence -Content $content
$stepTimeSequence = Extract-TimeSequence -Content $content


# Prepare output path
$fileName = [System.IO.Path]::GetFileNameWithoutExtension($InputFile)
$baseDir = [System.IO.Path]::GetDirectoryName($InputFile)


if ($baseDir -notmatch 'json$') {
    $outDir = Join-Path $baseDir "json"
} else {
    $outDir = $baseDir
}


if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}


$outFile = Join-Path $outDir "$fileName.json"


# Validate step number for JSON
$stepNumberJson = Validate-JsonNumber -Value $stepNumber


# Create JSON object
$jsonObject = @{
    step_name = $stepName
    step_type = $stepType
    step_number = if ($stepNumberJson -eq "null") { $null } else { [int]$stepNumberJson }
    step_title = $stepTitle
    step_predecessor = $stepPredecessor
    step_successor = $stepSuccessor
    step_assigned_team = $stepAssignedTeam
    step_impacted_teams = $stepImpactedTeams
    step_macro_time_sequence = $stepMacroTimeSequence
    step_time_sequence = $stepTimeSequence
    step_instructions = if ($stepInstructions -eq "[]") { @() } else { $stepInstructions | ConvertFrom-Json }
}


# Convert to compact JSON and save
$jsonObject | ConvertTo-Json -Compress -Depth 10 | Set-Content -Path $outFile -Encoding UTF8


Write-Host "JSON file created: $outFile"

