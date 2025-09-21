/**
 * Test script for Users CRUD operations
 * Run this in browser console to test Create, Update, Delete functionality
 */

(async function testUsersCRUD() {
  console.log("=== USERS CRUD TEST START ===");

  // 1. Get the manager instance
  const manager = window.currentEntityManager || window.usersManager;
  if (!manager || !(manager instanceof UsersEntityManager)) {
    console.error("❌ No UsersEntityManager instance found");
    return;
  }
  console.log("✅ UsersEntityManager instance found");

  // Test data
  const testUser = {
    usr_code: `TEST_${Date.now()}`,
    usr_first_name: "Test",
    usr_last_name: "User",
    usr_email: `test${Date.now()}@example.com`,
    usr_active: true,
    usr_is_admin: false,
  };

  try {
    // 2. Test CREATE
    console.log("\n📝 Testing CREATE...");
    const createdUser = await manager._createEntityData(testUser);
    console.log("✅ User created:", createdUser);

    if (!createdUser || !createdUser.usr_id) {
      console.error("❌ Create failed - no usr_id returned");
      return;
    }

    // 3. Test UPDATE
    console.log("\n📝 Testing UPDATE...");
    const updateData = {
      ...createdUser,
      usr_first_name: "Updated",
      usr_last_name: "Name",
      usr_is_admin: true,
    };

    const updatedUser = await manager._updateEntityData(
      createdUser.usr_id,
      updateData,
    );
    console.log("✅ User updated:", updatedUser);

    // 4. Test DELETE
    console.log("\n📝 Testing DELETE...");
    const deleteResult = await manager._deleteEntityData(createdUser.usr_id);
    console.log("✅ User deleted:", deleteResult);

    // 5. Refresh data to see changes
    console.log("\n🔄 Refreshing table data...");
    await manager.loadData();
    console.log("✅ Table data refreshed");

    console.log("\n=== CRUD TEST COMPLETE ===");
    console.log("All CRUD operations working correctly!");
  } catch (error) {
    console.error("❌ CRUD test failed:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      response: error.response,
    });
  }

  // Additional UI interaction tests
  console.log("\n=== UI INTERACTION TEST ===");

  // Check if modal can be opened
  const addButton = document.querySelector('[data-action="add"]');
  if (addButton) {
    console.log("✅ Add button found");
    console.log("Try clicking the 'Add New User' button to test the modal");
  } else {
    console.log("⚠️ Add button not found - may need to be added to UI");
  }

  // Check if edit buttons exist
  const editButtons = document.querySelectorAll(".action-edit");
  if (editButtons.length > 0) {
    console.log(`✅ ${editButtons.length} Edit buttons found`);
    console.log("Try clicking an Edit button to test update functionality");
  } else {
    console.log("⚠️ No Edit buttons found - data may need to be loaded first");
  }

  // Check if delete buttons exist
  const deleteButtons = document.querySelectorAll(".action-delete");
  if (deleteButtons.length > 0) {
    console.log(`✅ ${deleteButtons.length} Delete buttons found`);
    console.log("Try clicking a Delete button to test delete functionality");
  } else {
    console.log(
      "⚠️ No Delete buttons found - data may need to be loaded first",
    );
  }

  console.log("\n=== END OF TESTS ===");
})();
