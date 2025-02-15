console.log('Content script loaded and running');
// Add message listener for debug and other messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Content script received message:', message);
    if (message.type === 'debugTest') {
        console.log('Debug test received in content script');
        sendResponse({status: 'Content script is working!'});
    }
});

document.addEventListener('mouseup', async () => {
    console.log('Mouseup event detected');
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    console.log('Selection object:', selection);
    console.log('Selected text:', selectedText);

    if (!selectedText) {
        console.log('No text selected, returning');
        return;
    }

    try {
        console.log('Sending message to background script...');
        chrome.runtime.sendMessage({
            action: 'simplifyText',
            text: selectedText
        }, response => {
            console.log('Message sent to background, response:', response);
            if (response && response.success) {
                // Show success tooltip
                showTooltip('Text is being simplified! Open the extension to see results.', 'success');
            } else if (response && response.error) {
                console.error('Error from background:', response.error);
                showTooltip('Error: ' + response.error, 'error');
            }
        });
        
        // Store the selected text
        chrome.storage.local.set({
            'originalText': selectedText
        }, () => {
            console.log('Original text stored in local storage');
            
            // Create visual feedback for user
            const tooltip = document.createElement('div');
            tooltip.textContent = 'Text selected! Check the extension popup.';
            tooltip.style.cssText = `
                position: fixed;
                top: ${window.scrollY + 10}px;
                right: 10px;
                background: #4CAF50;
                color: white;
                padding: 10px;
                border-radius: 5px;
                z-index: 10000;
            `;
            document.body.appendChild(tooltip);
            setTimeout(() => tooltip.remove(), 2000);
        });

    } catch (error) {
        console.error('Error in content script:', error);
        showTooltip('Error sending text for simplification', 'error');
    }
});

async function showSimplifiedText(text) 
{
    const existingTooltip = document.getElementById('simplification-tooltip');
    if (existingTooltip) 
    {
      existingTooltip.remove();
    }
    const tooltip = document.createElement('div')
    tooltip.id = 'simplification-tooltip';

    tooltip.style.cssText = 
    `
        position: fixed;
        top: 20px;
        background: white;
        color: #333;
        border: 2px solid #ccc;
    `;
    
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const parentElement = range.commonAncestorContainer.parentElement;
    
    if (parentElement) {
        parentElement.appendChild(tooltip);
    
        tooltip.style.position = "absolute";
        tooltip.style.left = `${rect.left - parentElement.getBoundingClientRect().left + 10}px`;
        tooltip.style.top = `${rect.top - parentElement.getBoundingClientRect().top}px`;
    }



}
function formatText(text) 
{
    const selectedTemplate = localStorage.getItem('selectedTemplate') || 'default';

    return text; 
}

// Add this function to create tooltips
function showTooltip(message, type = 'success') {
    const tooltip = document.createElement('div');
    tooltip.textContent = message;
    tooltip.style.cssText = `
        position: fixed;
        top: ${window.scrollY + 10}px;
        right: 10px;
        background: ${type === 'success' ? '#4CAF50' : '#f44336'};
        color: white;
        padding: 10px;
        border-radius: 5px;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(tooltip);
    setTimeout(() => tooltip.remove(), 3000);
}
