/**
 * Excel Reader Utility
 * Handles Excel file parsing with validation
 */

const XLSX = require("xlsx");
const fs = require("fs").promises;

class ExcelReader {
  /**
   * Read Excel sheet to JSON
   * @param {string} filePath - Path to Excel file
   * @param {string} sheetName - Sheet name (optional, uses first sheet if not specified)
   * @returns {Promise<Array<Object>>} Parsed data
   */
  async readSheet(filePath, sheetName = null) {
    try {
      // Check file exists
      await fs.access(filePath);

      // Read workbook
      const workbook = XLSX.readFile(filePath);

      // Get sheet
      const sheet = sheetName
        ? workbook.Sheets[sheetName]
        : workbook.Sheets[workbook.SheetNames[0]];

      if (!sheet) {
        throw new Error(
          `Sheet "${sheetName || workbook.SheetNames[0]}" not found`,
        );
      }

      // Convert to JSON
      const data = XLSX.utils.sheet_to_json(sheet, {
        defval: null, // Use null for empty cells
        raw: false, // Convert dates to strings
      });

      return data;
    } catch (error) {
      throw new Error(
        `Failed to read Excel file ${filePath}: ${error.message}`,
      );
    }
  }

  /**
   * Get all sheet names from workbook
   * @param {string} filePath - Path to Excel file
   * @returns {Promise<Array<string>>} Sheet names
   */
  async getSheetNames(filePath) {
    try {
      const workbook = XLSX.readFile(filePath);
      return workbook.SheetNames;
    } catch (error) {
      throw new Error(`Failed to read workbook ${filePath}: ${error.message}`);
    }
  }

  /**
   * Validate Excel data against schema
   * @param {Array<Object>} data - Excel data
   * @param {Object} schema - Schema definition
   * @returns {Object} Validation result
   */
  validateSchema(data, schema) {
    const errors = [];
    const warnings = [];

    if (!data || data.length === 0) {
      errors.push("No data found in Excel file");
      return { valid: false, errors, warnings };
    }

    // Check required columns
    const firstRow = data[0];
    const actualColumns = Object.keys(firstRow);

    for (const [excelCol, dbCol] of Object.entries(schema.columns)) {
      if (
        schema.required?.includes(dbCol) &&
        !actualColumns.includes(excelCol)
      ) {
        errors.push(`Missing required column: ${excelCol}`);
      }
    }

    // Validate each row
    data.forEach((row, index) => {
      const rowNum = index + 2; // Excel rows start at 1, header is row 1

      for (const [excelCol, dbCol] of Object.entries(schema.columns)) {
        const value = row[excelCol];

        // Required field check
        if (schema.required?.includes(dbCol)) {
          if (value === null || value === undefined || value === "") {
            errors.push(
              `Row ${rowNum}: Missing required value for ${excelCol}`,
            );
          }
        }

        // Max length check
        if (value && schema.maxLength?.[dbCol]) {
          if (value.toString().length > schema.maxLength[dbCol]) {
            errors.push(
              `Row ${rowNum}: ${excelCol} exceeds max length ${schema.maxLength[dbCol]}`,
            );
          }
        }

        // Pattern validation
        if (value && schema.patterns?.[dbCol]) {
          const pattern = new RegExp(schema.patterns[dbCol]);
          if (!pattern.test(value.toString())) {
            warnings.push(
              `Row ${rowNum}: ${excelCol} doesn't match expected pattern`,
            );
          }
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      rowCount: data.length,
    };
  }
}

module.exports = ExcelReader;
