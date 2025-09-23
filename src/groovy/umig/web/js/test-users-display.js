/**
 * Test script for Users Entity Manager display functionality
 * Run this in browser console to diagnose data display issues
 */

(function testUsersDisplay() {
  console.log("=== USERS DISPLAY TEST START ===");

  // 1. Check if UsersEntityManager exists
  if (typeof UsersEntityManager === "undefined") {
    console.error("❌ UsersEntityManager not loaded");
    return;
  }
  console.log("✅ UsersEntityManager loaded");

  // 2. Get the manager instance
  const manager = window.currentEntityManager || window.usersManager;
  if (!manager || !(manager instanceof UsersEntityManager)) {
    console.error("❌ No UsersEntityManager instance found");
    return;
  }
  console.log("✅ UsersEntityManager instance found");

  // 3. Check table component
  const tableComponent = manager.components?.get("table");
  if (!tableComponent) {
    console.error("❌ No table component found");
    return;
  }
  console.log("✅ Table component found");

  // 4. Check current data
  const currentData = tableComponent.data || [];
  console.log(`📊 Current data count: ${currentData.length}`);

  if (currentData.length > 0) {
    console.log("📋 Sample data (first 3 rows):");
    currentData.slice(0, 3).forEach((row, idx) => {
      console.log(`Row ${idx + 1}:`, {
        usr_code: row.usr_code,
        usr_first_name: row.usr_first_name,
        usr_last_name: row.usr_last_name,
        usr_email: row.usr_email,
        usr_active: row.usr_active,
        usr_is_admin: row.usr_is_admin,
      });
    });
  }

  // 5. Check column configuration
  const columns = tableComponent.config?.columns || [];
  console.log("📊 Column configuration:");
  columns.forEach((col) => {
    console.log(`- ${col.label}: field="${col.field}", render=${!!col.render}`);
  });

  // 6. Test column rendering
  if (currentData.length > 0) {
    console.log("\n🔍 Testing column rendering for first row:");
    const testRow = currentData[0];
    columns.forEach((col) => {
      let value;
      if (col.render) {
        try {
          value = col.render(testRow);
        } catch (e) {
          value = `ERROR: ${e.message}`;
        }
      } else {
        value = testRow[col.field];
      }
      console.log(`${col.label}: "${value}"`);
    });
  }

  // 7. Check table DOM
  const tableElement = document.querySelector("#dataTable table");
  if (!tableElement) {
    console.error("❌ No table element found in DOM");
  } else {
    console.log("✅ Table element found in DOM");
    const rows = tableElement.querySelectorAll("tbody tr");
    console.log(`📊 Table rows in DOM: ${rows.length}`);

    if (rows.length > 0) {
      const cells = rows[0].querySelectorAll("td");
      console.log(`📊 Cells in first row: ${cells.length}`);
      console.log(
        "Cell contents:",
        Array.from(cells).map((c) => c.textContent.trim()),
      );
    }
  }

  // 8. Try manual render
  console.log("\n🔧 Attempting manual render...");
  if (tableComponent.render) {
    try {
      tableComponent.render();
      console.log("✅ Manual render completed");
    } catch (e) {
      console.error("❌ Manual render failed:", e);
    }
  }

  // 9. Check for any errors in component
  if (tableComponent.errors && tableComponent.errors.length > 0) {
    console.error("⚠️ Table component errors:", tableComponent.errors);
  }

  console.log("\n=== USERS DISPLAY TEST END ===");
  console.log("Next steps:");
  console.log("1. Check browser console for errors");
  console.log("2. Verify API is returning data (Network tab)");
  console.log("3. Look for render function errors above");
})();
