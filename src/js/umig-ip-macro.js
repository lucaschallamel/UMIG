document.addEventListener('DOMContentLoaded', function() {
    console.log('UMIG IP Macro JS Loaded'); // Updated log message

    // Assuming new IDs in your Confluence Macro HTML
    const ipListElement = document.getElementById('umig-ip-list'); 
    const loadIpsBtn = document.getElementById('umig-load-ips-btn');

    const fetchImplementationPlans = () => {
        const apiUrl = '/rest/scriptrunner/latest/custom/getAllImplementationPlans'; // Updated API endpoint

        if (!ipListElement) {
            console.error('Error: Element with ID umig-ip-list not found.');
            return;
        }

        fetch(apiUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                ipListElement.innerHTML = ''; // Clear list
                if (data && data.length > 0) {
                    data.forEach(ip => {
                        const li = document.createElement('li');
                        let ipText = `ID: ${ip.id} - Title: ${ip.title}`;
                        if (ip.data_migration_code) {
                            ipText += ` (Data Migration: ${ip.data_migration_code})`;
                        }
                        li.textContent = ipText;
                        ipListElement.appendChild(li);
                    });
                } else {
                    ipListElement.innerHTML = '<li>No Implementation Plans found.</li>';
                }
            })
            .catch(error => {
                console.error('Error fetching Implementation Plans:', error);
                ipListElement.innerHTML = '<li>Error loading Implementation Plans.</li>';
            });
    };

    if (loadIpsBtn) {
        loadIpsBtn.addEventListener('click', fetchImplementationPlans);
    }

    // Initial load if the list element exists
    if (ipListElement) {
        fetchImplementationPlans();
    }
});
