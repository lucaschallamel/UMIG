#!/usr/bin/env pwsh
# scrape_html_batch_v4.ps1 : Enhanced version with complete attribute extraction
# Processes HTML files to JSON with all required fields in specified order

param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$InputPath,
    
    [Parameter(Mandatory=$false)]
    [switch]$Recursive,
    
    [Parameter(Mandatory=$false)]
    [switch]$VerboseOutput,
    
    [Parameter(Mandatory=$false)]
    [switch]$NoQualityChecks,
    
    [Parameter(Mandatory=$false)]
    [switch]$ExportReport
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# --- Helper Functions ---

# Quality Check Functions
function Validate-JsonStructure {
    param(
        [string]$JsonString
    )
    
    try {
        $null = $JsonString | ConvertFrom-Json
        return $true
    } catch {
        Write-Warning "Invalid JSON structure: $_"
        return $false
    }
}

function Validate-RequiredFields {
    param(
        [hashtable]$JsonObject
    )
    
    $requiredFields = @('step_type', 'step_number', 'title', 'task_list')
    $missingFields = @()
    
    foreach ($field in $requiredFields) {
        if (-not $JsonObject.ContainsKey($field)) {
            $missingFields += $field
        }
    }
    
    if ($missingFields.Count -gt 0) {
        Write-Warning "Missing required fields: $($missingFields -join ', ')"
        return $false
    }
    
    return $true
}

function Get-QualityMetrics {
    param(
        [hashtable]$JsonObject,
        [string]$FilePath
    )
    
    $metrics = @{
        FileName = [System.IO.Path]::GetFileName($FilePath)
        HasTitle = ($JsonObject.title -ne "" -and $null -ne $JsonObject.title)
        HasInstructions = ($JsonObject.ContainsKey('task_list') -and $JsonObject.task_list -ne "[]")
        InstructionCount = 0
        HasPredecessor = ($JsonObject.predecessor -ne "" -and $null -ne $JsonObject.predecessor)
        HasSuccessor = ($JsonObject.successor -ne "" -and $null -ne $JsonObject.successor)
        HasPrimaryTeam = ($JsonObject.primary_team -ne "" -and $null -ne $JsonObject.primary_team)
        HasImpactedTeams = ($JsonObject.impacted_teams -ne "" -and $null -ne $JsonObject.impacted_teams)
        MarkdownConversion = $false
    }
    
    # Count instructions
    if ($JsonObject.ContainsKey('task_list') -and $JsonObject.task_list -ne "[]") {
        try {
            $taskList = $JsonObject.task_list | ConvertFrom-Json
            $metrics.InstructionCount = $taskList.Count
            
            # Check if any instruction has markdown formatting
            foreach ($task in $taskList) {
                if ($task.instruction_title -match '\*\*|__|~~|##|^-\s|^\d+\.\s|\[.*\]\(.*\)') {
                    $metrics.MarkdownConversion = $true
                    break
                }
            }
        } catch {
            $metrics.InstructionCount = 0
        }
    }
    
    return $metrics
}

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

