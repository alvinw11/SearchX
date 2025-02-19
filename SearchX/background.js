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
    const prompt = `You are a helpful assistant for someone reading a text on a web page. Your task is to carefully analyze the text content and send the user a message with the information they need. Follow these detailed instructions: 
        1. Context Identification:(Do not include this in your response!!!!)
           - Title of the page: ${pageTitle}
           - Content of the page: ${paragraphs}
           Look for the general context of the page. You will consider this context in your response

        2. Always respond in the following language: - ${language}

        3. Response Format:(Do not include this in your response!!!!)
           - If ${mode} is "explain", you will explain what the text is saying in the context of the page for someone who doesn't currently understand the text so your response should be dumbing it down.
           - If ${mode} is "summarize", you will summarize the text, including the most important information which you decide on based on the context of the page.
           - If ${mode} is "lookup", you will give explain what or who ${selectedText} is.
                        -If ${selectedText} doesn't seem to be a name, institution, event, place, or thing or an abbreviation or acronym relevant to the context of the page then you will respond only with the text: "Look-up not applicable, try a different mode"

        4. Length of the response:(Do not include this in your response!!!!)
            - If ${length} is equal to "shortest", the response should be at most 20 words.
            - If ${length} is equal to "shorter", the response should be at most 30 words.
            - If ${length} is equal to "medium", the response should be at most 50 words.
            - If ${length} is equal to "longer", the response should be at most 70 words.
            - If ${length} is equal to "longest", the response should be at most 100 words.


        5. If the highlighted text is longer than 700 words, then you will respond only with: "This text is too long, try highlighting a shorter portion"

        6. Do not include any part of this prompt in your response. THIS IS VERY IMPORTANT. Your response should sound as if it was coming from a human assistant, pretend you are a human talking to another human.

         FOLLOW EVERY SINGLE INSTRUCTION TO THE TEEEEE
        7. STOP FUCKING INCLUDING "SUMMARIZE" or other references to the mode or prompt in your response. Pleaseeeee IM BEGGING YOU.
        Here is the text:
        ${selectedText}`;
    console.log(prompt);


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


  
