const extensions = 'https://developer.chrome.com/docs/extensions';
const webstore = 'https://developer.chrome.com/docs/webstore';


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request);

    if (request.action === "simplifyText") {
        console.log('Processing simplifyText request');
        getAPIKey()
            .then(apiKey => {
                if (!apiKey) {
                    throw new Error('No API key found');
                }
                console.log('API key found, calling ChatGPT');
                return callChatGPT(request.text, apiKey);
            })
            .then(simplifiedText => {
                console.log('Text simplified, sending response:', simplifiedText);
                
                // Store the simplified text in storage
                chrome.storage.local.set({
                    'currentSimplification': simplifiedText,
                    'originalText': request.text
                }, () => {
                    console.log('Stored simplified text in storage');
                });

                // Try to send to popup if it's open
                try {
                    chrome.runtime.sendMessage({
                        type: 'simplifiedText',
                        text: simplifiedText,
                    }).catch(() => {
                        console.log('Popup not open, data stored in storage');
                    });
                } catch (error) {
                    console.log('Popup not open, data stored in storage');
                }

                // Send response back to content script
                sendResponse({ success: true, simplified: simplifiedText });
            })
            .catch(error => {
                console.error('Error in simplification:', error);
                try {
                    chrome.runtime.sendMessage({
                        type: 'error',
                        error: error.message
                    });
                } catch (e) {
                    console.log('Popup not open to receive error');
                }
                sendResponse({ success: false, error: error.message });
            });
        return true; // Keep message channel open for async response
    }

    // Handle storeAPIKey action
    if (request.type === 'storeAPIKey') {
        if (!request.apiKey) {
            sendResponse({ success: false, message: 'No API key provided' });
            return true;
        }

        chrome.storage.local.set({ apiKey: request.apiKey }, () => {
            if (chrome.runtime.lastError) {
                sendResponse({ success: false, message: chrome.runtime.lastError.message });
            } else {
                sendResponse({ success: true });
            }
        });
        return true;
    }

    // Modify the message listener to handle API key validation
    if (request.action === "checkAPIKey") {
        getAPIKey()
            .then(apiKey => {
                sendResponse({ 
                    isValid: Boolean(apiKey),
                    message: apiKey ? 'Valid API key found' : 'No valid API key found'
                });
            })
            .catch(error => {
                sendResponse({ 
                    isValid: false, 
                    message: error.message 
                });
            });
        return true;
    }
});

async function getAPIKey() {
    try {
        const result = await new Promise((resolve, reject) => {
            chrome.storage.local.get(['apiKey'], (items) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(items.apiKey);
                }
            });
        });

        // Add validation for the API key format
        if (result && result.length > 20) {  // Basic validation for API key
            return result;
        } else {
            throw new Error('Invalid or missing API key');
        }
    } catch (error) {
        console.error('Error fetching API key:', error.message);
        chrome.runtime.sendMessage({
            type: 'apiKeyError',
            error: error.message
        });
        return null;
    }
}

//simplify the text input 
async function callChatGPT(selectedText, apiKey) {
    const apiUrl = "https://api.openai.com/v1/chat/completions";  // Updated to chat completions endpoint
    const prompt = `Simplify this text: Make it less academic and easier to understand for non-academics:\n\n${selectedText}`;
    
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


  