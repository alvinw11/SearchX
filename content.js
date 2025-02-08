// Initialize when the content script loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('Content script loaded');
});

// Listen for text selection events
document.addEventListener('mouseup', async () => {
  const selectedText = window.getSelection().toString().trim();
  
  if (selectedText.length > 0) {
    console.log('Text selected:', selectedText);
    
    try {
      // Send the selected text to background script
      const response = await chrome.runtime.sendMessage({
        type: 'simplifyText',
        text: selectedText
      });
      
      console.log('Response from background:', response);
      
      if (response && response.success) {
        console.log('Simplified text received:', response.simplified);
        await showSimplifiedText(response.simplified);
      } else {
        console.error('Simplification failed:', response?.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }
});

async function showSimplifiedText(text) {
  // If we're on Stempad editor page, send text there
  if (window.location.href.includes('stempad.com/editor')) {
    try {
      // Send simplified text to Stempad
      chrome.runtime.sendMessage({
        type: 'simplifiedText',
        text: text
      });
    } catch (error) {
      console.error('Failed to send to Stempad:', error);
    }
  } else {
    // Remove any existing tooltip
    const existingTooltip = document.getElementById('simplification-tooltip');
    if (existingTooltip) {
      existingTooltip.remove();
    }

    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.id = 'simplification-tooltip';
    tooltip.style.cssText = `
      position: fixed;
      background: white;
      border: 1px solid #ccc;
      padding: 10px;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      max-width: 300px;
      z-index: 10000;
    `;
    tooltip.textContent = text;

    // Position tooltip near the mouse
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    tooltip.style.left = `${rect.left + window.scrollX}px`;
    tooltip.style.top = `${rect.bottom + window.scrollY + 10}px`;

    // Add tooltip to page
    document.body.appendChild(tooltip);

    // Remove tooltip when clicking outside
    document.addEventListener('click', function removeTooltip(e) {
      if (!tooltip.contains(e.target)) {
        tooltip.remove();
        document.removeEventListener('click', removeTooltip);
      }
    });
  }
}

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'contentAction') {
    // Handle content-specific actions
    sendResponse({ status: 'success' });
  }
  return true;
}); 