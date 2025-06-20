## [Unreleased]
### Added
- Deterministic fixture files for team members and teams CSV/mapping data in `__tests__/fixtures/`, enabling reproducible and robust test cases for all CSV import logic.
- Additional unit tests for `umig_csv_importer.js` using fixture data, including validation of all fixture rows, missing/invalid field checks, and non-integer ID detection.
### Changed
- Updated `README.md` in `/local-dev-setup/data-utils` to document fixture usage in the test suite and maintenance guidelines.
