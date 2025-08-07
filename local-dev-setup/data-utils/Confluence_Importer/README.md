> **Note:** This importer is a work in progress. Core logic is present, but
> further field extraction, error handling, and automated tests are still
> needed. Contributions and feedback are welcome!

# HTML Screen Scraping Scripts

This project provides cross-platform scripts for extracting structured data from
exported HTML files.

## Folder Structure

- `rawData/` — Place all exported HTML files for processing here.
- `scrape_html.sh` — Bash/Zsh script (Linux/macOS), produces human-readable,
  multi-line JSON (for debug or inspection).
- `scrape_html_oneline.sh` — Bash/Zsh script, produces **compact one-line JSON**
  per file, compatible with PostgreSQL import (requires `jq`).
- `scrape_html.ps1` — PowerShell script (Windows)
- `docs/` — Documentation and notes

## Usage

### Bash/Zsh — For PostgreSQL Import

```sh
./scrape_html_oneline.sh rawData/input.html
```

- Output: `rawData/json/input.json` (one-line JSON, ready for import)
- **Requires `jq` to be installed** (`sudo apt-get install jq`)

### Bash/Zsh — For Debug/Inspection

```sh
./scrape_html.sh rawData/input.html
```

- Output: multi-line JSON (not compatible with PostgreSQL import)

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
- Step instructions (with robust double-quote escaping)

Further extraction rules (e.g., tables, status tags) can be added as needed.

## PostgreSQL Import Workflow

1. **Export HTML** from Confluence into `rawData/`.
2. **Generate compact JSON**:

   ```sh
   ./scrape_html_oneline.sh rawData/input.html
   ```

   - Produces `rawData/json/input.json` (one-line, strict JSON)

3. **Import into PostgreSQL**:

   ```sh
   ./import_cutover_data.sh
   ```

   - Only one-line JSON is accepted by PostgreSQL's `\copy ... FROM ...` import.

## Requirements

- `jq` is required for the one-line JSON compaction step. Install with
  `sudo apt-get install jq`.
- All double quotes in text fields are now robustly escaped to ensure valid
  JSON.

## Sample Files

Place your exported HTML files in the `rawData/` folder.
