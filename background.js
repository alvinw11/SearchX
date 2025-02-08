// Import the pre-created instance
import { aiAssistant } from './ai.js';

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

// Add secure storage function
async function storeAPIKey(apiKey) {
  try {
    await chrome.storage.local.set({
      'openai_api_key': apiKey
    });
    console.log('API key stored securely');
    return true;
  } catch (error) {
    console.error('Failed to store API key:', error);
    return false;
  }
}

// Function to inject text into Stempad editor
async function injectIntoStempad(tabId, text) {
  console.log('Attempting to inject text:', text);
  console.log('Into tab:', tabId);
  try {
    const result = await chrome.scripting.executeScript({
      target: { tabId },
      func: (noteText) => {
        console.log('Injection script running in Stempad');
        try {
          // Try multiple possible editor selectors
          const editor = 
            document.querySelector('.scratchpad-editor') ||
            document.querySelector('#editor') ||
            document.querySelector('[contenteditable="true"]') ||
            document.querySelector('.editor-container');
            
          console.log('Found editor element:', editor);
          
          if (!editor) {
            throw new Error('Editor element not found - please make sure Stempad editor is loaded');
          }

          // Create a new text block
          const textBlock = document.createElement('div');
          textBlock.className = 'stempad-text-block';
          textBlock.textContent = noteText;
          
          // Try different insertion methods
          if (editor.isContentEditable) {
            // If it's a contenteditable element
            editor.innerHTML += `<div>${noteText}</div>`;
          } else {
            // Regular element
            editor.appendChild(textBlock);
          }
          
          console.log('Text successfully inserted');
          return { success: true, message: 'Text inserted successfully' };
        } catch (error) {
          console.error('Injection error:', error);
          return { 
            success: false, 
            error: error.message,
            editorFound: !!document.querySelector('.scratchpad-editor')
          };
        }
      },
      args: [text]
    });
    
    console.log('Injection script result:', result);
    
    if (result && result[0] && result[0].result) {
      return result[0].result;
    }
    
    return { success: false, error: 'No result from injection script' };
  } catch (error) {
    console.error('Injection failed:', error);
    return { success: false, error: error.message };
  }
}

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request);

  if (request.type === 'simplifyText') {
    // Use the AIAssistant instance to simplify text
    aiAssistant.simplifyText(request.text)
      .then(result => {
        console.log('AI Simplification result:', result);
        sendResponse(result);
      })
      .catch(error => {
        console.error('AI Error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Required for async response
  }

  if (request.type === 'getStatus') {
    // Handle status check request
    sendResponse({ status: 'active' });
    return true;
  }

  if (request.type === 'storeAPIKey') {
    storeAPIKey(request.apiKey)
      .then(result => sendResponse({ success: result }));
    return true;
  }

  if (request.type === 'insertNote') {
    // Find Stempad editor tab
    chrome.tabs.query({ url: 'https://www.stempad.com/editor*' }, async (tabs) => {
      if (tabs.length === 0) {
        sendResponse({ success: false, error: 'Stempad editor not found' });
        return;
      }

      try {
        const result = await injectIntoStempad(tabs[0].id, request.text);
        sendResponse(result);
      } catch (error) {
        console.error('Error inserting note:', error);
        sendResponse({ success: false, error: error.message });
      }
    });
    return true; // Required for async response
  }
}); 