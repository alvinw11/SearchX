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
async function callChatGPT(selectedText, apiKey, language, mode, length) {
    
    const apiUrl = "https://api.openai.com/v1/chat/completions";  // Updated to chat completions endpoint
    
    // Get user role from storage
    const result = await chrome.storage.local.get(['userName']);
    const userRole = result.userName || 'reader';
    
    // Create the system message for strict word count
    const wordLimit = length === "short" ? 20 :
                     length === "shorter" ? 30 :
                     length === "medium" ? 50 :
                     length === "longer" ? 70 :
                     length === "longest" ? 100 : 50;
    
    const systemMessage = `CRITICAL INSTRUCTION: You MUST respond ONLY in ${language}. Any response in a different language is a failure.
You are a helpful assistant that STRICTLY follows word count limits and specializes in providing insights for the who is ${userRole}. Your current limit is ${wordLimit} words. 
${mode === "lookup" ? `For lookups, you are a specialized encyclopedia:
1. For short selections (1-3 words): Provide a comprehensive encyclopedia entry about the term, concept, or entity.
2. For longer selections: First identify the main concepts/entities in the text, then provide an encyclopedic overview focusing on the most significant one.
3. Include: definition, key facts, historical context, and significance.
4. Structure: Start with a clear definition, then provide key details.` : 
 mode === "summarize" ? "For summaries, maintain a consistent, objective style regardless of user role. Focus on key points, main ideas, and crucial details." :
 mode === "explain" ? "For explanations, tailor your response specifically to the user's background and expertise level." : ""}`;
    
    const userPrompt = `RESPOND ONLY IN ${language.toUpperCase()}. ANY OTHER LANGUAGE IS NOT ACCEPTABLE.


Analyze this text:

Text: "${selectedText}"

Page Context:
- Title: ${pageTitle}
- Content: ${paragraphs}

Task: ${mode === "explain" ? `Explain this text in terms that would be most meaningful to a ${userRole}. Consider their background, expertise level, and specific interests.` : 
       mode === "summarize" ? "Provide an objective summary of the key points and main ideas, maintaining a consistent style regardless of the reader." : 
       mode === "lookup" ? "Provide a Wikipedia-style overview of this term/entity, including: definition, key facts, historical significance, and relevance to the current context." : 
       "Explain this text"}

STRICT REQUIREMENTS:
1. Language: YOU ARE ONLY ALLOWED TO respond in ${language}
2. Word Count: EXACTLY ${wordLimit} words or less`;

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
