#!/bin/bash
# scrape_html.sh: Extracts structured data from HTML files using reusable functions.
# Usage: ./scrape_html.sh rawData/input.html

# --- Reusable Functions ---

# Extracts the *first* team name from a specific "data-name" block.
extract_single_team() {
  local data_name="$1"
  local infile="$2"
  awk -v dname="$data_name" '
    state == 0 && /<div class="table-excerpt tei / && $0 ~ "data-name=\"" dname "\"" { state = 1; next }
    state == 1 { if (/<\/div>/) { state = 0 } if (/class="[^"]*aui-lozenge[^"]*"/) { state = 2 }; next }
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
        state == 0 && /<div class="table-excerpt tei / && $0 ~ "data-name=\"" dname "\"" { state = 1; next }
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
    local table_block=$(awk '/<h1 id="[^\"]*-TASKLIST\">/,/\<\/table\>/' "$infile")

    # Process the isolated block
    echo "$table_block" | awk '
    BEGIN {
        RS = "</tr>"
        FS = "<td"
        print "["
        first = 1
    }
    # Skip header row
    /Assigned to/ { next }

    NF > 3 {
        id = $2; sub(/.*<pre>/, "", id); sub(/<\/pre>.*/, "", id);

        text = $3; gsub(/<[^>]+>/, " ", text); gsub(/^[ \t\n]+|[ \t\n]+$/, "", text); gsub(/\"/, "\\\"", text);

        assignee = $4;
        if (assignee ~ /class=\"[^\"]*aui-lozenge[^\"]*\"/) {
            sub(/.*class=\"[^\"]*aui-lozenge[^\"]*\"[^>]*>/, "", assignee);
            sub(/<\/span>.*/, "", assignee);
            gsub(/[ \t\n]+/, "", assignee);
        } else { assignee = "" }
        
        if (id != "") {
            if (!first) { print "," }
            first = 0
            printf "  {\"id\": \"%s\", \"text\": \"%s\", \"assignee\": \"%s\"}", id, text, assignee
        }
    }
    END { print "\n]" }
  '
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

if [[ -n "$STEP_NAME" ]]; then
  STEP_TYPE=$(echo "$STEP_NAME" | cut -d'-' -f1)
  STEP_NUMBER=$(echo "$STEP_NAME" | cut -d'-' -f2 | sed 's/^0*//')
else
  STEP_TYPE=""; STEP_NUMBER=null
fi

STEP_TITLE=$(awk '/<div class="table-excerpt tei ".*data-name="TITLE"/{flag=1} flag && /<strong>/{gsub(/<[^>]+>/,""); print; flag=0}' "$INFILE" | head -n1 | sed 's/^ *//;s/ *$//' | sed -E 's/( - [^ -]+( [0-9]+)? PART *[0-9]+)$//; s/( - [0-9]+)$//')
STEP_PREDECESSOR=$(awk '/<div class="table-excerpt tei / && /data-name="Predecessor"/{flag=1} flag&&match($0,/[A-Z]{3}-[0-9]{1,5}(-[A-Za-z])?/){print substr($0,RSTART,RLENGTH);flag=0}' "$INFILE" | head -n1)
STEP_SUCCESSOR=$(awk '/<div class="table-excerpt tei / && /data-name="Successor"/{flag=1} flag&&match($0,/[A-Z]{3}-[0-9]{1,5}(-[A-Za-z])?/){print substr($0,RSTART,RLENGTH);flag=0}' "$INFILE" | head -n1)

# Extract team and instruction information
STEP_ASSIGNED_TEAM=$(extract_single_team "Primary_Assignee" "$INFILE")
STEP_IMPACTED_TEAMS=$(extract_multiple_teams "Impacted_Teams" "$INFILE" | paste -sd, -)
STEP_INSTRUCTIONS=$(extract_instructions "$INFILE")

# Output as JSON
cat <<EOF
{
  "step_name": "$STEP_NAME",
  "step_type": "$STEP_TYPE",
  "step_number": ${STEP_NUMBER:-null},
  "step_title": "$STEP_TITLE",
  "step_predecessor": "$STEP_PREDECESSOR",
  "step_successor": "$STEP_SUCCESSOR",
  "step_assigned_team": "$STEP_ASSIGNED_TEAM",
  "step_impacted_teams": "$STEP_IMPACTED_TEAMS",
  "step_instructions": $STEP_INSTRUCTIONS
}
EOF
