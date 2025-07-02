#!/bin/bash
# scrape_html.sh: Extracts structured data from HTML files using reusable functions.
# Usage: ./scrape_html.sh rawData/input.html

# --- Reusable Functions ---

# Extracts the *first* team name from a specific "data-name" block.
extract_single_team() {
  local data_name="$1"
  local infile="$2"
  awk -v dname="$data_name" '
    # Using index() is more robust for simple string matching than regex with quotes.
    state == 0 && index($0, "data-name=\"" dname "\"") { state = 1; next }
    state == 1 { if (/\/div>/) { state = 0 } if (/class="[^"]*aui-lozenge[^"]*"/) { state = 2 }; next }
    state == 2 { if (/>/) { state = 3 }; next }
    state == 3 {
      gsub(/<[^>]+>/, ""); gsub(/^[ \t\r\n]+|[ \t\r\n]+$/, "");
      if ($0 != "") { print; exit; }
    }
  ' "$infile"
}

# Extracts *all* team names from a specific "data-name" block.
extract_multiple_teams() {
    local data_name="$1"
    local infile="$2"
    awk -v dname="$data_name" '
        # Using index() is more robust for simple string matching than regex with quotes.
        state == 0 && index($0, "data-name=\"" dname "\"") { state = 1; next }
        state == 1 {
            if (/<\/div>/) { exit }
            if (/class="[^"]*aui-lozenge[^"]*"/) { state = 2 }; next
        }
        state == 2 { if (/>/) { state = 3 }; next }
        state == 3 {
            gsub(/<[^>]+>/, ""); gsub(/^[ \t\r\n]+|[ \t\r\n]+$/, "");
            if ($0 != "" && $0 != "-") { print $0; }
            state = 1;
        }
    ' "$infile"
}

# Extracts all instructions from the TASK LIST table.
extract_instructions() {
    local infile="$1"
    # Isolate the instruction table block first
    local table_block=$(awk '/<h1 id="[^"]*-TASKLIST">/,/\<\/table\>/' "$infile")

    # Process the isolated block by first linearizing the HTML table
    # so that each <tr>...</tr> is on a single line. This makes awk processing robust.
    echo "$table_block" | tr -d '\r\n' | sed 's/<\/tr>/\n/g' | awk '
    BEGIN {
        FS = "<td";
        print "[";
        first = 1;
    }
    # Skip header row
    /Assigned to/ { next; }

    NF > 3 {
        # Isolate and clean each cell individually.
        
        # Cell 1: ID
        id_cell = $2;
        sub(/^[^>]+>/, "", id_cell); # Remove leading tag part, e.g., class="...>
        sub(/<\/td>.*/, "", id_cell); # Remove trailing tag and rest of line
        match(id_cell, /[A-Z]{3}-[0-9]+(-[0-9]+)?/, arr);
        if (RSTART > 0) { id = arr[0]; } else { id = ""; }

        # Cell 2: Text
        text_cell = $3;
        sub(/^[^>]+>/, "", text_cell);
        sub(/<\/td>.*/, "", text_cell);
        text = text_cell;
        # Clean the text: remove HTML, decode entities, replace newlines/tabs, trim, escape quotes.
        gsub(/<[^>]+>/, " ", text); # Strip HTML tags
        gsub(/&quot;/, "\"", text); # Decode HTML quote entity to a literal quote
        gsub(/[\r\n\t]+/, " ", text); # Replace newlines/tabs with spaces
        gsub(/^[ ]+|[ ]+$/, "", text); # Trim whitespace
        gsub(/"/, "\\\"", text); # Escape all literal quotes for JSON

        # Cell 3: Assignee
        assignee_cell = $4;
        sub(/^[^>]+>/, "", assignee_cell);
        sub(/<\/td>.*/, "", assignee_cell);
        assignee = assignee_cell;
        # Robustly strip all HTML tags and trim whitespace to get clean text.
        gsub(/<[^>]+>/, "", assignee);
        gsub(/&nbsp;/, " ", assignee); # Replace non-breaking space with a regular space
        gsub(/^[ \t\r\n]+|[ \t\r\n]+$/, "", assignee); # Trim leading/trailing whitespace

        if (id != "") {
            if (!first) { print ","; }
            first = 0;
            printf "  {\"id\": \"%s\", \"text\": \"%s\", \"assignee\": \"%s\"}", id, text, assignee;
        }
    }
    END { print "\n]"; }
  '
}

