module.exports = async (page, scenario, vp) => {
  console.log("Applying filter values...");

  await page.evaluate(() => {
    const filterComponent = window.UMIG_TEST_COMPONENTS?.filter;
    if (filterComponent) {
      // Apply various filter values
      setTimeout(() => {
        if (filterComponent.setFilterValue) {
          filterComponent.setFilterValue("name", "Johnson");
          filterComponent.setFilterValue("status", "Active");
          filterComponent.setFilterValue("role", "Admin");
        } else if (filterComponent.applyFilter) {
          filterComponent.applyFilter("name", "Johnson");
          filterComponent.applyFilter("status", "Active");
          filterComponent.applyFilter("role", "Admin");
        }
      }, 100);
    }

    // Alternative: directly manipulate form elements
    const nameInput = document.querySelector(
      '.filter-component input[name="name"]',
    );
    const statusSelect = document.querySelector(
      '.filter-component select[name="status"]',
    );
    const roleSelect = document.querySelector(
      '.filter-component select[name="role"]',
    );

    if (nameInput) nameInput.value = "Johnson";
    if (statusSelect) statusSelect.value = "Active";
    if (roleSelect) roleSelect.value = "Admin";
  });

  // Wait for filters to be applied
  await page.waitForTimeout(500);
};
