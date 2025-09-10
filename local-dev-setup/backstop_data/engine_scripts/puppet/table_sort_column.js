module.exports = async (page, scenario, vp) => {
  console.log("Sorting table column...");

  await page.evaluate(() => {
    const mockData = [
      {
        id: 3,
        name: "Carol Williams",
        email: "carol@example.com",
        status: "Inactive",
        role: "User",
      },
      {
        id: 1,
        name: "Alice Johnson",
        email: "alice@example.com",
        status: "Active",
        role: "Admin",
      },
      {
        id: 4,
        name: "David Brown",
        email: "david@example.com",
        status: "Active",
        role: "Manager",
      },
      {
        id: 2,
        name: "Bob Smith",
        email: "bob@example.com",
        status: "Active",
        role: "User",
      },
    ];

    const tableComponent = window.UMIG_TEST_COMPONENTS?.table;
    if (tableComponent) {
      tableComponent.loadData(mockData);
      // Sort by name ascending
      setTimeout(() => {
        if (tableComponent.sortBy) {
          tableComponent.sortBy("name", "asc");
        }
      }, 100);
    }
  });

  // Wait for sort to be applied
  await page.waitForSelector(".table-component thead th.sorted", {
    timeout: 2000,
  });
  await page.waitForTimeout(300);
};