# Extracts the macro time sequence text.
extract_macro_time_sequence() {
    local infile="$1"
    # This awk script finds the block with data-name="Macro_Time_Sequence", buffers its content,
    # then cleans all HTML tags and whitespace to return a single string.
    awk '
        /data-name="Macro_Time_Sequence"/ { in_block=1 }
        in_block { buffer = buffer $0 " " }
        in_block && /<\/div>/ {
            gsub(/.*data-name="Macro_Time_Sequence"[^>]*>/, "", buffer)
            gsub(/<\/div>.*/, "", buffer)
            gsub(/<[^>]+>|&nbsp;/, " ", buffer)
            gsub(/^[ \t\r\n]+|[ \t\r\n]+$/, "", buffer)
            gsub(/[ \t]{2,}/, " ", buffer)
            print buffer
            exit
        }
    ' "$infile"
}

# Extracts the time sequence text.
extract_time_sequence() {
    local infile="$1"
    # This awk script finds the block with data-name="Time_Sequence", buffers its content,
    # then cleans all HTML tags and whitespace to return a single string.
    awk '
        /data-name="Time_Sequence"/ { in_block=1 }
        in_block { buffer = buffer $0 " " }
        in_block && /<\/div>/ {
            gsub(/.*data-name="Time_Sequence"[^>]*>/, "", buffer)
            gsub(/<\/div>.*/, "", buffer)
            gsub(/<[^>]+>|&nbsp;/, " ", buffer)
            gsub(/^[ \t\r\n]+|[ \t\r\n]+$/, "", buffer)
            gsub(/[ \t]{2,}/, " ", buffer)
            print buffer
            exit
        }
    ' "$infile"
}

# Extracts the macro time sequence text.
extract_macro_time_sequence() {
    local infile="$1"
    # This awk script finds the block with data-name="Macro_Time_Sequence", buffers its content,
    # then cleans all HTML tags and whitespace to return a single string.
    awk '
        /data-name="Macro_Time_Sequence"/ { in_block=1 }
        in_block { buffer = buffer $0 " " }
        in_block && /<\/div>/ {
            gsub(/.*data-name="Macro_Time_Sequence"[^>]*>/, "", buffer)
            gsub(/<\/div>.*/, "", buffer)
            gsub(/<[^>]+>|&nbsp;/, " ", buffer)
            gsub(/^[ \t\r\n]+|[ \t\r\n]+$/, "", buffer)
            gsub(/[ \t]{2,}/, " ", buffer)
            print buffer
            exit
        }
    ' "$infile"
}

# Extracts the time sequence text.
extract_time_sequence() {
    local infile="$1"
    # This awk script finds the block with data-name="Time_Sequence", buffers its content,
    # then cleans all HTML tags and whitespace to return a single string.
    awk '
        /data-name="Time_Sequence"/ { in_block=1 }
        in_block { buffer = buffer $0 " " }
        in_block && /<\/div>/ {
            gsub(/.*data-name="Time_Sequence"[^>]*>/, "", buffer)
            gsub(/<\/div>.*/, "", buffer)
            gsub(/<[^>]+>|&nbsp;/, " ", buffer)
            gsub(/^[ \t\r\n]+|[ \t\r\n]+$/, "", buffer)
            gsub(/[ \t]{2,}/, " ", buffer)
            print buffer
            exit
        }
    ' "$infile"
}

