module.exports = async (page, scenario, vp) => {
  console.log("Selecting table rows...");

  await page.evaluate(() => {
    // Mock data first
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
    ];

    const tableComponent = window.UMIG_TEST_COMPONENTS?.table;
    if (tableComponent) {
      tableComponent.loadData(mockData);
      // Select first and third rows
      setTimeout(() => {
        tableComponent.selectRow(1);
        tableComponent.selectRow(3);
      }, 100);
    }
  });

  // Wait for selection to be applied
  await page.waitForSelector(".table-component tbody tr.selected", {
    timeout: 2000,
  });
  await page.waitForTimeout(300);
};
