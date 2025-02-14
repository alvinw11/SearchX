document.addEventListener('DOMContentLoaded', async () => {
    // Get necessary DOM elements
    const simplifiedTextDiv = document.getElementById('simplifiedText');
    const selectedTextDiv = document.getElementById('selectedText');
    const importBtn = document.getElementById('importBtn');
    const discardBtn = document.getElementById('discardBtn');
    const statusDiv = document.getElementById('status');
    const apiKeyInput = document.getElementById('api-key-input');
    const saveKeyButton = document.getElementById('save-api-key');
    
    // Get sections for API key setup and main content
    const apiKeySetup = document.getElementById('api-key-setup');
    const mainContent = document.getElementById('main-content');
  
    // Check if API key exists in storage
    try {
      const storageResult = await chrome.storage.local.get(['openai_api_key']);
      if (!storageResult.openai_api_key) {
        apiKeySetup.style.display = 'block';
        mainContent.style.display = 'none';
      } else {
        apiKeySetup.style.display = 'none';
        mainContent.style.display = 'block';
      }
    } catch (error) {
      showStatus('Error checking API key: ' + error.message, 'error');
    }
    
    // Load any stored simplification when popup opens
    loadStoredSimplification();
    
    // Discard button event listener
    discardBtn.addEventListener('click', () => {
      clearSimplification();
      showStatus('Text discarded', 'success');
    });
    
    // API key save button event listener
    saveKeyButton.addEventListener('click', async () => {
      const apiKey = apiKeyInput.value.trim();
      if (!apiKey) {
        showStatus('Please enter an API key', 'error');
        return;
      }
    
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'storeAPIKey',
          apiKey: apiKey
        });
    
        if (response.success) {
          showStatus('API key saved successfully', 'success');
          apiKeyInput.value = '';
          apiKeySetup.style.display = 'none';
          mainContent.style.display = 'block';
        } else {
          showStatus('Failed to save API key', 'error');
        }
      } catch (error) {
        showStatus('Error saving API key: ' + error.message, 'error');
      }
    });
    
    // Function to display status messages
    function showStatus(message, type) {
      statusDiv.textContent = message;
      statusDiv.style.color = type === 'error' ? '#f44336' : '#4CAF50';
      setTimeout(() => {
        statusDiv.textContent = '';
      }, 3000);
    }
    
    // Function to clear stored simplification data
    function clearSimplification() {
      chrome.storage.local.remove(['currentSimplification', 'originalText'], () => {
        simplifiedTextDiv.textContent = 'No text selected';
        selectedTextDiv.textContent = '';
        disableButtons();
      });
    }
    
    // Functions to enable/disable buttons
    function enableButtons() {
      importBtn.disabled = false;
      discardBtn.disabled = false;
      importBtn.style.opacity = '1';
      discardBtn.style.opacity = '1';
    }
    
    function disableButtons() {
      importBtn.disabled = true;
      discardBtn.disabled = true;
      importBtn.style.opacity = '0.5';
      discardBtn.style.opacity = '0.5';
    }

    // Check API key status when popup opens
    checkAPIKeyAndUpdateUI();

    // Handle API key submission
    saveKeyButton.addEventListener('click', function() {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            chrome.runtime.sendMessage({
                type: 'storeAPIKey',
                apiKey: apiKey
            }, response => {
                if (response.success) {
                    showMainContent();
                    apiKeyInput.value = '';
                } else {
                    showError('Failed to save API key: ' + response.message);
                }
            });
        }
    });

    function checkAPIKeyAndUpdateUI() {
        chrome.runtime.sendMessage({ action: 'checkAPIKey' }, response => {
            if (response.isValid) {
                showMainContent();
            } else {
                showAPIKeyInput();
            }
        });
    }

    function showMainContent() {
        apiKeySetup.style.display = 'none';
        mainContent.style.display = 'block';
    }

    function showAPIKeyInput() {
        apiKeySetup.style.display = 'block';
        mainContent.style.display = 'none';
    }

    function showError(message) {
        console.error('Error:', message);
        showStatus(message, 'error');
    }

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('Popup received message:', message);
        
        if (message.type === 'simplifiedText') {
            console.log('Received simplified text:', message.text);
            displaySimplifiedText(message.text);
        } else if (message.type === 'apiKeyError') {
            showAPIKeyInput();
            showError('API Key error: ' + message.error);
        } else if (message.type === 'error') {
            showError(message.error);
        }
    });

    // Function to display simplified text
    function displaySimplifiedText(text) {
        console.log('Displaying simplified text in popup:', text);
        const simplifiedTextDiv = document.getElementById('simplifiedText');
        const selectedTextDiv = document.getElementById('selectedText');
        
        if (!simplifiedTextDiv || !selectedTextDiv) {
            console.error('Required DIVs not found in popup');
            return;
        }

        simplifiedTextDiv.textContent = text;
        
        // Get and display original text
        chrome.storage.local.get(['originalText'], (result) => {
            console.log('Retrieved original text:', result.originalText);
            if (result.originalText) {
                selectedTextDiv.textContent = result.originalText;
            }
        });

        enableButtons();
    }

    // Add this inside your DOMContentLoaded listener
    const debugButton = document.getElementById('debugButton');
    if (debugButton) {
        debugButton.addEventListener('click', () => {
            console.log('Debug button clicked');
            // Test message to content script
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {type: 'debugTest'}, function(response) {
                    console.log('Debug response:', response);
                });
            });
        });
    }

    // Add this to your content script message listener in content.js
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'debugTest') {
            console.log('Debug test received in content script');
            sendResponse({status: 'Content script is working!'});
        }
    });

    function loadStoredSimplification() {
        chrome.storage.local.get(['currentSimplification', 'originalText'], (result) => {
            console.log('Loading stored data:', result);
            if (result.currentSimplification && result.originalText) {
                const simplifiedTextDiv = document.getElementById('simplifiedText');
                const selectedTextDiv = document.getElementById('selectedText');
                
                if (simplifiedTextDiv && selectedTextDiv) {
                    console.log('Displaying stored simplified text');
                    simplifiedTextDiv.textContent = result.currentSimplification;
                    selectedTextDiv.textContent = result.originalText;
                    enableButtons();
                }
            }
        });
    }
  });
  