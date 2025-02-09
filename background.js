const extensions = 'https://developer.chrome.com/docs/extensions';
const webstore = 'https://developer.chrome.com/docs/webstore';


chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.action === "simplifyText") {
      const apiKey = await getAPIKey();  // Step 2: Fetch the API key
      const simplifiedText = await callChatGPT(request.text, apiKey);  // Step 3: Simplify text
      
      chrome.runtime.sendMessage({
        type: 'simplifiedText',
        text: simplifiedText,
      }) 
    }

    if (message.type === 'storeAPIKey') {
            // Extract the API key from the message
            const apiKey = message.apiKey;
             // Store the API key in Chrome's local storage
        chrome.storage.local.set({ apiKey: apiKey }, function() {
        // Check if the storage was successful
        if (chrome.runtime.lastError) {
          // If there was an error, send a failure response
          sendResponse({ success: false, message: chrome.runtime.lastError.message });
        } else {
          // If successful, send a success response
          sendResponse({ success: true });
        }
    })
    return true;  // Keeps the message channel open for async response
  }});

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
  
      if (result) {
        return result;
      } else {
        console.error('No API key found in storage');
        return null;
      }
    } catch (error) {
      console.error('Error fetching API key:', error.message);
      return null;
    }
  }
  

  //simplify the text input 
  async function callChatGPT(selectedText, apiKey) {
    const apiUrl = "https://api.openai.com/v1/completions";
    const prompt = `Simplify this text: Make it less academic and easier to understand for non-academics:\n\n${selectedText}`;
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "text-davinci-003",
        prompt: prompt,
        max_tokens: 300,
        temperature: 0.7
      })
    });
  
    const data = await response.json();
    return data.choices[0].text.trim();
  }


  