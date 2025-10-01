# CSV Import Templates

CSV templates for importing base entity data into UMIG system with proper dependency ordering.

## Structure

```
CSV_Templates/
├── teams_template.csv              # Team definitions (import first)
├── applications_template.csv       # Application definitions
├── environments_template.csv       # Environment definitions
└── users_template.csv              # User accounts (depends on teams)
```

## Contents

- **Templates**: Teams (10 records), Applications (15 records), Environments (10 records), Users (15 records)
- **Import Order**: Teams → Applications → Environments → Users (due to foreign key dependencies)
- **Validation Rules**: Required fields, uniqueness constraints, data types, format requirements

## Import Methods

- npm script (recommended): `npm run import-csv -- --file path/to/file.csv`
- API endpoints: Direct REST API calls with CSV payload
- Groovy service: CsvImportService for programmatic import

---

_Last Updated: 2025-10-01_
