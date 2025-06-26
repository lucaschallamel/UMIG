// SPA user list and detail view for UMIG

document.addEventListener('DOMContentLoaded', function() {
    const rootElement = document.getElementById('user-list-container');
    if (!rootElement) {
        console.error('UMIG Error: Could not find root element #user-list-container.');
        return;
    }

    // SPA state: 'list' or 'detail'
    let currentView = 'list';
    let lastUsers = [];

    function renderUserList(users) {
        currentView = 'list';
        lastUsers = users;
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
            // ID clickable
            const idTd = document.createElement('td');
            const idLink = document.createElement('a');
            idLink.href = '#';
            idLink.className = 'user-link';
            idLink.setAttribute('data-user-id', user.usr_id);
            idLink.textContent = user.usr_id;
            idTd.appendChild(idLink);
            row.appendChild(idTd);
            // The rest of the cells
            const cells = [user.usr_first_name, user.usr_last_name, user.usr_email];
            cells.forEach(text => {
                const td = document.createElement('td');
                td.textContent = text !== null ? text : 'N/A';
                row.appendChild(td);
            });
            idLink.addEventListener('click', function(e) {
                e.preventDefault();
                renderUserDetail(user.usr_id);
            });
            tbody.appendChild(row);
        });
        table.appendChild(tbody);
        rootElement.innerHTML = '';
        rootElement.appendChild(table);
    }

    function fetchAndRenderUserList() {
        fetch('/rest/scriptrunner/latest/custom/users')
            .then(response => {
                if (!response.ok) throw new Error(`Network response was not ok. Status: ${response.status}`);
                return response.json();
            })
            .then(users => renderUserList(users))
            .catch(error => {
                console.error('UMIG Error: Failed to fetch user list.', error);
                rootElement.innerHTML = `<div class="aui-message aui-message-error">Error: ${error.message}</div>`;
            });
    }

    function renderUserDetail(userId) {
        currentView = 'detail';
        rootElement.innerHTML = '<div class="aui-message">Loading User Details...</div>';
        fetch(`/rest/scriptrunner/latest/custom/users/${userId}`)
            .then(res => {
                if (!res.ok) {
                    throw new Error(`Server error: ${res.status}`);
                }
                return res.json();
            })
            .then(user => {
                if (!user || !user.usr_id) {
                    rootElement.innerHTML = '<div class="aui-message warning">User not found.</div>';
                    return;
                }
                // Build a table of all fields
                let html = '<table class="aui">';
                html += '<tbody>';
                for (const [key, value] of Object.entries(user)) {
                    html += '<tr>';
                    // Format key: 'usr_first_name' -> 'Usr First Name'
                    const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    html += `<th>${label}</th>`;
                    html += `<td>${value !== null ? value : 'N/A'}</td>`;
                    html += '</tr>';
                }
                html += '</tbody></table>';
                html += `<button id=\"edit-user-btn\" class=\"aui-button\">Edit</button> `;
                html += `<button id=\"back-to-list-btn\" class=\"aui-button\">Back to List</button>`;
                rootElement.innerHTML = html;
                document.getElementById('edit-user-btn').addEventListener('click', () => renderEditForm(user));
                document.getElementById('back-to-list-btn').addEventListener('click', fetchAndRenderUserList);
            })
            .catch(err => {
                rootElement.innerHTML = `<div class=\"aui-message error\">Error: ${err.message || err}</div>`;
            });
    }

    function renderEditForm(user) {
        let html = `<form id="edit-user-form"><table class="aui"><tbody>`;
        for (const [key, value] of Object.entries(user)) {
            // User ID: show but disable editing
            if (key === 'usr_id') {
                html += `<tr><th>${formatFieldLabel(key)}</th><td><input type="text" name="${key}" value="${value}" disabled></td></tr>`;
                continue;
            }
            // Boolean field (checkbox)
            if (typeof value === 'boolean') {
                html += `<tr><th>${formatFieldLabel(key)}</th><td><input type="checkbox" name="${key}" ${value ? 'checked' : ''}></td></tr>`;
                continue;
            }
            // Email field
            if (key.includes('email')) {
                html += `<tr><th>${formatFieldLabel(key)}</th><td><input type="email" name="${key}" value="${value !== null ? value : ''}"></td></tr>`;
                continue;
            }
            // Default: text input
            html += `<tr><th>${formatFieldLabel(key)}</th><td><input type="text" name="${key}" value="${value !== null ? value : ''}"></td></tr>`;
        }
        html += `</tbody></table>`;
        html += `<button type="submit" class="aui-button primary">Save</button> `;
        html += `<button type="button" id="cancel-edit-btn" class="aui-button">Cancel</button>`;
        html += `</form>`;
        rootElement.innerHTML = html;
        document.getElementById('cancel-edit-btn').addEventListener('click', () => renderUserDetail(user.usr_id));
        document.getElementById('edit-user-form').addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const payload = {};
            for (const [key, value] of Object.entries(user)) {
                if (key === 'usr_id') continue; // never edit primary key
                // Detect checkboxes by input type, not original value
                if (this.elements[key] && this.elements[key].type === 'checkbox') {
                    payload[key] = this.elements[key].checked;
                } else {
                    let v = formData.get(key);
                    // Try to cast numeric fields to numbers
                    if (v !== null && v !== '' && !isNaN(v) && key.match(/_id$|code$/)) {
                        v = Number(v);
                    }
                    payload[key] = v;
                }
            }
            saveUser(user.usr_id, payload);
        });
    }

    function formatFieldLabel(key) {
        return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }


    function saveUser(userId, payload) {
        fetch(`/rest/scriptrunner/latest/custom/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            renderUserDetail(userId);
        })
        .catch(err => {
            rootElement.innerHTML = `<div class=\"aui-message error\">Error: ${err.message || err}</div>`;
        });
    }

    // Initial load
    fetchAndRenderUserList();
});
