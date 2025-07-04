/**
 * STEP View Client-side Controller
 *
 * - Parses 'stepid' from the URL query string.
 * - Calls the ScriptRunner REST endpoint to fetch the rendered HTML.
 * - Injects the HTML into the placeholder div.
 */
(function() {
    /**
     * Renders the main summary table for the STEP.
     * @param {object} step - The step data object from the API.
     * @returns {string} HTML string for the summary table.
     */
    // Renders the summary table using the actual API response fields
    function renderSummaryTable(step) {
        const summaryFields = {
            'ID': step.ID,
            'Name': step.Name,
            'Description': step.Description,
            'Type': step.Type
            // Add additional fields here if the API returns more
        };

        let tableRows = '';
        for (const [label, value] of Object.entries(summaryFields)) {
            tableRows += `<tr><th>${label}</th><td>${value || ''}</td></tr>`;
        }

        return `<table class="aui">${tableRows}</table>`;
    }

    /**
     * Renders the instructions table.
     * @param {Array<object>} instructions - The list of instruction objects.
     * @returns {string} HTML string for the instructions table.
     */
    // Renders the instructions table using the actual API response fields
    function renderInstructionsTable(instructions) {
        const headers = ['Order', 'Description'];
        let headerHtml = '<thead><tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr></thead>';

        let bodyHtml = '<tbody>';
        if (instructions && instructions.length > 0) {
            instructions.forEach(instr => {
                bodyHtml += `<tr>
                    <td>${instr.Order || ''}</td>
                    <td>${instr.Description || ''}</td>
                </tr>`;
                bodyHtml += `<td>${instr.controlCode || ''}</td>`;
                bodyHtml += '</tr>';
            });
        } else {
            bodyHtml += `<tr><td colspan="${headers.length}">No instructions found.</td></tr>`;
        }
        bodyHtml += '</tbody>';

        return `<table class="aui">${headerHtml}${bodyHtml}</table>`;
    }

    // --- Main Execution ---
    const params = new URLSearchParams(window.location.search);
    const stepId = params.get('stepid');
    const container = document.getElementById('umig-step-view-root');

    if (!container) {
        console.error('UMIG Error: Placeholder div #umig-step-view-root not found.');
        return;
    }

    if (!stepId) {
        container.innerHTML = "<div class='aui-message aui-message-info'>Info: 'stepid' parameter not found in URL.</div>";
        return;
    }

    // RESTful: fetch STEP view data from new API endpoint
fetch('/rest/scriptrunner/latest/custom/stepViewApi?stepid=' + encodeURIComponent(stepId))
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Use stepSummary property from API response
const summaryTable = renderSummaryTable(data.stepSummary);
            const instructionsTable = renderInstructionsTable(data.instructions);

            container.innerHTML = `
                <h2>STEP: ${data.stepSummary.ID}</h2>
                <div class="umig-step-summary">${summaryTable}</div>
                <h3>Instructions</h3>
                ${instructionsTable}
                <h3>Comments</h3>
                <div class="umig-step-comments"><i>No comments yet.</i></div>
            `;
        })
        .catch(error => {
            console.error('UMIG Error: Failed to fetch or render STEP View.', error);
            container.innerHTML = "<div class='aui-message aui-message-error'>Error: Could not load STEP View data. See browser console for details.</div>";
        });
})();
