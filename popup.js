document.addEventListener('DOMContentLoaded', () => {
  const simplifiedTextDiv = document.getElementById('simplified-text');
  const originalTextDiv = document.getElementById('original-text');
  const yesButton = document.getElementById('yes-button');
  const noButton = document.getElementById('no-button');
  const statusDiv = document.getElementById('status');
  const apiKeyInput = document.getElementById('api-key-input');
  const saveKeyButton = document.getElementById('save-api-key');

  // Get the current simplified text from storage
  chrome.storage.local.get(['currentSimplification', 'originalText'], (result) => {
    if (result.currentSimplification) {
      simplifiedTextDiv.textContent = result.currentSimplification;
      originalTextDiv.textContent = result.originalText || '';
      enableButtons();
    } else {
      disableButtons();
      simplifiedTextDiv.textContent = 'No text selected';
      originalTextDiv.textContent = '';
    }
  });

  yesButton.addEventListener('click', async () => {
    try {
      // Check if Stempad editor is open
      const tabs = await chrome.tabs.query({ url: 'https://www.stempad.com/editor*' });
      
      if (tabs.length === 0) {
        showStatus('Please open Stempad editor first', 'error');
        // Open Stempad editor in new tab
        chrome.tabs.create({ url: 'https://www.stempad.com/editor' });
        return;
      }

      // Send message to background script to insert the text
      chrome.runtime.sendMessage({
        type: 'insertNote',
        text: simplifiedTextDiv.textContent
      }, response => {
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

  noButton.addEventListener('click', () => {
    clearSimplification();
    showStatus('Text discarded', 'success');
  });

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
      } else {
        showStatus('Failed to save API key', 'error');
      }
    } catch (error) {
      showStatus('Error saving API key: ' + error.message, 'error');
    }
  });

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.style.color = type === 'error' ? '#f44336' : '#4CAF50';
    setTimeout(() => {
      statusDiv.textContent = '';
    }, 3000);
  }

  function clearSimplification() {
    chrome.storage.local.remove(['currentSimplification', 'originalText'], () => {
      simplifiedTextDiv.textContent = 'No text selected';
      originalTextDiv.textContent = '';
      disableButtons();
    });
  }

  function enableButtons() {
    yesButton.disabled = false;
    noButton.disabled = false;
    yesButton.style.opacity = '1';
    noButton.style.opacity = '1';
  }

  function disableButtons() {
    yesButton.disabled = true;
    noButton.disabled = true;
    yesButton.style.opacity = '0.5';
    noButton.style.opacity = '0.5';
  }
}); 