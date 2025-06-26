document.addEventListener('DOMContentLoaded', function() {
    const rootElement = document.getElementById('umig-user-view-root');
    if (!rootElement) {
        console.error('UMIG Error: Root element #umig-user-view-root not found.');
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const userId = params.get('userid');

    if (!userId) {
        rootElement.innerHTML = `<div class="aui-message aui-message-warning">Info: 'userid' parameter not found in the URL.</div>`;
        return;
    }

    // The existing UsersApi expects the ID in the path, not as a query param.
    const apiUrl = `/rest/scriptrunner/latest/custom/users/${userId}`;

    fetch(apiUrl)
        .then(response => {
            if (response.status === 404) {
                return response.json().then(err => { throw new Error(`User with ID ${userId} not found.`); });
            }
            if (!response.ok) {
                throw new Error(`Network response was not ok. Status: ${response.status}`);
            }
            return response.json();
        })
        .then(userData => {
            const table = document.createElement('table');
            table.className = 'aui';

            const tbody = document.createElement('tbody');
            for (const [key, value] of Object.entries(userData)) {
                const row = document.createElement('tr');
                
                const th = document.createElement('th');
                // Format key for readability: 'usr_first_name' -> 'Usr First Name'
                th.textContent = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); 
                
                const td = document.createElement('td');
                td.textContent = value !== null ? value : 'N/A';
                
                row.appendChild(th);
                row.appendChild(td);
                tbody.appendChild(row);
            }
            table.appendChild(tbody);

            rootElement.innerHTML = '';
            rootElement.appendChild(table);
        })
        .catch(error => {
            console.error('UMIG Error: Failed to fetch user data.', error);
            rootElement.innerHTML = `<div class="aui-message aui-message-error">Error: ${error.message}</div>`;
        });
});
