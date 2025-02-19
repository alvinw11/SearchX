const extensions = 'https://developer.chrome.com/docs/extensions';
const webstore = 'https://developer.chrome.com/docs/webstore';

// Track if extension is enabled (default to true)
let isEnabled = true;

// Initialize enabled state from storage
chrome.storage.local.get(['isEnabled'], function(result) {
    isEnabled = result.isEnabled !== false;
});

// Centralized error handling function
function handleError(error, tabs) {
    console.error('Error:', error);
    if (tabs && tabs[0]) {
        sendMessageToTab(tabs[0].id, {
            type: 'error',
            error: error.message
        });
    }
    return { success: false, error: error.message };
}

// Centralized tab message sending function
function sendMessageToTab(tabId, message) {
    chrome.tabs.sendMessage(tabId, message, response => {
        console.log('Response from content script:', response);
        if (chrome.runtime.lastError) {
            console.error('Error sending message:', chrome.runtime.lastError);
        }
    });
}

let currentMode = 'explain';
let currentLength = 'medium';
let currentLanguage = 'en';
let pageTitle = '';
let paragraphs = [];

//Message listener for the prompt settings
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'setMode') {
        currentMode = request.mode;
        sendResponse({ success: true });
    }
    if (request.action === 'setLength') {
        currentLength = request.length;
        sendResponse({ success: true });
    }
    if (request.action === 'setLanguage') {
        currentLanguage = request.language;
        sendResponse({ success: true });
    }
    if (request.action === 'contextData') {
        pageTitle = request.title;
        paragraphs = request.paragraphs;
        sendResponse({ success: true});
    }
});


// Main message listener with cleaned up structure
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request);

    // Handle enable/disable updates
    if (request.action === "updateEnabled") {
        isEnabled = request.isEnabled;
        chrome.storage.local.set({ isEnabled: isEnabled });
        sendResponse({ success: true });
        return;
    }

    if (request.action === "simplifyText") {
        // If extension is disabled, silently ignore the request
        if (!isEnabled) {
            sendResponse({ success: false, disabled: true });
            return true;
        }

        console.log('Processing simplifyText request');
        getAPIKey()
            .then(apiKey => {
                if (!apiKey) {
                    throw new Error('No API key found');
                }
                console.log('API key found, calling ChatGPT');
                return callChatGPT(request.text, apiKey, currentLanguage, currentMode, currentLength);
            })
            .then(simplifiedText => {
                console.log('Text simplified, sending response:', simplifiedText);
                
                // Store in local storage
                chrome.storage.local.set({
                    'currentSimplification': simplifiedText,
                    'originalText': request.text
                });

                // Send to active tab
                chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                    if (tabs[0]) {
                        sendMessageToTab(tabs[0].id, {
                            type: 'simplifiedText',
                            text: simplifiedText
                        });
                    }
                });

                // Send response back to content script
                sendResponse({ success: true, simplified: simplifiedText });
            })
            .catch(error => {
                chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                    handleError(error, tabs);
                });
                sendResponse(handleError(error));
            });
        return true; // Keep message channel open for async response
    }

    // Handle API key operations
    if (request.type === 'storeAPIKey' || request.action === "checkAPIKey") {
        handleAPIKeyOperation(request, sendResponse);
        return true; // Keep message channel open for async response
    }
});

// Centralized API key operations
async function handleAPIKeyOperation(request, sendResponse) {
    try {
        if (request.type === 'storeAPIKey') {
            if (!request.apiKey) {
                throw new Error('No API key provided');
            }
            await chrome.storage.local.set({ apiKey: request.apiKey });
            sendResponse({ success: true });
        } 
        else if (request.action === "checkAPIKey") {
            const result = await chrome.storage.local.get(['apiKey']);
            sendResponse({ 
                isValid: Boolean(result.apiKey && result.apiKey.length >= 20),
                message: result.apiKey ? 'Valid API key found' : 'No valid API key found'
            });
        }
    } catch (error) {
        console.error('API key operation error:', error);
        sendResponse({ 
            success: false, 
            isValid: false,
            message: error.message 
        });
    }
}

async function getAPIKey() {
    const result = await chrome.storage.local.get(['apiKey']);
    if (!result.apiKey || result.apiKey.length < 20) {
        throw new Error('Invalid or missing API key');
    }
    return result.apiKey;
}

//simplify the text input 
async function callChatGPT(selectedText, apiKey, currentLanguage, currentMode, currentLength) {
    const apiUrl = "https://api.openai.com/v1/chat/completions";  // Updated to chat completions endpoint
    const prompt = `You are a helpful assistant to someone reading text on a web page.
    Your answer should only ${currentMode} this text:${selectedText} and answer in the ${currentLanguage} language. The length of the answer should be ${currentLength}, but it should never be longer than 50 words.`;

    try {
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",  // Updated to use chat model
                messages: [{
                    role: "user",
                    content: prompt
                }],
                max_tokens: 300,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'API request failed');
        }

        const data = await response.json();
        return data.choices[0].message.content.trim();
    } catch (error) {
        console.error('ChatGPT API Error:', error);
        throw new Error('Failed to simplify text: ' + error.message);
    }
}
