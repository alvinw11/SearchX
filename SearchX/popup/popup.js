document.addEventListener('DOMContentLoaded', async () => {
    // Get necessary DOM elements
    const apiKeyInput = document.getElementById('api-key-input');
    const saveKeyButton = document.getElementById('save-api-key');
    const toggleSwitch = document.getElementById('OnOff');
    const userNameInput = document.getElementById('user-name');
    
    // Get sections for API key setup and main content
    const apiKeySetup = document.getElementById('api-key-setup');
    const mainContent = document.getElementById('main-content');

    // Initialize toggle state from storage
    chrome.storage.local.get(['isEnabled', 'userName'], function(result) {
        toggleSwitch.checked = result.isEnabled !== false; // Default to true if not set
        updateToggleState(result.isEnabled !== false);
        
        // Set user name if previously saved
        if (result.userName) {
            userNameInput.value = result.userName;
        }
    });

    // User name input event listener
    userNameInput.addEventListener('change', function() {
        const userName = this.value.trim();
        chrome.storage.local.set({ userName: userName });
    });

    // Toggle switch event listener
    toggleSwitch.addEventListener('change', function() {
        const isEnabled = this.checked;
        chrome.storage.local.set({ isEnabled: isEnabled });
        updateToggleState(isEnabled);
    });

    function updateToggleState(isEnabled) {
        // Send message to background script
        chrome.runtime.sendMessage({ 
            action: "updateEnabled", 
            isEnabled: isEnabled 
        });
    }

    // Check if API key exists and update UI accordingly
    async function checkAPIKeyAndUpdateUI() {
        try {
            // Send message and wait for response
            const response = await new Promise((resolve) => {
                chrome.runtime.sendMessage({ action: "checkAPIKey" }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('Runtime error:', chrome.runtime.lastError);
                        resolve({ isValid: false, message: chrome.runtime.lastError.message });
                    } else {
                        resolve(response);
                    }
                });
            });

            if (response.isValid) {
                apiKeySetup.style.display = 'none';
                mainContent.style.display = 'block';
            } else {
                apiKeySetup.style.display = 'block';
                mainContent.style.display = 'none';
            }
        } catch (error) {
            console.error('Error checking API key:', error);
            showError('Error checking API key status');
            apiKeySetup.style.display = 'block';
            mainContent.style.display = 'none';
        }
    }

    // Initial check when popup opens
    checkAPIKeyAndUpdateUI();
    
    // API key save button event listener
    saveKeyButton.addEventListener('click', async () => {
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            showError('Please enter an API key');
            return;
        }
    
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'storeAPIKey',
                apiKey: apiKey
            });
    
            if (response.success) {
                apiKeyInput.value = '';
                apiKeySetup.style.display = 'none';
                mainContent.style.display = 'block';
                showStatus('API key saved successfully', 'success');
            } else {
                showError(response.message || 'Failed to save API key');
            }
        } catch (error) {
            showError('Error saving API key: ' + error.message);
        }
    });

    // Function to show error messages
    function showError(message) {
        console.error(message);
        // You can add UI feedback here if needed
    }

    // Function to show status messages
    function showStatus(message, type) {
        console.log(message);
        // You can add UI feedback here if needed
    }

    // Add debug button functionality
    const debugButton = document.getElementById('debugButton');
    if (debugButton) {
        debugButton.addEventListener('click', () => {
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {type: 'testConnection'}, function(response) {
                    if (chrome.runtime.lastError) {
                        console.error(chrome.runtime.lastError);
                        showError('Connection failed: ' + chrome.runtime.lastError.message);
                    } else {
                        console.log('Test response:', response);
                        showStatus('Connection successful!', 'success');
                    }
                });
            });
        });
    }
});