# --- Main Script ---
if [ $# -ne 1 ]; then
  echo "Usage: $0 rawData/input.html" >&2
  exit 1
fi

INFILE="$1"

# Extract base information
TITLE=$(awk -F'[<>]' '/<title>/ {print $3}' "$INFILE")
STEP_NAME=$(echo "$TITLE" | sed -E -n 's/.*([A-Z]{3}-[0-9]{5}).*/\1/p')

# Robustness Check: If no valid step name is found, skip the file.
# This prevents the creation of empty or corrupt JSON files from non-step pages.
if [[ -z "$STEP_NAME" ]]; then
  echo "Warning: No step name found in '$INFILE'. Skipping." >&2
  exit 0
fi

# If we are here, STEP_NAME is valid.
STEP_TYPE=$(echo "$STEP_NAME" | cut -d'-' -f1)
STEP_NUMBER=$(echo "$STEP_NAME" | cut -d'-' -f2 | sed 's/^0*//')

STEP_TITLE=$(awk '/<div class="table-excerpt tei ".*data-name="TITLE"/{flag=1} flag && /<strong>/{gsub(/<[^>]+>/,""); print; flag=0}' "$INFILE" | head -n1 | sed 's/^ *//;s/ *$//' | sed -E 's/( - [^ -]+( [0-9]+)? PART *[0-9]+)$//; s/( - [0-9]+)$//' | tr -d '\n\r\t' | sed 's/\x22/\\"/g')
STEP_PREDECESSOR=$(awk '/<div class="table-excerpt tei / && /data-name="Predecessor"/{flag=1} flag&&match($0,/[A-Z]{3}-[0-9]{1,5}(-[A-Za-z])?/){print substr($0,RSTART,RLENGTH);flag=0}' "$INFILE" | head -n1)
STEP_SUCCESSOR=$(awk '/<div class="table-excerpt tei / && /data-name="Successor"/{flag=1} flag&&match($0,/[A-Z]{3}-[0-9]{1,5}(-[A-Za-z])?/){print substr($0,RSTART,RLENGTH);flag=0}' "$INFILE" | head -n1)

# Extract team and instruction information
STEP_ASSIGNED_TEAM=$(extract_single_team "Primary_Assignee" "$INFILE")
STEP_IMPACTED_TEAMS=$(extract_multiple_teams "Impacted_Teams" "$INFILE" | paste -sd, -)
STEP_INSTRUCTIONS=$(extract_instructions "$INFILE")
STEP_MACRO_TIME_SEQUENCE=$(extract_macro_time_sequence "$INFILE")
STEP_TIME_SEQUENCE=$(extract_time_sequence "$INFILE")

# Output as JSON

# Robust output file logic: create a 'json' subdirectory if it doesn't exist
# and place the output file there. This matches the import script's expectation.
FILENAME=$(basename "$INFILE" .html)
BASE_DIR=$(dirname "$INFILE")
if [[ "$BASE_DIR" != *"/json" ]]; then
    OUTDIR="$BASE_DIR/json"
else
    OUTDIR="$BASE_DIR"
fi
mkdir -p "$OUTDIR"
OUTFILE="$OUTDIR/$FILENAME.json"

# Use direct redirection from the heredoc to the file.
# This is more robust than storing in a variable and using echo.
cat <<EOF > "$OUTFILE"
{
  "step_name": "$STEP_NAME",
  "step_type": "$STEP_TYPE",
  "step_number": ${STEP_NUMBER:-null},
  "step_title": "$STEP_TITLE",
  "step_predecessor": "$STEP_PREDECESSOR",
  "step_successor": "$STEP_SUCCESSOR",
  "step_assigned_team": "$STEP_ASSIGNED_TEAM",
  "step_impacted_teams": "$STEP_IMPACTED_TEAMS",
  "step_macro_time_sequence": "$STEP_MACRO_TIME_SEQUENCE",
  "step_time_sequence" : "$STEP_TIME_SEQUENCE",
  "step_instructions": $STEP_INSTRUCTIONS
}
EOF

# Print path of created file to stdout for confirmation
echo "Created JSON file: $OUTFILE"