function Convert-HtmlToMarkdown {
    param(
        [string]$HtmlContent
    )
    
    # Process HTML content to Markdown
    $markdown = $HtmlContent
    
    # Handle nested list items properly first
    # Process nested lists before main list conversion
    $nestedLevel = 0
    while ($markdown -match '(<ul[^>]*>.*?<ul[^>]*>.*?</ul>.*?</ul>)|(<ol[^>]*>.*?<ol[^>]*>.*?</ol>.*?</ol>)') {
        $nestedLevel++
        # Mark nested lists temporarily
        $markdown = $markdown -replace '(<ul[^>]*>)(.*?)(<ul[^>]*>)', '$1$2[NESTED_UL_START]'
        $markdown = $markdown -replace '(</ul>)(.*?)(</ul>)', '[NESTED_UL_END]$2$3'
        $markdown = $markdown -replace '(<ol[^>]*>)(.*?)(<ol[^>]*>)', '$1$2[NESTED_OL_START]'
        $markdown = $markdown -replace '(</ol>)(.*?)(</ol>)', '[NESTED_OL_END]$2$3'
    }
    
    # Convert paragraphs and line breaks
    $markdown = $markdown -replace '<br\s*/?>', "`n"
    $markdown = $markdown -replace '</p>\s*<p[^>]*>', "`n`n"
    $markdown = $markdown -replace '<p[^>]*>', ''
    $markdown = $markdown -replace '</p>', "`n"
    
    # Convert bold tags (handle nested tags)
    $markdown = $markdown -replace '<strong[^>]*>', '**'
    $markdown = $markdown -replace '</strong>', '**'
    $markdown = $markdown -replace '<b[^>]*>', '**'
    $markdown = $markdown -replace '</b>', '**'
    
    # Convert italic tags
    $markdown = $markdown -replace '<em[^>]*>', '_'
    $markdown = $markdown -replace '</em>', '_'
    $markdown = $markdown -replace '<i[^>]*>', '_'
    $markdown = $markdown -replace '</i>', '_'
    
    # Convert underline tags (no direct markdown equivalent, use emphasis)
    $markdown = $markdown -replace '<u[^>]*>', '_'
    $markdown = $markdown -replace '</u>', '_'
    
    # Convert code tags
    $markdown = $markdown -replace '<code[^>]*>', '`'
    $markdown = $markdown -replace '</code>', '`'
    $markdown = $markdown -replace '<pre[^>]*>', '```'
    $markdown = $markdown -replace '</pre>', '```'
    
    # Handle links - improved to handle more complex cases
    $linkPattern = '<a[^>]*href=["'']([^"'']*?)["''][^>]*>(.*?)</a>'
    while ($markdown -match $linkPattern) {
        $url = $Matches[1]
        $text = $Matches[2]
        # Clean any remaining HTML from link text
        $text = $text -replace '<[^>]+>', ''
        $replacement = "[$text]($url)"
        $toReplace = [regex]::Escape($Matches[0])
        $markdown = $markdown -replace $toReplace, $replacement
    }
    
    # Convert unordered lists
    $markdown = $markdown -replace '<ul[^>]*>', ''
    $markdown = $markdown -replace '</ul>', "`n"
    $markdown = $markdown -replace '<li[^>]*>', '- '
    $markdown = $markdown -replace '</li>', "`n"
    
    # Convert ordered lists (with proper numbering)
    $olPattern = '(?s)<ol[^>]*>(.*?)</ol>'
    while ($markdown -match $olPattern) {
        $listContent = $Matches[1]
        $items = $listContent -split '</li>'
        $newList = ""
        $counter = 1
        
        foreach ($item in $items) {
            if ($item -match '<li[^>]*>(.*)') {
                $itemContent = $Matches[1]
                $newList += "$counter. $itemContent`n"
                $counter++
            }
        }
        
        $markdown = $markdown -replace [regex]::Escape($Matches[0]), $newList
    }
    
    # Convert headers
    $markdown = $markdown -replace '<h1[^>]*>(.*?)</h1>', '# $1'
    $markdown = $markdown -replace '<h2[^>]*>(.*?)</h2>', '## $1'
    $markdown = $markdown -replace '<h3[^>]*>(.*?)</h3>', '### $1'
    $markdown = $markdown -replace '<h4[^>]*>(.*?)</h4>', '#### $1'
    $markdown = $markdown -replace '<h5[^>]*>(.*?)</h5>', '##### $1'
    $markdown = $markdown -replace '<h6[^>]*>(.*?)</h6>', '###### $1'
    
    # Restore nested list markers
    $markdown = $markdown -replace '\[NESTED_UL_START\]', '  - '
    $markdown = $markdown -replace '\[NESTED_UL_END\]', ''
    $markdown = $markdown -replace '\[NESTED_OL_START\]', '  1. '
    $markdown = $markdown -replace '\[NESTED_OL_END\]', ''
    
    # Remove remaining HTML tags and clean up entities
    $markdown = $markdown -replace '<[^>]+>', ''
    $markdown = $markdown -replace '&nbsp;', ' '
    $markdown = $markdown -replace '&amp;', '&'
    $markdown = $markdown -replace '&lt;', '<'
    $markdown = $markdown -replace '&gt;', '>'
    $markdown = $markdown -replace '&quot;', '"'
    $markdown = $markdown -replace '&#39;', "'"
    $markdown = $markdown -replace '&mdash;', '—'
    $markdown = $markdown -replace '&ndash;', '–'
    
    # Clean up multiple spaces and line breaks
    $markdown = $markdown -replace '[ \t]+', ' '
    $markdown = $markdown -replace '(`n\s*){3,}', "`n`n"
    $markdown = $markdown -replace '^\s+|\s+$', ''
    
    return $markdown
}

