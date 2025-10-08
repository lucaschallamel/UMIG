const XLSX = require("xlsx");

const workbook = XLSX.readFile(
  "/Users/lucaschallamel/Documents/GitHub/UMIG/db/import-data/teams.xlsx",
);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: false });

// Count email occurrences
const emailCounts = {};
data.forEach((row) => {
  const email = row.tms_email || null;
  if (email) {
    emailCounts[email] = (emailCounts[email] || 0) + 1;
  }
});

// Find duplicates
const duplicates = Object.entries(emailCounts).filter(
  ([email, count]) => count > 1,
);
console.log("Duplicate emails in Excel:");
duplicates.forEach(([email, count]) => {
  console.log(`  ${email}: ${count} teams`);
  const teams = data
    .filter((row) => row.tms_email === email)
    .map((r) => r.tms_name);
  console.log(`    Teams: ${teams.join(", ")}`);
});

console.log(`\nTotal teams: ${data.length}`);
const nullEmails = data.filter(
  (r) => !r.tms_email || r.tms_email.trim() === "",
).length;
console.log(`Teams with NULL/empty email: ${nullEmails}`);
