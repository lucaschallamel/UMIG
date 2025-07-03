// user-detail.js — Handles display and editing of a single user in the user detail macro

(function() {
    const container = document.getElementById('user-detail-container');
    const urlParams = new URLSearchParams(window.location.search);
    let userId = urlParams.get('userId');

    // If not found in URL, try to extract from macro param (for SSR replacement)
    if (!userId) {
        const macroParam = container.getAttribute('data-user-id');
        if (macroParam) userId = macroParam;
    }
    if (!userId) {
        container.innerHTML = '<div class="aui-message error">No user ID specified.</div>';
        return;
    }

    const apiBase = `/rest/scriptrunner/latest/custom/userApi/user/${userId}`;

    function fetchUser() {
        fetch(apiBase)
            .then(res => res.json())
            .then(user => renderUserDetail(user))
            .catch(err => showError(err));
    }

    function renderUserDetail(user) {
        if (!user || !user.usr_id) {
            container.innerHTML = '<div class="aui-message warning">User not found.</div>';
            return;
        }
        let html = `<h2>User: ${user.usr_first_name} ${user.usr_last_name}</h2>`;
        html += `<p>Email: ${user.usr_email}</p>`;
        html += `<button id="edit-user-btn" class="aui-button">Edit</button>`;
        container.innerHTML = html;
        document.getElementById('edit-user-btn').addEventListener('click', () => renderEditForm(user));
    }

    function renderEditForm(user) {
        let html = `<form id="edit-user-form">
            <label>First Name: <input type="text" name="usr_first_name" value="${user.usr_first_name}" required></label><br>
            <label>Last Name: <input type="text" name="usr_last_name" value="${user.usr_last_name}" required></label><br>
            <label>Email: <input type="email" name="usr_email" value="${user.usr_email}" required></label><br>
            <label>Is Admin: <input type="checkbox" name="usr_is_admin" ${user.usr_is_admin ? 'checked' : ''}></label><br>
            <button type="submit" class="aui-button primary">Save</button>
            <button type="button" id="cancel-edit-btn" class="aui-button">Cancel</button>
        </form>`;
        container.innerHTML = html;
        document.getElementById('cancel-edit-btn').addEventListener('click', fetchUser);
        document.getElementById('edit-user-form').addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const payload = {
                usr_first_name: formData.get('usr_first_name'),
                usr_last_name: formData.get('usr_last_name'),
                usr_email: formData.get('usr_email'),
                usr_is_admin: formData.get('usr_is_admin') === 'on'
            };
            saveUser(payload);
        });
    }

    function saveUser(payload) {
        fetch(apiBase, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            fetchUser();
        })
        .catch(err => showError(err));
    }

    function showError(err) {
        container.innerHTML = `<div class="aui-message error">Error: ${err.message || err}</div>`;
    }

    fetchUser();
})();
