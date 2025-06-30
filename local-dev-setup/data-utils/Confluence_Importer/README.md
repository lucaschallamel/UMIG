> **Note:** This importer is a work in progress. Core logic is present, but further field extraction, error handling, and automated tests are still needed. Contributions and feedback are welcome!

# HTML Screen Scraping Scripts

This project provides cross-platform scripts for extracting structured data from exported HTML files.

## Folder Structure
- `rawData/` — Place all exported HTML files for processing here.
- `scrape_html.sh` — Bash/Zsh script (Linux/macOS)
- `scrape_html.ps1` — PowerShell script (Windows)
- `docs/` — Documentation and notes

## Usage

### Bash/Zsh
```sh
./scrape_html.sh rawData/input.html > output.csv
```

### PowerShell
```powershell
./scrape_html.ps1 rawData/input.html | Out-File output.csv
```

## Extracted Fields
- Title
- Heading
- Author
- Last Modified Date
- Business Data Cutover Date

Further extraction rules (e.g., tables, status tags) can be added as needed.

## Sample Files
Place your exported HTML files in the `rawData/` folder.
