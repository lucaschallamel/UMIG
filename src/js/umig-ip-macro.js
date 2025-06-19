// UMD (Universal Module Definition) for compatibility with Confluence
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define('umig-ip-macro', ['jquery'], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('jquery'));
    } else {
        root.UMIG_IP_MACRO = factory(root.AJS.$);
    }
}(this, function ($) {
    'use strict';

    function init(container) {
        const macroContainer = $(container);

        // Basic HTML structure for the macro
        const initialHtml = `
            <div id="ip-container">
                <h2>Implementation Plans</h2>
                <div class="aui-buttons">
                    <button id="add-ip-btn" class="aui-button aui-button-primary">Create New Plan</button>
                </div>
                <div id="ip-list-container" style="margin-top: 20px;">
                    <p>Loading Implementation Plans...</p>
                </div>
            </div>
        `;

        macroContainer.html(initialHtml);

        const ipListContainer = macroContainer.find("#ip-list-container");

        // Function to fetch Implementation Plans from the backend
        function fetchImplementationPlans() {
            const apiUrl = AJS.contextPath() + "/rest/scriptrunner/latest/custom/getAllImplementationPlans";

            $.ajax({
                url: apiUrl,
                type: "GET",
                contentType: "application/json",
                success: function(response) {
                    renderImplementationPlans(response);
                },
                error: function(xhr, status, error) {
                    console.error("Error fetching Implementation Plans:", status, error);
                    ipListContainer.html("<div class='aui-message aui-message-error'><p class='title'><strong>Error</strong></p><p>Could not load Implementation Plans. Please check the browser console for details.</p></div>");
                }
            });
        }

        // Function to render the list of Implementation Plans
        function renderImplementationPlans(plans) {
            if (!plans || plans.length === 0) {
                ipListContainer.html("<div class='aui-message aui-message-info'><p>No Implementation Plans found. Click 'Create New Plan' to get started.</p></div>");
                return;
            }

            let tableHtml = `
                <table class="aui">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Title</th>
                            <th>Data Migration Code</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            plans.forEach(plan => {
                tableHtml += `
                    <tr>
                        <td>${escapeHtml(plan.id)}</td>
                        <td>${escapeHtml(plan.title)}</td>
                        <td>${escapeHtml(plan.data_migration_code || '')}</td>
                        <td>
                            <button class="aui-button aui-button-link view-btn" data-id="${plan.id}">View</button>
                            <button class="aui-button aui-button-link edit-btn" data-id="${plan.id}">Edit</button>
                            <button class="aui-button aui-button-link delete-btn" data-id="${plan.id}">Delete</button>
                        </td>
                    </tr>
                `;
            });

            tableHtml += `
                    </tbody>
                </table>
            `;

            ipListContainer.html(tableHtml);
        }

        // Utility function to escape HTML to prevent XSS
        function escapeHtml(str) {
            if (str === null || typeof str === 'undefined') return '';
            return String(str).replace(/[&<>"']/g, function (tag) {
                return {
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;'
                }[tag] || tag;
            });
        }

        // Initial fetch of data when the macro loads
        fetchImplementationPlans();
    }

    // Expose the init function
    return { init: init };
}));

// Standard Confluence macro initialization
AJS.toInit(function($) {
    $('.umig-ip-macro-container').each(function() {
        UMIG_IP_MACRO.init(this);
    });
});
