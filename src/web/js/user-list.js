document.addEventListener('DOMContentLoaded', function() {
    const rootElement = document.getElementById('user-list-container');
    if (!rootElement) {
        console.error('UMIG Error: Could not find root element #user-list-container.');
        return;
    }

    const apiUrl = '/rest/scriptrunner/latest/custom/users';

    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Network response was not ok. Status: ${response.status}`);
            }
            return response.json();
        })
        .then(users => {
            if (!users || users.length === 0) {
                rootElement.innerHTML = `<div class="aui-message aui-message-info">No users found.</div>`;
                return;
            }

            const table = document.createElement('table');
            table.className = 'aui';

            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            const headers = ['ID', 'First Name', 'Last Name', 'Email'];
            headers.forEach(text => {
                const th = document.createElement('th');
                th.textContent = text;
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);

            const tbody = document.createElement('tbody');
            users.forEach(user => {
                const row = document.createElement('tr');
                const cells = [user.usr_id, user.usr_first_name, user.usr_last_name, user.usr_email];
                cells.forEach(text => {
                    const td = document.createElement('td');
                    td.textContent = text !== null ? text : 'N/A';
                    row.appendChild(td);
                });
                tbody.appendChild(row);
            });
            table.appendChild(tbody);

            rootElement.innerHTML = '';
            rootElement.appendChild(table);
        })
        .catch(error => {
            console.error('UMIG Error: Failed to fetch user list.', error);
            rootElement.innerHTML = `<div class="aui-message aui-message-error">Error: ${error.message}</div>`;
        });
});
