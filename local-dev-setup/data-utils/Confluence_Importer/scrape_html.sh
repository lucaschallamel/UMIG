#!/bin/bash
# scrape_html_oneline.sh : version modifiée pour générer du JSON sur une seule ligne
# Copie exacte de scrape_html.sh, avec compactage final via jq -c .

set -euo pipefail

# --- Reusable Functions ---
# (copié tel quel depuis scrape_html.sh)

extract_single_team() {
  local data_name="$1"
  local infile="$2"
  awk -v dname="$data_name" '
    state == 0 && index($0, "data-name=\"" dname "\"") { state = 1; next }
    state == 1 { if (/\/div>/) { state = 0 } if (/class="[^"]*aui-lozenge[^"]*"/) { state = 2 }; next }
    state == 2 { if (/>/) { state = 3 }; next }
    state == 3 {
      gsub(/<[^>]+>/, ""); gsub(/^[ \t\r\n]+|[ \t\r\n]+$/, "");
      if ($0 != "") { print; exit; }
    }
  ' "$infile"
}

extract_multiple_teams() {
    local data_name="$1"
    local infile="$2"
    awk -v dname="$data_name" '
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

extract_instructions() {
    local infile="$1"
    local table_block=$(awk '/<h1 id="[^"]*-TASKLIST">/,/<\/table>/' "$infile")
    echo "$table_block" | tr -d '\r\n' | sed 's/<\/tr>/\n/g' | awk '
    BEGIN {
        FS = "<td";
        print "[";
        first = 1;
    }
    /Assigned to/ { next; }
    NF > 3 {
        id_cell = $2;
        sub(/^[^>]+>/, "", id_cell);
        sub(/<\/td>.*/, "", id_cell);
        match(id_cell, /[A-Z]{3}-[0-9]+(-[0-9]+)?/, arr);
        if (RSTART > 0) { id = arr[0]; } else { id = ""; }
        text_cell = $3;
        sub(/^[^>]+>/, "", text_cell);
        sub(/<\/td>.*/, "", text_cell);
        text = text_cell;
        gsub(/<[^>]+>/, "", text);
        gsub(/&nbsp;/, " ", text);
        gsub(/^[ \t\r\n]+|[ \t\r\n]+$/, "", text);
        gsub(/"/, "\\\"", text); # échappement des guillemets
        assignee_cell = $4;
        sub(/^[^>]+>/, "", assignee_cell);
        sub(/<\/td>.*/, "", assignee_cell);
        assignee = assignee_cell;
        gsub(/<[^>]+>/, "", assignee);
        gsub(/&nbsp;/, " ", assignee);
        gsub(/^[ \t\r\n]+|[ \t\r\n]+$/, "", assignee);
        if (id != "") {
            if (!first) { print ","; }
            first = 0;
            printf "  {\"id\": \"%s\", \"text\": \"%s\", \"assignee\": \"%s\"}", id, text, assignee;
        }
    }
    END { print "\n]"; }
  '
}

extract_macro_time_sequence() {
    local infile="$1"
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

extract_time_sequence() {
    local infile="$1"
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

TITLE=$(awk -F'[<>]' '/<title>/ {print $3}' "$INFILE")
STEP_NAME=$(echo "$TITLE" | sed -E -n 's/.*([A-Z]{3}-[0-9]{5}).*/\1/p')

if [[ -z "$STEP_NAME" ]]; then
  echo "Warning: No step name found in '$INFILE'. Skipping." >&2
  exit 0
fi

STEP_TYPE=$(echo "$STEP_NAME" | cut -d'-' -f1)
STEP_NUMBER=$(echo "$STEP_NAME" | cut -d'-' -f2 | sed 's/^0*//')
STEP_TITLE=$(awk '/<div class="table-excerpt tei ".*data-name="TITLE"/{flag=1} flag && /<strong>/{gsub(/<[^>]+>/,""); print; flag=0}' "$INFILE" | head -n1 | sed 's/^ *//;s/ *$//' | sed -E 's/( - [^ -]+( [0-9]+)? PART *[0-9]+)$//; s/( - [0-9]+)$//' | tr -d '\n\r\t' | sed 's/\x22/\\"/g')
STEP_PREDECESSOR=$(awk '/<div class="table-excerpt tei / && /data-name="Predecessor"/{flag=1} flag&&match($0,/[A-Z]{3}-[0-9]{1,5}(-[A-Za-z])?/){print substr($0,RSTART,RLENGTH);flag=0}' "$INFILE" | head -n1)
STEP_SUCCESSOR=$(awk '/<div class="table-excerpt tei / && /data-name="Successor"/{flag=1} flag&&match($0,/[A-Z]{3}-[0-9]{1,5}(-[A-Za-z])?/){print substr($0,RSTART,RLENGTH);flag=0}' "$INFILE" | head -n1)
STEP_ASSIGNED_TEAM=$(extract_single_team "Primary_Assignee" "$INFILE")
STEP_IMPACTED_TEAMS=$(extract_multiple_teams "Impacted_Teams" "$INFILE" | paste -sd, -)
STEP_INSTRUCTIONS=$(extract_instructions "$INFILE")
STEP_MACRO_TIME_SEQUENCE=$(extract_macro_time_sequence "$INFILE")
STEP_TIME_SEQUENCE=$(extract_time_sequence "$INFILE")

FILENAME=$(basename "$INFILE" .html)
BASE_DIR=$(dirname "$INFILE")
if [[ "$BASE_DIR" != */json ]]; then
    OUTDIR="$BASE_DIR/json"
else
    OUTDIR="$BASE_DIR"
fi
mkdir -p "$OUTDIR"
OUTFILE="$OUTDIR/$FILENAME.json"

# Fonction utilitaire pour garantir un nombre JSON valide ou null
valider_nombre_json() {
  local valeur="$1"
  if [[ "$valeur" =~ ^-?[0-9]+$ ]]; then
    echo "$valeur"
  else
    echo "null"
  fi
}

cat <<EOF > "$OUTFILE"
{
  "step_name": "$STEP_NAME",
  "step_type": "$STEP_TYPE",
  "step_number": $(valider_nombre_json "$STEP_NUMBER"),
  "step_title": "$STEP_TITLE",
  "step_predecessor": "$STEP_PREDECESSOR",
  "step_successor": "$STEP_SUCCESSOR",
  "step_assigned_team": "$STEP_ASSIGNED_TEAM",
  "step_impacted_teams": "$STEP_IMPACTED_TEAMS",
  "step_macro_time_sequence": "$STEP_MACRO_TIME_SEQUENCE",
  "step_time_sequence": "$STEP_TIME_SEQUENCE",
  "step_instructions": $STEP_INSTRUCTIONS
}
EOF

jq -c . "$OUTFILE" > "$OUTFILE.tmp" && mv "$OUTFILE.tmp" "$OUTFILE"

echo "Fichier JSON créé : $OUTFILE"

