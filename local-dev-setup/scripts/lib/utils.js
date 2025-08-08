import { faker } from "@faker-js/faker";

const SEQUENCE_NAMES = [
  "PRE-MIGRATION",
  "CSD MIGRATION",
  "INTERIM WEEK",
  "P&C MIGRATION",
  "POST-MIGRATION",
];
const ITERATION_TYPES = ["RUN", "DR", "CUTOVER"];
const ITERATION_WINDOW_DAYS = 13;
const ENVIRONMENTS = [
  { name: "PROD" },
  { name: "EV1" },
  { name: "EV2" },
  { name: "EV3" },
  { name: "EV4" },
  { name: "EV5" },
];

function randomDateInRange(startStr, endStr) {
  const start = new Date(startStr).getTime();
  const end = new Date(endStr).getTime();
  return new Date(start + Math.random() * (end - start));
}

function getSequenceWindows(iterStart, iterEnd) {
  const seqWindows = [];
  const d = new Date(iterStart);
  // PRE-MIGRATION: Thursday 00:00 → Friday 12:00
  const preMigStart = new Date(d);
  const preMigEnd = new Date(d);
  preMigEnd.setDate(d.getDate() + 1);
  preMigEnd.setHours(12, 0, 0, 0);
  seqWindows.push({ start: preMigStart, end: preMigEnd });
  // CSD MIGRATION: Friday 12:00 → Monday 06:00
  const csdMigStart = new Date(preMigEnd);
  const csdMigEnd = new Date(d);
  csdMigEnd.setDate(d.getDate() + (((8 - d.getDay()) % 7) + 4));
  csdMigEnd.setHours(6, 0, 0, 0); // Monday after Thursday
  seqWindows.push({ start: csdMigStart, end: csdMigEnd });
  // INTERIM WEEK: Monday 06:00 → next Friday 12:00
  const interimStart = new Date(csdMigEnd);
  const interimEnd = new Date(d);
  interimEnd.setDate(d.getDate() + 8);
  interimEnd.setHours(12, 0, 0, 0); // Friday next week
  seqWindows.push({ start: interimStart, end: interimEnd });
  // P&C MIGRATION: next Friday 12:00 → next Monday 06:00
  const pcmigStart = new Date(interimEnd);
  const pcmigEnd = new Date(d);
  pcmigEnd.setDate(d.getDate() + 11);
  pcmigEnd.setHours(6, 0, 0, 0); // Monday next week
  seqWindows.push({ start: pcmigStart, end: pcmigEnd });
  // POST-MIGRATION: next Monday 06:00 → next Tuesday (iteration end)
  const postMigStart = new Date(pcmigEnd);
  const postMigEnd = new Date(iterEnd);
  seqWindows.push({ start: postMigStart, end: postMigEnd });
  return seqWindows;
}

function nextThursday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (4 - day + 7) % 7; // 4 = Thursday
  if (diff === 0) return d; // already Thursday
  d.setDate(d.getDate() + diff);
  return d;
}

function makeTeamEmail(teamName, domain) {
  // Lowercase, replace spaces with _, remove non-alphanum/underscore
  return (
    teamName
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "") +
    "@" +
    domain
  );
}

export {
  faker,
  SEQUENCE_NAMES,
  ITERATION_TYPES,
  ITERATION_WINDOW_DAYS,
  ENVIRONMENTS,
  randomDateInRange,
  getSequenceWindows,
  nextThursday,
  makeTeamEmail,
};
