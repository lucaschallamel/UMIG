# Testing Users CRUD Operations - Phase 2 Completion Guide

## Testing Steps

### 1. Refresh the Admin GUI Page

- Clear browser cache (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows/Linux)
- Navigate to the Users entity in the Admin GUI

### 2. Verify Table Data Display ✅

The Users table should now display:

- User Code
- Full Name (combining first and last name)
- Email
- Active status (Yes/No)
- Role (Admin/User)
- Action buttons (Edit, Delete)

### 3. Test Add New User

Look for the "Add New User" button above the table:

- Click "Add New User"
- Fill in the form:
  - User Code: TEST001
  - First Name: Test
  - Last Name: User
  - Email: test@example.com
  - Active: Check the box
  - Role: Select User or Admin
- Click Save
- Verify the new user appears in the table

### 4. Test Edit User

- Click the Edit button (pencil icon) for any user
- Modify some fields
- Click Save
- Verify the changes are reflected in the table

### 5. Test Delete User

- Click the Delete button (trash icon) for the test user
- Confirm the deletion
- Verify the user is removed from the table

### 6. Test Refresh

- Click the Refresh button next to "Add New User"
- Verify the table reloads with current data

## Console Testing Scripts

### Quick Display Test

```javascript
// Run this in browser console to verify data is displaying
const manager = window.currentEntityManager;
if (manager && manager.tableComponent) {
  const data = manager.tableComponent.config.data;
  console.log(`Users in table: ${data ? data.length : 0}`);
  if (data && data.length > 0) {
    console.log("Sample user:", data[0]);
  }
}
```

### Test CRUD via Console

```javascript
// Load the test script
const script = document.createElement("script");
script.src = "/rest/scriptrunner/latest/custom/web?path=test-users-crud.js";
document.head.appendChild(script);
```

## Troubleshooting

### If the table is empty:

1. Check browser console for errors
2. Verify the API is returning data (Network tab)
3. Run the display test script above

### If Add/Edit/Delete buttons don't work:

1. Check if modal component is loaded: `console.log(!!window.ModalComponent)`
2. Check if entity manager has modal: `console.log(!!window.currentEntityManager.modalComponent)`
3. Look for errors in the browser console

### If the toolbar doesn't appear:

Run this in console to manually create it:

```javascript
if (window.currentEntityManager && window.currentEntityManager.createToolbar) {
  window.currentEntityManager.createToolbar();
}
```

## Phase 2 Completion Checklist

- [x] Users table displays data with all columns
- [x] Column values are properly formatted (Full Name, Active Yes/No, Role Admin/User)
- [x] CRUD methods implemented in UsersEntityManager
- [ ] Add New User button works
- [ ] Edit button opens modal with user data
- [ ] Delete button removes user
- [ ] Refresh button reloads data
- [ ] All operations update the table display

## Next Steps (Phase 3)

Once all items above are checked, Phase 2 is complete and you can proceed to:

- Phase 3: Teams Entity Manager Activation
- Verify Teams CRUD implementation
- Fix Teams duplicate methods issue
