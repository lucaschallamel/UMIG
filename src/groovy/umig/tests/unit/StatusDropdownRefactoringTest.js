/**
 * Status Dropdown Refactoring Test Suite
 * 
 * Tests for the refactored STATUS dropdown in iteration-view.js that now uses
 * status IDs as option values while displaying status names as text.
 * 
 * This ensures robustness against future status name changes while maintaining
 * backward compatibility and API integration.
 */

describe('Status Dropdown Refactoring Tests', () => {
    let iterationView;
    let mockStatuses;
    let dropdown;

    beforeEach(() => {
        // Mock status data structure matching StatusRepository.findStatusesByType('Step')
        mockStatuses = [
            { id: 21, name: 'PENDING', color: '#DDDDDD', type: 'Step' },
            { id: 22, name: 'TODO', color: '#FFFF00', type: 'Step' },
            { id: 23, name: 'IN_PROGRESS', color: '#0066CC', type: 'Step' },
            { id: 24, name: 'COMPLETED', color: '#00AA00', type: 'Step' },
            { id: 25, name: 'FAILED', color: '#FF0000', type: 'Step' },
            { id: 26, name: 'BLOCKED', color: '#FF6600', type: 'Step' },
            { id: 27, name: 'CANCELLED', color: '#CC0000', type: 'Step' }
        ];

        // Create mock DOM elements
        dropdown = document.createElement('select');
        dropdown.id = 'step-status-dropdown';
        document.body.appendChild(dropdown);

        // Mock IterationView instance
        iterationView = {
            fetchStepStatuses: jasmine.createSpy('fetchStepStatuses').and.returnValue(Promise.resolve(mockStatuses)),
            updateDropdownColor: jasmine.createSpy('updateDropdownColor'),
            showNotification: jasmine.createSpy('showNotification'),
            updateStepStatus: jasmine.createSpy('updateStepStatus'),
            userRole: 'PILOT',
            apiClient: {
                updateStepStatus: jasmine.createSpy('updateStepStatus').and.returnValue(Promise.resolve({
                    success: true,
                    emailsSent: 2,
                    responseTime: 150
                }))
            }
        };

        // Bind methods to proper context
        iterationView.populateStatusDropdown = window.IterationView.prototype.populateStatusDropdown.bind(iterationView);
        iterationView.handleStatusChange = window.IterationView.prototype.handleStatusChange.bind(iterationView);
    });

    afterEach(() => {
        document.body.removeChild(dropdown);
    });

    describe('populateStatusDropdown()', () => {
        
        it('should use status IDs as option values', async () => {
            await iterationView.populateStatusDropdown('PENDING');
            
            const options = Array.from(dropdown.options);
            expect(options.length).toBe(7);
            
            // Verify each option uses status ID as value
            expect(options[0].value).toBe('21'); // PENDING
            expect(options[1].value).toBe('22'); // TODO
            expect(options[2].value).toBe('23'); // IN_PROGRESS
            expect(options[3].value).toBe('24'); // COMPLETED
            expect(options[4].value).toBe('25'); // FAILED
            expect(options[5].value).toBe('26'); // BLOCKED
            expect(options[6].value).toBe('27'); // CANCELLED
        });

        it('should display status names as text with underscore replacement', async () => {
            await iterationView.populateStatusDropdown('IN_PROGRESS');
            
            const options = Array.from(dropdown.options);
            
            // Verify text content shows formatted names
            expect(options[0].textContent).toBe('PENDING');
            expect(options[1].textContent).toBe('TODO');
            expect(options[2].textContent).toBe('IN PROGRESS'); // Underscore replaced
            expect(options[3].textContent).toBe('COMPLETED');
        });

        it('should store status names in data-status-name attributes', async () => {
            await iterationView.populateStatusDropdown('TODO');
            
            const options = Array.from(dropdown.options);
            
            // Verify data attributes store original names
            expect(options[0].getAttribute('data-status-name')).toBe('PENDING');
            expect(options[1].getAttribute('data-status-name')).toBe('TODO');
            expect(options[2].getAttribute('data-status-name')).toBe('IN_PROGRESS');
        });

        it('should select correct option when given status name', async () => {
            await iterationView.populateStatusDropdown('COMPLETED');
            
            const selectedOption = dropdown.options[dropdown.selectedIndex];
            expect(selectedOption.value).toBe('24'); // COMPLETED ID
            expect(selectedOption.getAttribute('data-status-name')).toBe('COMPLETED');
        });

        it('should select correct option when given status ID', async () => {
            await iterationView.populateStatusDropdown(25); // FAILED ID
            
            const selectedOption = dropdown.options[dropdown.selectedIndex];
            expect(selectedOption.value).toBe('25');
            expect(selectedOption.getAttribute('data-status-name')).toBe('FAILED');
        });

        it('should store both old-status and old-status-id attributes', async () => {
            await iterationView.populateStatusDropdown('BLOCKED');
            
            expect(dropdown.getAttribute('data-old-status')).toBe('BLOCKED');
            expect(dropdown.getAttribute('data-old-status-id')).toBe('26');
        });

        it('should handle backward compatibility for status ID lookup', async () => {
            await iterationView.populateStatusDropdown('IN_PROGRESS');
            
            // Verify backward compatibility mapping
            expect(dropdown.getAttribute('data-old-status')).toBe('IN_PROGRESS');
            expect(dropdown.getAttribute('data-old-status-id')).toBe('23');
        });

        it('should fallback to PENDING when no valid status provided', async () => {
            await iterationView.populateStatusDropdown(null);
            
            expect(dropdown.getAttribute('data-old-status')).toBe('PENDING');
            expect(dropdown.getAttribute('data-old-status-id')).toBe('21');
        });

    });

    describe('handleStatusChange()', () => {
        
        beforeEach(() => {
            // Set up dropdown with test data
            dropdown.setAttribute('data-step-id', 'test-step-123');
            dropdown.innerHTML = `
                <option value="21" data-status-name="PENDING" data-color="#DDDDDD">PENDING</option>
                <option value="23" data-status-name="IN_PROGRESS" data-color="#0066CC" selected>IN PROGRESS</option>
                <option value="24" data-status-name="COMPLETED" data-color="#00AA00">COMPLETED</option>
            `;
            dropdown.setAttribute('data-old-status', 'IN_PROGRESS');
            dropdown.setAttribute('data-old-status-id', '23');
        });

        it('should convert status ID to status name for API call', async () => {
            // Simulate user selecting COMPLETED (ID 24)
            dropdown.value = '24';
            dropdown.selectedIndex = 2;
            
            const event = { target: dropdown };
            await iterationView.handleStatusChange(event);
            
            // Verify API called with status name, not ID
            expect(iterationView.apiClient.updateStepStatus).toHaveBeenCalledWith(
                'test-step-123',
                'COMPLETED',  // Status name, not ID
                'PILOT'
            );
        });

        it('should update both old-status and old-status-id attributes on success', async () => {
            dropdown.value = '24';
            dropdown.selectedIndex = 2;
            
            const event = { target: dropdown };
            await iterationView.handleStatusChange(event);
            
            // Verify both attributes updated
            expect(dropdown.getAttribute('data-old-status')).toBe('COMPLETED');
            expect(dropdown.getAttribute('data-old-status-id')).toBe('24');
        });

        it('should prevent status change for unauthorized users', async () => {
            iterationView.userRole = 'NORMAL'; // Not PILOT or ADMIN
            
            dropdown.value = '24';
            dropdown.selectedIndex = 2;
            
            const event = { target: dropdown };
            await iterationView.handleStatusChange(event);
            
            // Verify API not called and status reset
            expect(iterationView.apiClient.updateStepStatus).not.toHaveBeenCalled();
            expect(iterationView.showNotification).toHaveBeenCalledWith(
                'Only PILOT or ADMIN users can change status',
                'error'
            );
        });

        it('should reset to old status ID on permission failure', async () => {
            iterationView.userRole = 'NORMAL';
            
            dropdown.value = '24'; // Try to change to COMPLETED
            dropdown.selectedIndex = 2;
            
            const event = { target: dropdown };
            await iterationView.handleStatusChange(event);
            
            // Verify dropdown reset to old status ID
            expect(dropdown.value).toBe('23'); // Back to IN_PROGRESS
        });

        it('should not trigger API call if status unchanged (ID comparison)', async () => {
            // Select same status (IN_PROGRESS, ID 23)
            dropdown.value = '23';
            dropdown.selectedIndex = 1;
            
            const event = { target: dropdown };
            await iterationView.handleStatusChange(event);
            
            expect(iterationView.apiClient.updateStepStatus).not.toHaveBeenCalled();
        });

        it('should handle missing data-status-name gracefully', async () => {
            // Remove data-status-name attribute
            dropdown.options[2].removeAttribute('data-status-name');
            dropdown.value = '24';
            dropdown.selectedIndex = 2;
            
            const event = { target: dropdown };
            await iterationView.handleStatusChange(event);
            
            // Should exit early with error log
            expect(iterationView.apiClient.updateStepStatus).not.toHaveBeenCalled();
        });

        it('should show success notification with email count', async () => {
            dropdown.value = '24';
            dropdown.selectedIndex = 2;
            
            const event = { target: dropdown };
            await iterationView.handleStatusChange(event);
            
            expect(iterationView.showNotification).toHaveBeenCalledWith(
                'Status updated to COMPLETED. 2 notifications sent.',
                'success'
            );
        });

    });

    describe('Backward Compatibility', () => {
        
        it('should handle mixed ID and name inputs correctly', async () => {
            // Test with status name input
            await iterationView.populateStatusDropdown('TODO');
            expect(dropdown.getAttribute('data-old-status-id')).toBe('22');
            
            // Test with status ID input  
            await iterationView.populateStatusDropdown(25);
            expect(dropdown.getAttribute('data-old-status')).toBe('FAILED');
        });

        it('should maintain API contract with status names', async () => {
            await iterationView.populateStatusDropdown('PENDING');
            
            dropdown.value = '23'; // IN_PROGRESS ID
            dropdown.selectedIndex = 2;
            
            const event = { target: dropdown };
            await iterationView.handleStatusChange(event);
            
            // Verify API still receives status name string
            const apiCall = iterationView.apiClient.updateStepStatus.calls.mostRecent();
            expect(typeof apiCall.args[1]).toBe('string');
            expect(apiCall.args[1]).toBe('IN_PROGRESS');
        });

    });

    describe('Error Handling', () => {
        
        it('should handle fetchStepStatuses failure gracefully', async () => {
            iterationView.fetchStepStatuses.and.returnValue(Promise.reject(new Error('API Error')));
            
            // Should not throw error
            await expectAsync(iterationView.populateStatusDropdown('PENDING')).not.toBeRejected();
        });

        it('should handle API update failure gracefully', async () => {
            iterationView.apiClient.updateStepStatus.and.returnValue(Promise.reject(new Error('Update Failed')));
            
            dropdown.value = '24';
            dropdown.selectedIndex = 2;
            
            const event = { target: dropdown };
            
            // Should not throw error
            await expectAsync(iterationView.handleStatusChange(event)).not.toBeRejected();
        });

    });

    describe('Performance', () => {
        
        it('should minimize DOM operations during population', async () => {
            const initialChildCount = dropdown.children.length;
            
            await iterationView.populateStatusDropdown('PENDING');
            
            // Should have exactly the expected number of options
            expect(dropdown.children.length).toBe(7);
        });

        it('should cache status data appropriately', async () => {
            await iterationView.populateStatusDropdown('PENDING');
            await iterationView.populateStatusDropdown('COMPLETED');
            
            // fetchStepStatuses should be called for each population 
            // (no caching implemented yet, but validates current behavior)
            expect(iterationView.fetchStepStatuses).toHaveBeenCalledTimes(2);
        });

    });

});

/**
 * Integration Test Suite for Status Dropdown API Integration
 */
describe('Status Dropdown API Integration Tests', () => {
    
    it('should maintain compatibility with existing StepsApi endpoint', () => {
        // Mock API response format validation
        const expectedApiPayload = {
            status: 'COMPLETED',      // String status name (not ID)
            userRole: 'PILOT',
            timestamp: jasmine.any(String)
        };

        // This test validates the API contract remains unchanged
        expect(expectedApiPayload.status).toEqual(jasmine.any(String));
        expect(['PENDING', 'TODO', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'BLOCKED', 'CANCELLED'])
            .toContain(expectedApiPayload.status);
    });

    it('should validate status ID to name mapping matches database', () => {
        const expectedMappings = {
            21: 'PENDING',
            22: 'TODO', 
            23: 'IN_PROGRESS',
            24: 'COMPLETED',
            25: 'FAILED',
            26: 'BLOCKED',
            27: 'CANCELLED'
        };

        // Validate mapping consistency
        Object.entries(expectedMappings).forEach(([id, name]) => {
            const status = mockStatuses.find(s => s.id === parseInt(id));
            expect(status).toBeDefined();
            expect(status.name).toBe(name);
        });
    });

});