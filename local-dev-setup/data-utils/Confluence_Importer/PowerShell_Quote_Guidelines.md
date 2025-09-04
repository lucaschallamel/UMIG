# PowerShell Quote Handling Best Practices

## The Problem

Mixing `"`, `'`, and `` ` `` (backtick) in PowerShell can cause parsing errors, especially when:

- Embedding variables in strings
- Working with HTML/XML content that contains quotes
- Using regular expressions with special characters

## Quote Types in PowerShell

### 1. Single Quotes (`'`) - Literal Strings

- **Use for**: Static text, regex patterns, HTML/XML snippets
- **Behavior**: No variable expansion, no escape sequences (except `''` for a literal single quote)
- **Example**: `'<div class="test">Content</div>'`

### 2. Double Quotes (`"`) - Expandable Strings

- **Use for**: Strings that need variable interpolation
- **Behavior**: Variables are expanded, escape sequences work
- **Example**: `"Hello $userName"`
- **Escaping**: Use `""` for a literal quote or backtick `` `" ``

### 3. Backtick (`` ` ``) - Escape Character

- **Use for**: Escaping special characters within double-quoted strings
- **Common escapes**: `` `n `` (newline), `` `t `` (tab), `` `" `` (quote)
- **Avoid**: Complex nesting with variables

## Recommended Patterns

### Pattern 1: String Concatenation (Most Robust)

```powershell
# Instead of embedding variables with backticks:
# BAD: "data-name=`"$DataName`""

# GOOD: Use concatenation
$pattern = 'data-name="' + $DataName + '"'
```

### Pattern 2: Format Operator

```powershell
# For complex strings with multiple variables
$pattern = 'data-name="{0}" data-value="{1}"' -f $DataName, $DataValue
```

### Pattern 3: Here-Strings for Complex Content

```powershell
# For multi-line or complex HTML/XML
$template = @'
<div class="container">
    <span data-name="test">Content</span>
</div>
'@
```

### Pattern 4: Regex Patterns

```powershell
# Always use single quotes for regex patterns
$pattern = '<h1[^>]*id="[^"]*-TASKLIST"[^>]*>.*?</table>'

# If you need a variable in regex, concatenate:
$pattern = '<div[^>]*data-name="' + $DataName + '"[^>]*>'
```

## Specific Fixes for Your Script

### Fix 1: Dynamic Pattern Building

```powershell
# Original (problematic):
if ($state -eq 0 -and $line -match "data-name=`"$DataName`"") {

# Fixed:
$pattern = 'data-name="' + $DataName + '"'
if ($state -eq 0 -and $line -match $pattern) {
```

### Fix 2: JSON String Escaping

```powershell
# For JSON, double the quotes:
$text = $text -replace '"', '""'

# Or use [System.Web.HttpUtility]::JavaScriptStringEncode() if available
```

### Fix 3: Complex Regex Patterns

```powershell
# Use single quotes and concatenation:
$titlePattern = '<div[^>]*class="table-excerpt tei[^"]*"[^>]*' +
                'data-name="TITLE"[^>]*>.*?<strong>(.*?)</strong>'
```

## Testing Your Quotes

```powershell
# Test function to verify quote handling
function Test-QuotePattern {
    param([string]$Pattern)
    try {
        $null = [regex]::new($Pattern)
        Write-Host "✓ Pattern is valid" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "✗ Pattern has errors: $_" -ForegroundColor Red
        return $false
    }
}

# Usage:
Test-QuotePattern 'data-name="test"'
```

## Rules of Thumb

1. **Default to single quotes** unless you need variable expansion
2. **Use concatenation** instead of complex escaping
3. **Test patterns in isolation** before using them in your script
4. **Avoid mixing quote types** in the same expression
5. **Use here-strings** for multi-line content
6. **Consider format operator** for templates with placeholders

## Quick Reference

| Scenario            | Bad Practice               | Good Practice                |
| ------------------- | -------------------------- | ---------------------------- |
| Variable in pattern | `"data-name=`"$var`""`     | `'data-name="' + $var + '"'` |
| Regex pattern       | `"[^\"]*"`                 | `'[^"]*'`                    |
| JSON escaping       | `$text -replace '"', '\"'` | `$text -replace '"', '""'`   |
| HTML content        | `"<div class=\"test\">"`   | `'<div class="test">'`       |
| Path with spaces    | `"C:\Program Files\App"`   | `'C:\Program Files\App'`     |
