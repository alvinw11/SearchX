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
    
    // Retrieve stored simplification data
    chrome.storage.local.get(['currentSimplification', 'originalText'], (result) => {
      if (result.currentSimplification) {
        // If there is stored text, display it:
        simplifiedTextDiv.textContent = result.currentSimplification;
        selectedTextDiv.textContent = result.originalText || '';
        enableButtons();
      } else {
        // If there is no stored text, display default messages:
        disableButtons();
        simplifiedTextDiv.textContent = 'No text selected';
        selectedTextDiv.textContent = '';
      }
    });
    
    // Import button event listener
    importBtn.addEventListener('click', async () => {
      try {
        // Check if a tab with the Stempad editor is already open.
        const tabs = await chrome.tabs.query({ url: 'https://www.stempad.com/editor*' });
        if (tabs.length === 0) {
          // If no tab is found, show a status error message and open a new tab.
          showStatus('Please open Stempad editor first', 'error');
          chrome.tabs.create({ url: 'https://www.stempad.com/editor' });
          return;
        }
    
        // Send a message to the background script to insert the simplified text.
        chrome.runtime.sendMessage({
          type: 'insertNote',
          text: simplifiedTextDiv.textContent
        }, (response) => {
          // Process the response from the background script.
          if (response && response.success) {
            showStatus('Text inserted into Stempad!', 'success');
            clearSimplification();
          } else {
            showStatus('Failed to insert: ' + (response?.error || 'Unknown error'), 'error');
          }
        });
      } catch (error) {
        showStatus('Error: ' + error.message, 'error');
      }
    });
    
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
  });
  