function Extract-Instructions-Enhanced {
    param(
        [string]$Content
    )
    
    # Store the result to avoid duplicate processing
    $instructions = @()
    
    # Try multiple patterns for task list tables
    # Pattern 1: Original pattern with TASKLIST header
    $pattern = '(?s)<h1[^>]*id="[^"]*-TASKLIST"[^>]*>.*?</table>'
    
    # Pattern 2: Look for "TASK LIST" text followed by table
    if ($Content -notmatch $pattern) {
        $pattern = '(?s)TASK LIST</span></p>.*?<table[^>]*>.*?</table>'
    }
    
    # Pattern 3: Look for table with step codes in first column
    if ($Content -notmatch $pattern) {
        # Look for tables that have the step code pattern in the first column
        $pattern = '(?s)<table[^>]*>.*?[A-Z]{3}-[0-9]+.*?</table>'
    }
    
    if ($Content -match $pattern) {
        $tableBlock = $Matches[0]
        
        # Remove newlines and split by </tr>
        $tableBlock = $tableBlock -replace "`r`n", "" -replace "`n", ""
        $rows = $tableBlock -split '</tr>'
        
        foreach ($row in $rows) {
            # Skip header row
            if ($row -match 'Assigned to|Specific Stakeholder|Associated Controls') { continue }
            
            # Extract cells - now we need all 6 columns
            $cells = $row -split '<td'
            if ($cells.Count -gt 3) {
                # Extract ID (column 1)
                $idCell = $cells[1] -replace '^[^>]+>', '' -replace '</td>.*', ''
                $idCellClean = $idCell -replace '<[^>]+>', '' -replace '^\s+|\s+$', ''
                # Match either XXX-nnn-n format or just plain numbers
                if ($idCellClean -match '([A-Z]{3}-[0-9]+(-[0-9]+)?|^[0-9]+$)') {
                    $id = $Matches[1]
                } else {
                    $id = ""
                }
                
                # Extract instruction text/title (column 2) - Convert to Markdown
                $textCell = $cells[2] -replace '^[^>]+>', '' -replace '</td>.*', ''
                $text = Convert-HtmlToMarkdown -HtmlContent $textCell
                $text = $text -replace '"', '\"'
                
                # Extract assigned team (column 3)
                $assigneeCell = $cells[3] -replace '^[^>]+>', '' -replace '</td>.*', ''
                # Look for text within aui-lozenge span
                if ($assigneeCell -match 'aui-lozenge[^>]*>([^<]+)<') {
                    $assignee = $Matches[1] -replace '^\s+|\s+$', ''
                } else {
                    $assignee = $assigneeCell -replace '<[^>]+>', '' -replace '&nbsp;', ' ' -replace '^\s+|\s+$', ''
                }
                
                # Extract nominated user (column 4)
                $nominatedUser = ""
                if ($cells.Count -gt 4) {
                    $userCell = $cells[4] -replace '^[^>]+>', '' -replace '</td>.*', ''
                    # Look for user mention links
                    if ($userCell -match 'user-mention[^>]*>([^<]+)<') {
                        $nominatedUser = $Matches[1] -replace '^\s+|\s+$', ''
                    } else {
                        $nominatedUser = $userCell -replace '<[^>]+>', '' -replace '&nbsp;', ' ' -replace '^\s+|\s+$', ''
                    }
                }
                
                # Extract associated controls (column 5) - Convert to Markdown
                $associatedControls = ""
                if ($cells.Count -gt 5) {
                    $controlsCell = $cells[5] -replace '^[^>]+>', '' -replace '</td>.*', ''
                    $associatedControls = Convert-HtmlToMarkdown -HtmlContent $controlsCell
                }
                
                if ($id -ne "") {
                    $instructions += @{
                        instruction_id = $id
                        instruction_title = $text
                        instruction_assigned_team = $assignee
                        nominated_user = $nominatedUser
                        associated_controls = $associatedControls
                    }
                }
            }
        }
    }
    
    # FALLBACK PATTERNS - Only try these if no instructions found yet
    if ($instructions.Count -eq 0) {
        # Pattern 4: Tables with step codes (XXX-nnnn) in first row and instructions with IDs in subsequent rows
        # This handles files like IGO-9300, TRT-2842
        # First, try to find a step code directly
        $pattern4 = '(?s)<table[^>]*>.*?>([A-Z]{3}-[0-9]+)<.*?</tr>(.*?)</table>'
        $stepCode = ""
        
        if ($Content -match $pattern4) {
            $stepCode = $Matches[1]
            $tableRemainder = $Matches[2]
        } else {
            # If no direct step code found, look for step code IDs in table cells (like TRT-2842-1)
            # and extract the base step code from them
            $pattern4Alt = '(?s)<table[^>]*>.*?<td[^>]*>([A-Z]{3}-[0-9]+-\d+)</td>.*?</table>'
            if ($Content -match $pattern4Alt) {
                $fullId = $Matches[1]
                # Extract base step code (remove the last -N part)
                if ($fullId -match '([A-Z]{3}-[0-9]+)-\d+') {
                    $stepCode = $Matches[1]
                    # Now get the full table with this step code
                    $pattern4Full = "(?s)<table[^>]*>.*?$fullId.*?</table>"
                    if ($Content -match $pattern4Full) {
                        $tableRemainder = $Matches[0]
                    }
                }
            }
        }
        
        if ($stepCode -ne "") {
            # Split the remainder by rows
            $tableRemainder = $tableRemainder -replace "`r`n", "" -replace "`n", ""
            $rows = $tableRemainder -split '</tr>'
            
            foreach ($row in $rows) {
                # Look for rows with step code-based IDs (XXX-nnnn-n)
                if ($row -match ">($stepCode-\d+)<") {
                    $id = $Matches[1]
                    
                    # Extract the instruction content from cells
                    $cells = $row -split '<td'
                    if ($cells.Count -gt 2) {
                        # Second cell contains the instruction
                        $instructionCell = $cells[2] -replace '^[^>]+>', '' -replace '</td>.*', ''
                        $text = Convert-HtmlToMarkdown -HtmlContent $instructionCell
                        $text = $text -replace '"', '\"'
                        
                        # Extract assigned team if present (third cell)
                        $assignee = ""
                        if ($cells.Count -gt 3) {
                            $assigneeCell = $cells[3] -replace '^[^>]+>', '' -replace '</td>.*', ''
                            if ($assigneeCell -match 'aui-lozenge[^>]*>([^<]+)<') {
                                $assignee = $Matches[1] -replace '^\s+|\s+$', ''
                            }
                        }
                        
                        if ($text -ne "") {
                            $instructions += @{
                                instruction_id = $id
                                instruction_title = $text
                                instruction_assigned_team = $assignee
                                nominated_user = ""
                                associated_controls = ""
                            }
                        }
                    }
                }
            }
        }
        
        # Pattern 5: Tables with step code link and "table-excerpt" data for files like DUM-13111
        if ($instructions.Count -eq 0) {
            $pattern5 = '(?s)<table[^>]*>.*?<a[^>]*>([A-Z]{3}-[0-9]+)</a>.*?table-excerpt[^>]*data-name="TITLE"[^>]*>.*?<strong>(.*?)</strong>.*?</tr>(.*?)</table>'
            
            if ($Content -match $pattern5) {
                $stepCode = $Matches[1]
                $tableRemainder = $Matches[3]
                
                # Look for instruction rows (numbered items like "1", "2", etc)
                $tableRemainder = $tableRemainder -replace "`r`n", "" -replace "`n", ""
                $rows = $tableRemainder -split '</tr>'
                
                $instructionCounter = 1
                foreach ($row in $rows) {
                    # Look for rows with numeric IDs in first cell
                    if ($row -match '<td[^>]*>(\d+)</td><td[^>]*>(.*?)</td>') {
                        $rowNumber = $Matches[1]
                        $instructionContent = $Matches[2]
                        
                        $text = Convert-HtmlToMarkdown -HtmlContent $instructionContent
                        $text = $text -replace '"', '\"'
                        
                        # Extract assigned team if present
                        $assignee = ""
                        if ($row -match 'aui-lozenge[^>]*>([^<]+)<') {
                            $assignee = $Matches[1] -replace '^\s+|\s+$', ''
                        }
                        
                        $instructions += @{
                            instruction_id = "$stepCode-$rowNumber"
                            instruction_title = $text
                            instruction_assigned_team = $assignee
                            nominated_user = ""
                            associated_controls = ""
                        }
                    }
                }
            }
        }
        
        # Pattern 6: Tables with TASK LIST heading and step code in first cell (IGO-13701 style)
        if ($instructions.Count -eq 0) {
            $pattern6 = '(?s)<h1[^>]*id="[^"]*TASKLIST"[^>]*>.*?TASK LIST.*?</h1>.*?<table[^>]*>(.*?)</table>'
            
            if ($Content -match $pattern6) {
                $tableContent = $Matches[1]
                $tableContent = $tableContent -replace "`r`n", "" -replace "`n", ""
                $rows = $tableContent -split '</tr>'
                
                foreach ($row in $rows) {
                    # Look for rows with step code IDs in pre tags
                    if ($row -match '<pre>([A-Z]{3}-[0-9]+-\d+)</pre>') {
                        $id = $Matches[1]
                        
                        # Extract instruction content from second cell
                        $cells = $row -split '<td'
                        if ($cells.Count -gt 2) {
                            $textCell = $cells[2] -replace '^[^>]+>', '' -replace '</td>.*', ''
                            $text = Convert-HtmlToMarkdown -HtmlContent $textCell
                            $text = $text -replace '"', '\"'
                            
                            # Extract assigned team if present
                            $assignee = ""
                            if ($cells.Count -gt 3) {
                                $assigneeCell = $cells[3] -replace '^[^>]+>', '' -replace '</td>.*', ''
                                if ($assigneeCell -match 'aui-lozenge[^>]*>([^<]+)<') {
                                    $assignee = $Matches[1] -replace '^\s+|\s+$', ''
                                }
                            }
                            
                            $instructions += @{
                                instruction_id = $id
                                instruction_title = $text
                                instruction_assigned_team = $assignee
                                nominated_user = ""
                                associated_controls = ""
                            }
                        }
                    }
                }
            }
        }
    }
    
    # Force array output even for single items
    if ($instructions.Count -eq 0) {
        return "[]"
    } elseif ($instructions.Count -eq 1) {
        # Manually format as array for single item
        $json = $instructions[0] | ConvertTo-Json -Compress
        return "[" + $json + "]"
    } else {
        return $instructions | ConvertTo-Json -Compress
    }
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

# Simplified extraction functions
function Get-Title {
    param([string]$Content)
    
    $titleMatch = [regex]::Match($Content, '<title>(.*?)</title>')
    if ($titleMatch.Success) {
        return $titleMatch.Groups[1].Value
    }
    return ""
}

function Get-StepName {
    param([string]$Title)
    
    $stepNameMatch = [regex]::Match($Title, '([A-Z]{3}-[0-9]{1,5}(-[A-Za-z]|[A-Za-z])?)')
    if ($stepNameMatch.Success) {
        return $stepNameMatch.Groups[1].Value
    }
    return ""
}

function Get-StepTitle {
    param([string]$Content)

    # Pattern 1: NEW - Try table-excerpt with <p> tag (fixes RUN0/RUN1 issue)
    # This pattern catches titles in <p> tags without <strong>
    $titlePattern = '(?s)data-name="TITLE"[^>]*>.*?<p>(.*?)</p>'
    $titleMatch = [regex]::Match($Content, $titlePattern)

    # Pattern 2: Try the original pattern (div with table-excerpt and <strong>)
    if (-not $titleMatch.Success) {
        $titlePattern = '(?s)<div[^>]*class="table-excerpt tei[^"]*"[^>]*data-name="TITLE"[^>]*>.*?<strong>(.*?)</strong>'
        $titleMatch = [regex]::Match($Content, $titlePattern)
    }

    # Pattern 3: Try the table pattern (TH with TITLE followed by TD with content)
    if (-not $titleMatch.Success) {
        $titlePattern = '(?s)<th[^>]*class="confluenceTh"[^>]*>TITLE</th>\s*<td[^>]*class="confluenceTd"[^>]*>(?:<[^>]+>)*(?:<strong>)?(.*?)(?:</strong>)?(?:</[^>]+>)*</td>'
        $titleMatch = [regex]::Match($Content, $titlePattern)
    }

    # Pattern 4: Try another pattern for nested strong tags
    if (-not $titleMatch.Success) {
        $titlePattern = '(?s)<th[^>]*>TITLE</th>\s*<td[^>]*>.*?<strong>(.*?)</strong>'
        $titleMatch = [regex]::Match($Content, $titlePattern)
    }

    if ($titleMatch.Success) {
        $stepTitle = $titleMatch.Groups[1].Value
        $stepTitle = $stepTitle -replace '<[^>]+>', ''
        $stepTitle = $stepTitle -replace '^\s+|\s+$', ''
        $stepTitle = $stepTitle -replace '( - [^ -]+( [0-9]+)? PART *[0-9]+)$', ''
        $stepTitle = $stepTitle -replace '( - [0-9]+)$', ''
        $stepTitle = $stepTitle -replace '[\r\n\t]', ''
        $stepTitle = $stepTitle -replace '"', '\"'
        return $stepTitle
    }
    return ""
}

function Get-Predecessor {
    param([string]$Content)
    
    $predPattern = '(?s)<div[^>]*class="table-excerpt tei[^"]*"[^>]*data-name="Predecessor"[^>]*>.*?([A-Z]{3}-[0-9]{1,5}(-[A-Za-z]|[A-Za-z])?)'
    $predMatch = [regex]::Match($Content, $predPattern)
    if ($predMatch.Success) {
        return $predMatch.Groups[1].Value
    }
    return ""
}

function Get-Successor {
    param([string]$Content)
    
    $succPattern = '(?s)<div[^>]*class="table-excerpt tei[^"]*"[^>]*data-name="Successor"[^>]*>.*?([A-Z]{3}-[0-9]{1,5}(-[A-Za-z]|[A-Za-z])?)'
    $succMatch = [regex]::Match($Content, $succPattern)
    if ($succMatch.Success) {
        return $succMatch.Groups[1].Value
    }
    return ""
}

# Process single HTML file
function Process-SingleHtmlFile {
    param(
        [string]$FilePath,
        [switch]$EnableQualityChecks = $true
    )
    
    # Step 1: Check file exists
    if (-not (Test-Path $FilePath)) {
        Write-Warning "File not found: $FilePath"
        return @{
            Success = $false
            Error = "File not found"
            FilePath = $FilePath
        }
    }
    
    # Step 2: Read content
    $content = Get-Content -Path $FilePath -Raw -Encoding UTF8
    
    # Step 3: Get title
    $title = Get-Title -Content $content
    
    # Step 4: Get step name
    $stepName = Get-StepName -Title $title
    if ($stepName -eq "") {
        Write-Warning "No step name found in '$FilePath'. Skipping."
        return @{
            Success = $false
            Error = "No step name found"
            FilePath = $FilePath
        }
    }
    
    # Step 5: Parse step components
    $stepType = $stepName.Split('-')[0]
    $stepNumber = $stepName.Split('-')[1] -replace '^0+', ''
    
    # Step 6: Get all other fields
    $stepTitle = Get-StepTitle -Content $content
    $stepPredecessor = Get-Predecessor -Content $content
    $stepSuccessor = Get-Successor -Content $content
    
    # Step 7: Extract teams
    $primaryTeam = Extract-SingleTeam -DataName "Primary_Assignee" -Content $content
    $impactedTeams = Extract-MultipleTeams -DataName "Impacted_Teams" -Content $content
    
    # Step 8: Extract sequences
    $macroTimeSequence = Extract-MacroTimeSequence -Content $content
    $timeSequence = Extract-TimeSequence -Content $content
    
    # Step 9: Extract enhanced instructions with all fields
    $taskList = Extract-Instructions-Enhanced -Content $content
    
    # Step 10: Prepare output path
    $fileName = [System.IO.Path]::GetFileNameWithoutExtension($FilePath)
    $baseDir = [System.IO.Path]::GetDirectoryName($FilePath)
    
    if ($baseDir -notmatch 'json$') {
        $outDir = Join-Path $baseDir "json"
    } else {
        $outDir = $baseDir
    }
    
    if (-not (Test-Path $outDir)) {
        New-Item -ItemType Directory -Path $outDir -Force | Out-Null
    }
    
    $outFile = Join-Path $outDir "$fileName.json"
    
    # Step 11: Validate and prepare number
    $stepNumberJson = Validate-JsonNumber -Value $stepNumber
    
    # Step 12: Prepare step number value
    $stepNumberValue = $null
    if ($stepNumberJson -ne "null") {
        $stepNumberValue = [int]$stepNumberJson
    }
    
    # Step 13: Create JSON object with specified field order
    $jsonObject = [ordered]@{
        step_type = $stepType
        step_number = $stepNumberValue
        title = $stepTitle
        predecessor = $stepPredecessor
        successor = $stepSuccessor
        primary_team = $primaryTeam
        impacted_teams = $impactedTeams
        macro_time_sequence = $macroTimeSequence
        time_sequence = $timeSequence
    }
    
    # Step 14: Convert and save with special handling for task_list
    $jsonString = $jsonObject | ConvertTo-Json -Compress -Depth 10
    # Remove the closing brace to insert task_list manually
    $jsonString = $jsonString.Substring(0, $jsonString.Length - 1)
    # Add task_list as a properly formatted array
    $jsonString += ',"task_list":' + $taskList + '}'
    
    # Quality checks
    $qualityResult = @{
        Success = $true
        FilePath = $FilePath
        OutputFile = $outFile
        Metrics = $null
    }
    
    if ($EnableQualityChecks) {
        # Validate JSON structure
        if (-not (Validate-JsonStructure -JsonString $jsonString)) {
            Write-Warning "JSON validation failed for $fileName"
            $qualityResult.Success = $false
            $qualityResult.Error = "Invalid JSON structure"
        }
        
        # Validate required fields
        $jsonObject['task_list'] = $taskList
        if (-not (Validate-RequiredFields -JsonObject $jsonObject)) {
            Write-Warning "Required field validation failed for $fileName"
            $qualityResult.Success = $false
            $qualityResult.Error = "Missing required fields"
        }
        
        # Get quality metrics
        $qualityResult.Metrics = Get-QualityMetrics -JsonObject $jsonObject -FilePath $FilePath
    }
    
    # Save the file
    $jsonString | Set-Content -Path $outFile -Encoding UTF8
    
    if ($qualityResult.Success) {
        Write-Host "Created: $outFile" -ForegroundColor Green
        
        # Display quality metrics if verbose
        if ($VerbosePreference -eq 'Continue' -and $qualityResult.Metrics) {
            Write-Verbose "  Instructions: $($qualityResult.Metrics.InstructionCount)"
            Write-Verbose "  Markdown: $($qualityResult.Metrics.MarkdownConversion)"
            Write-Verbose "  Title: $($qualityResult.Metrics.HasTitle)"
            Write-Verbose "  Teams: Primary=$($qualityResult.Metrics.HasPrimaryTeam), Impacted=$($qualityResult.Metrics.HasImpactedTeams)"
        }
    } else {
        Write-Host "Created with warnings: $outFile" -ForegroundColor Yellow
    }
    
    return $qualityResult
}

# --- Main Script ---

# Set verbose preference if requested
if ($VerboseOutput) {
    $VerbosePreference = 'Continue'
}

Write-Host ""
Write-Host "=== HTML to JSON Converter v4 ===" -ForegroundColor Yellow
Write-Host "Enhanced with Markdown conversion and quality checks" -ForegroundColor Cyan
Write-Host "Input: $InputPath" -ForegroundColor Cyan
if ($NoQualityChecks) {
    Write-Host "Quality checks: DISABLED" -ForegroundColor Yellow
} else {
    Write-Host "Quality checks: ENABLED" -ForegroundColor Green
}
if ($VerboseOutput) {
    Write-Host "Verbose mode: ON" -ForegroundColor Cyan
}
Write-Host ""

# Quality report collection
$qualityReports = @()

# Check if single file
$isSingleFile = $false
if (Test-Path $InputPath -PathType Leaf) {
    if ($InputPath -notmatch '\*') {
        $isSingleFile = $true
    }
}

if ($isSingleFile) {
    # Single file
    Write-Host "Processing single file..." -ForegroundColor Yellow
    $result = Process-SingleHtmlFile -FilePath $InputPath -EnableQualityChecks:(-not $NoQualityChecks)
    if ($result) {
        $qualityReports += $result
    }
}
else {
    # Directory or pattern
    Write-Host "Processing multiple files..." -ForegroundColor Yellow
    
    # Build file list
    $files = @()
    
    # Check if wildcard
    $hasWildcard = $false
    if ($InputPath -match '\*') {
        $hasWildcard = $true
    }
    
    if ($hasWildcard) {
        # Wildcard pattern
        $directory = Split-Path -Path $InputPath -Parent
        $pattern = Split-Path -Path $InputPath -Leaf
        
        if ([string]::IsNullOrEmpty($directory)) {
            $directory = "."
        }
        
        if ($Recursive) {
            $files = @(Get-ChildItem -Path $directory -Filter $pattern -Recurse -File -ErrorAction SilentlyContinue)
        }
        else {
            $files = @(Get-ChildItem -Path $directory -Filter $pattern -File -ErrorAction SilentlyContinue)
        }
    }
    else {
        # Directory path
        if ($Recursive) {
            $files = @(Get-ChildItem -Path $InputPath -Filter "*.html" -Recurse -File -ErrorAction SilentlyContinue)
        }
        else {
            $files = @(Get-ChildItem -Path $InputPath -Filter "*.html" -File -ErrorAction SilentlyContinue)
        }
    }
    
    # Process files
    if ($files.Count -eq 0) {
        Write-Warning "No HTML files found matching: $InputPath"
        exit 1
    }
    
    Write-Host "Found $($files.Count) HTML file(s) to process" -ForegroundColor Cyan
    Write-Host ""
    
    $processed = 0
    $skipped = 0
    $warnings = 0
    
    foreach ($file in $files) {
        try {
            $result = Process-SingleHtmlFile -FilePath $file.FullName -EnableQualityChecks:(-not $NoQualityChecks)
            if ($result) {
                $qualityReports += $result
                if ($result.Success) {
                    $processed++
                } else {
                    $warnings++
                }
            }
        }
        catch {
            Write-Error "Error processing $($file.Name): $_"
            $skipped++
        }
    }
    
    Write-Host ""
    Write-Host "=== Summary ===" -ForegroundColor Yellow
    Write-Host "Processed: $processed files" -ForegroundColor Green
    if ($warnings -gt 0) {
        Write-Host "With warnings: $warnings files" -ForegroundColor Yellow
    }
    if ($skipped -gt 0) {
        Write-Host "Skipped: $skipped files" -ForegroundColor Red
    }
    
    # Quality summary
    if ($qualityReports.Count -gt 0) {
        Write-Host ""
        Write-Host "=== Quality Report ===" -ForegroundColor Cyan
        
        $totalInstructions = 0
        $filesWithMarkdown = 0
        $filesWithoutTitle = 0
        $filesWithoutTeams = 0
        
        foreach ($report in $qualityReports) {
            if ($report.Metrics) {
                $totalInstructions += $report.Metrics.InstructionCount
                if ($report.Metrics.MarkdownConversion) { $filesWithMarkdown++ }
                if (-not $report.Metrics.HasTitle) { $filesWithoutTitle++ }
                if (-not $report.Metrics.HasPrimaryTeam) { $filesWithoutTeams++ }
            }
        }
        
        Write-Host "Total instructions extracted: $totalInstructions" -ForegroundColor Green
        Write-Host "Files with Markdown content: $filesWithMarkdown" -ForegroundColor Green
        
        if ($filesWithoutTitle -gt 0) {
            Write-Host "Files without title: $filesWithoutTitle" -ForegroundColor Yellow
        }
        if ($filesWithoutTeams -gt 0) {
            Write-Host "Files without primary team: $filesWithoutTeams" -ForegroundColor Yellow
        }
    }
}

# Export quality report if requested
if ($ExportReport -and $qualityReports.Count -gt 0) {
    Write-Host ""
    Write-Host "=== Exporting Quality Report ===" -ForegroundColor Cyan
    
    $reportPath = Join-Path (Get-Location) "quality_report_$(Get-Date -Format 'yyyyMMdd_HHmmss').csv"
    
    $reportData = @()
    foreach ($report in $qualityReports) {
        if ($report.Metrics) {
            $reportData += [PSCustomObject]@{
                FileName = $report.Metrics.FileName
                Success = $report.Success
                HasTitle = $report.Metrics.HasTitle
                HasInstructions = $report.Metrics.HasInstructions
                InstructionCount = $report.Metrics.InstructionCount
                HasPredecessor = $report.Metrics.HasPredecessor
                HasSuccessor = $report.Metrics.HasSuccessor
                HasPrimaryTeam = $report.Metrics.HasPrimaryTeam
                HasImpactedTeams = $report.Metrics.HasImpactedTeams
                MarkdownConversion = $report.Metrics.MarkdownConversion
                Error = if ($report.ContainsKey('Error')) { $report.Error } else { "" }
            }
        }
    }
    
    $reportData | Export-Csv -Path $reportPath -NoTypeInformation
    Write-Host "Quality report exported to: $reportPath" -ForegroundColor Green
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green