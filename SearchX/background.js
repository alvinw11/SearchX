const extensions = 'https://developer.chrome.com/docs/extensions';
const webstore = 'https://developer.chrome.com/docs/webstore';

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
        else {
            console.log('Message sent successfully');
        }
    });
}

let pageTitle = '';
let paragraphs = [];
let currentMode = 'explain';
let currentLength = 'medium';
let currentLanguage = 'en';

// Message listener for incoming messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request);

    if (request.action === 'setMode') {
        currentMode = request.mode;
        chrome.storage.local.set({ currentMode });
    }
    if (request.action === 'setLength') {
        currentLength = request.length;
        chrome.storage.local.set({ currentLength });
    }
    if (request.action === 'setLanguage') {
        currentLanguage = request.language;
        chrome.storage.local.set({ currentLanguage });
    }
    
    if (request.action === 'contextData') {
        pageTitle = request.title;
        paragraphs = request.paragraphs;
    }

// Restore settings on script load
    chrome.storage.local.get(["currentMode", "currentLength", "currentLanguage"], (result) => {
        currentMode = result.currentMode || "explain";
        currentLength = result.currentLength || "medium";
        currentLanguage = result.currentLanguage || "en";
    });

    if (request.action === "simplifyText") {
        console.log('Processing simplifyText request');
        getAPIKey()
            .then(apiKey => {
                if (!apiKey) throw new Error('No API key found');
                console.log('API key found, calling ChatGPT');
                return callChatGPT(request.text, apiKey, currentLanguage, currentMode, currentLength);
            })
            .then(simplifiedText => {
                console.log('Text simplified:', simplifiedText);
                
                // Store in local storage
                chrome.storage.local.set({
                    'currentSimplification': simplifiedText,
                    'originalText': request.text
                });

                // Send to active tab
                chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                    if (tabs[0]) {
                        sendMessageToTab(tabs[0].id, {
                            type: 'simplifiedText',
                            text: simplifiedText
                        });
                    }
                });

                sendResponse({ success: true, simplified: simplifiedText });
            })
            .catch(error => {
                console.error("ChatGPT Error:", error);
                sendResponse({ success: false, message: error.message });
            });

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
            const apiKey = await getAPIKey();
            sendResponse({ 
                isValid: Boolean(apiKey),
                message: apiKey ? 'Valid API key found' : 'No valid API key found'
            });
        }
    } catch (error) {
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
async function callChatGPT(selectedText, apiKey, language, mode, length) {
    
    const apiUrl = "https://api.openai.com/v1/chat/completions";  // Updated to chat completions endpoint
    
    // Create the system message for strict word count
    const wordLimit = length === "short" ? 20 :
                     length === "shorter" ? 30 :
                     length === "medium" ? 50 :
                     length === "longer" ? 70 :
                     length === "longest" ? 100 : 50;
    
    const systemMessage = `You are a helpful assistant that STRICTLY follows word count limits. Your current limit is ${wordLimit} words. ${mode === "lookup" ? "For lookups, act like a concise encyclopedia, providing key facts, historical context, and significance of the term or entity." : ""}`;
    
    const userPrompt = `Analyze this text and respond in ${language}:
    
Text: "${selectedText}"

Page Context:
- Title: ${pageTitle}
- Content: ${paragraphs}

Task: ${mode === "explain" ? "Explain this text in simpler terms" : 
       mode === "summarize" ? "Summarize the key points" : 
       mode === "lookup" ? "Provide a Wikipedia-style overview of this term/entity, including: definition, key facts, historical significance, and relevance to the current context. Focus on essential information a reader would need to understand its importance." : 
       "Explain this text"}

Remember: Your response MUST be exactly ${wordLimit} words or less.`;

    try {
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: systemMessage
                    },
                    {
                        role: "user",
                        content: userPrompt
                    }
                ],
                max_tokens: wordLimit * 4,
                temperature: 0.3  // Lower temperature for more consistent adherence to instructions
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


  
