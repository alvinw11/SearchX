console.log('Content script loaded and running');

// Add message listener for debug and other messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Message received:', message);
    if (message.type === 'debugTest') {
        console.log('Debug test received in content script');
        sendResponse({status: 'Content script is working!'});
    }
    if (message.type === 'simplifiedText') {
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const x = rect.left + window.scrollX;
        const y = rect.top + window.scrollY;
        
        console.log('Showing tooltip at:', { x, y, message: message.text });
        showTextTooltip(message.text, x, y, 'simplifiedText');
        sendResponse({success: true});
    }
    return true;
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
                // Just log success, no tooltip needed
                console.log('Text is being simplified');
            } else if (response && response.disabled) {
                // Extension is disabled, do nothing
                console.log('Extension is disabled, ignoring selection');
            } else if (response && response.error) {
                console.error('Error from background:', response.error);
            }
        });
        
        // Store the selected text
        chrome.storage.local.set({
            'originalText': selectedText
        }, () => {
            console.log('Original text stored in local storage');
        });

    } catch (error) {
        console.error('Error in content script:', error);
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

function showTextTooltip(message, x, y, type = 'simplifiedText') {
    console.log('Showing text tooltip:', { message, x, y, type });
    
    // Remove any existing tooltips
    const existingTooltip = document.querySelector('.text-tooltip');
    if (existingTooltip) {
        existingTooltip.remove();
    }

    const tooltip = document.createElement('div');
    tooltip.className = 'text-tooltip'; // Add class for future reference
    tooltip.textContent = message;
    
    // First append to DOM so we can get dimensions
    document.body.appendChild(tooltip);
    
    // Set initial styles without position
    tooltip.style.cssText = `
        position: absolute;
        background: rgba(255, 255, 255, 1);
        color: black;
        border: 2px solid #ccc;
        padding: 8px;
        border-radius: 8px;
        z-index: 9999;
        max-width: 250px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
        font-family: Arial, sans-serif;
        font-size: 16px;
        pointer-events: auto;
        visibility: hidden; // Hide initially to measure
    `;
    
    // Get tooltip dimensions
    const tooltipWidth = tooltip.offsetWidth;
    const tooltipHeight = tooltip.offsetHeight;
    
    // Calculate position to ensure tooltip stays within viewport
    let posX = x;
    let posY = y - 50; // Default offset
    
    // Check right boundary
    if (posX + tooltipWidth > window.innerWidth - 20) {
        posX = window.innerWidth - tooltipWidth - 20; // 20px padding from edge
    }
    
    // Check left boundary
    if (posX < 20) {
        posX = 20; // 20px padding from edge
    }
    
    // Check top boundary
    if (posY < 20) {
        posY = 20; // 20px padding from top
    }
    
    // Check bottom boundary
    if (posY + tooltipHeight > window.innerHeight - 20) {
        posY = window.innerHeight - tooltipHeight - 20; // 20px padding from bottom
    }
    
    // Now set the final position and make visible
    tooltip.style.left = `${posX}px`;
    tooltip.style.top = `${posY}px`;
    tooltip.style.visibility = 'visible';
    
    // Remove tooltip on click
    document.addEventListener('click', () => tooltip.remove());
}

function setupDropdownBehavior() {
    const dropdowns = [
        document.getElementById('searchx-mode-selector'),
        document.getElementById('length-selector'),
        document.getElementById('searchx-language-selector')
    ];

    let currentOpenDropdown = null; // Track currently open dropdown

    // Close all dropdowns
    function closeAllDropdowns() {
        dropdowns.forEach(dropdown => {
            if (dropdown) {
                dropdown.style.display = 'none';
            }
        });
        currentOpenDropdown = null;
    }

    // When clicking any toggle icon
    document.querySelectorAll('.toggle-icon').forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            const targetDropdown = document.getElementById(toggle.getAttribute('data-target'));
            if (!targetDropdown) return;

            // If clicking the same toggle that's already open, just close it
            if (targetDropdown === currentOpenDropdown) {
                closeAllDropdowns();
                return;
            }

            // Close any open dropdown first
            closeAllDropdowns();

            // Open the new dropdown
            targetDropdown.style.display = 'flex';
            currentOpenDropdown = targetDropdown;
        });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#searchx-floating-toggle') && 
            !e.target.closest('#searchx-mode-selector') && 
            !e.target.closest('#length-selector') && 
            !e.target.closest('#searchx-language-selector')) {
            closeAllDropdowns();
        }
    });

    // Add click handlers to all option elements
    document.querySelectorAll('.mode-option, .length-option, .language-option').forEach(option => {
        option.addEventListener('click', () => {
            closeAllDropdowns();
        });
    });
}

// Call this function after your elements are created
setupDropdownBehavior();

const pageTitle = document.title; // Get the title of the page
const paragraphs = Array.from(document.querySelectorAll('p')).map(p => p.innerText); // Get all paragraph text


// You can send this data to the background script or process it further
chrome.runtime.sendMessage({
    action: 'contextData',
    title: pageTitle,
    paragraphs: paragraphs
});