#!/bin/bash
# test_scrape_html_oneline.sh : tests unitaires pour scrape_html_oneline.sh
set -euo pipefail

# Dossier de travail temporaire pour les tests
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

# 1. Génère un fichier HTML minimal avec une instruction contenant des guillemets
cat > "$TMPDIR/test.html" <<EOF
<html><head><title>CHK-12345 - Test</title></head>
<body>
<h1 id="CHK-12345-TASKLIST">Task List</h1>
<table><tr><th>ID</th><th>Text</th><th>Assigned to</th></tr>
<tr><td>CHK-12345-1</td><td>Instruction avec un \"gros\" guillemet</td><td>Equipe X</td></tr>
</table>
</body></html>
EOF

# 2. Crée le dossier json/ attendu par le script
mkdir -p "$TMPDIR/json"

# 3. Appelle le script pour générer le JSON
SCRIPT_DIR="$(dirname "$0")"
"$SCRIPT_DIR/scrape_html_oneline.sh" "$TMPDIR/test.html"

# 4. Vérifie la validité du JSON
JSONFILE="$TMPDIR/json/test.json"
if ! jq . "$JSONFILE" > /dev/null; then
  echo "[ECHEC] Le JSON généré n'est pas valide !" >&2
  exit 1
fi

# 5. Vérifie la présence et l'échappement correct du guillemet dans l'instruction
if ! grep -q '\\"gros\\"' "$JSONFILE"; then
  echo "[ECHEC] Les guillemets ne sont pas correctement échappés dans l'instruction !" >&2
  exit 1
fi

# 6. Vérifie la présence de la clé step_name
if ! jq -e '.step_name' "$JSONFILE" > /dev/null; then
  echo "[ECHEC] La clé step_name est absente du JSON généré !" >&2
  exit 1
fi

echo "[SUCCES] Tous les tests unitaires sont passés pour scrape_html_oneline.sh."
