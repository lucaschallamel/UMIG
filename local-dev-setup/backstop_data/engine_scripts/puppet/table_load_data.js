module.exports = async (page, scenario, vp) => {
  console.log("Loading table data...");

  await page.evaluate(() => {
    // Mock data for table component
    const mockData = [
      {
        id: 1,
        name: "Alice Johnson",
        email: "alice@example.com",
        status: "Active",
        role: "Admin",
      },
      {
        id: 2,
        name: "Bob Smith",
        email: "bob@example.com",
        status: "Active",
        role: "User",
      },
      {
        id: 3,
        name: "Carol Williams",
        email: "carol@example.com",
        status: "Inactive",
        role: "User",
      },
      {
        id: 4,
        name: "David Brown",
        email: "david@example.com",
        status: "Active",
        role: "Manager",
      },
      {
        id: 5,
        name: "Eva Davis",
        email: "eva@example.com",
        status: "Active",
        role: "User",
      },
    ];

    // Find table component and load data
    const tableComponent = window.UMIG_TEST_COMPONENTS?.table;
    if (tableComponent && tableComponent.loadData) {
      tableComponent.loadData(mockData);
    }

    // Alternative: trigger data load event
    if (window.UMIG_ORCHESTRATOR) {
      window.UMIG_ORCHESTRATOR.emit("test:loadTableData", { data: mockData });
    }
  });

  // Wait for table to render
  await page.waitForSelector(".table-component tbody tr", { timeout: 2000 });
  await page.waitForTimeout(500);
};
