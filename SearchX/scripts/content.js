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
                // Show success tooltip
                showTooltip('Text is being simplified! Open the extension to see results.', 'success');
            } else if (response && response.disabled) {
                // Extension is disabled, do nothing
                console.log('Extension is disabled, ignoring selection');
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

function showTextTooltip(message, x, y, type = 'simplifiedText') {
    console.log('Showing text tooltip:', { message, x, y, type });
    
    // Remove any existing tooltips
    const existingTooltip = document.querySelector('.text-tooltip');
    if (existingTooltip) {
        existingTooltip.remove();
    }

    const tooltip = document.createElement('div');
    tooltip.textContent = message;
    tooltip.style.cssText = `
        position: absolute;
        top: ${y - 50}px;
        left: ${x}px;
        
        background: rgba(255, 255, 255, 0.9);
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
    `;  
    document.body.appendChild(tooltip);
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

function setupDraggable() {
    const floatingToggle = document.getElementById('searchx-floating-toggle');
    const dropdowns = [
        document.getElementById('searchx-mode-selector'),
        document.getElementById('length-selector'),
        document.getElementById('searchx-language-selector')
    ];
    if (!floatingToggle) return;

    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    function dragStart(e) {
        if (e.target.classList.contains('toggle-icon')) return;

        initialX = e.type === "mousedown" ? e.clientX : e.touches[0].clientX;
        initialY = e.type === "mousedown" ? e.clientY : e.touches[0].clientY;

        if (e.target === floatingToggle) {
            isDragging = true;
        }
    }

    function dragEnd(e) {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
    }

    function updateDropdownPositions() {
        dropdowns.forEach(dropdown => {
            if (dropdown && dropdown.style.display === 'flex') {
                // Calculate position relative to toggle bar
                const toggleRect = floatingToggle.getBoundingClientRect();
                const isOnRightSide = toggleRect.right > window.innerWidth / 2;

                if (isOnRightSide) {
                    dropdown.style.right = (window.innerWidth - toggleRect.left + 10) + 'px';
                    dropdown.style.left = 'auto';
                } else {
                    dropdown.style.left = (toggleRect.right + 10) + 'px';
                    dropdown.style.right = 'auto';
                }
                dropdown.style.top = toggleRect.top + 'px';
            }
        });
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();

            const clientX = e.type === "mousemove" ? e.clientX : e.touches[0].clientX;
            const clientY = e.type === "mousemove" ? e.clientY : e.touches[0].clientY;

            currentX = clientX - initialX;
            currentY = clientY - initialY;

            xOffset = currentX;
            yOffset = currentY;

            // Calculate new position
            const rect = floatingToggle.getBoundingClientRect();
            let newX = rect.left + currentX;
            let newY = rect.top + currentY;

            // Get viewport dimensions
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            // Constrain to viewport bounds with padding
            const padding = 1;
            newX = Math.min(Math.max(padding, newX), viewportWidth - rect.width - padding);
            newY = Math.min(Math.max(padding, newY), viewportHeight - rect.height - padding);

            // Apply new position to toggle bar
            floatingToggle.style.left = `${newX}px`;
            floatingToggle.style.top = `${newY}px`;
            floatingToggle.style.right = 'auto';
            floatingToggle.style.transform = 'none';

            // Update dropdown positions
            updateDropdownPositions();

            // Reset for next movement
            initialX = clientX;
            initialY = clientY;
            currentX = 0;
            currentY = 0;
        }
    }

    // Mouse events
    floatingToggle.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    // Touch events
    floatingToggle.addEventListener('touchstart', dragStart);
    document.addEventListener('touchmove', drag);
    document.addEventListener('touchend', dragEnd);
}

// Add this to your existing setupDropdownBehavior function or call separately
setupDraggable();