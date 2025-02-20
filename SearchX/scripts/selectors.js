const modeSelector = createModeSelector();
const lengthSelector = createLengthSelector();
const languageSelector = createLanguageSelector()

// Create and display the toggle bar UI
function createToggleBarUI() {
    const toggleBar = document.createElement('div');
    toggleBar.id = 'searchx-floating-toggle';
    toggleBar.innerHTML = `
        <div class="drag-handle">⋮⋮</div>
        <div class="toggle-icon" data-action="mode">🔄</div>
        <div class="toggle-icon" data-action="length">⚙️</div>
        <div class="toggle-icon" data-action="language">✖️</div>
    `;

    // Add everything to the document
    document.body.appendChild(modeSelector);
    document.body.appendChild(lengthSelector);
    document.body.appendChild(languageSelector);
    document.body.appendChild(toggleBar);

    return { toggleBar, modeSelector, lengthSelector, languageSelector };
}

const elements = createToggleBarUI(); //creates the toggle bar and its elements by calling the function
setupToggleBarInteractions(elements);//takes those elements and uses them in the function to set up the interactions

// Handle all toggle bar interactions
function setupToggleBarInteractions(elements) {
    const { toggleBar, modeSelector, lengthSelector, languageSelector } = elements;

    // Click handler for toggle icons
    toggleBar.addEventListener('click', (e) => {
        const icon = e.target.closest('.toggle-icon');
        if (!icon) return;

        switch(icon.dataset.action) {
            case 'mode':
                positionModeSelector();
                break;
            case 'length':
                positionLengthSelector();
                break;
            case 'language':
                positionLanguageSelector();
                break;
        }
    });

    // Close selectors when clicking outside
    document.addEventListener('click', (e) => {
        if (!toggleBar.contains(e.target)) {
            modeSelector.style.display = 'none';
            lengthSelector.style.display = 'none';
            languageSelector.style.display = 'none';
        }
    });

    // Setup drag functionality
    const dragHandle = toggleBar.querySelector('.drag-handle');
    dragHandle.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);
}

// Function to create and manage language selector
function createLanguageSelector() {
    const languageSelector = document.createElement('div');
    languageSelector.id = 'searchx-language-selector';
    languageSelector.style.display = 'none';
    
    // Add search input
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'language-search';
    searchInput.placeholder = 'Search language...';

    // Stop propagation on input field
    searchInput.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent click from bubbling up
    });

    // Create scrollable list container
    const languageList = document.createElement('div');
    languageList.className = 'language-list';
    
    // Add languages
    const languages = [
        { code: 'English', name: 'English' },
        { code: 'Spanish', name: 'Spanish' },
        { code: 'French', name: 'French' },
        { code: 'German', name: 'German' },
        { code: 'Italian', name: 'Italian' },
        { code: 'Portuguese', name: 'Portuguese' },
        { code: 'Chinese', name: 'Chinese' },
        { code: 'Japanese', name: 'Japanese' },
        { code: 'Korean', name: 'Korean' },
        { code: 'Russian', name: 'Russian' },
        { code: 'Arabic', name: 'Arabic' },
        { code: 'Hindi', name: 'Hindi' },
        { code: 'Dutch', name: 'Dutch' },
        { code: 'Swedish', name: 'Swedish' },
        { code: 'Turkish', name: 'Turkish' }
    ];

    languages.forEach(lang => {
        const option = document.createElement('div');
        option.className = 'language-option';
        option.dataset.language = lang.code;
        option.textContent = lang.name;
        languageList.appendChild(option);
    });

    // Add search functionality
    searchInput.addEventListener('input', (e) => {
        e.stopPropagation();
        const searchTerm = e.target.value.toLowerCase();
        const options = languageList.querySelectorAll('.language-option');
        
        options.forEach(option => {
            const langName = option.textContent.toLowerCase();
            if (langName.includes(searchTerm)) {
                option.classList.remove('hidden');
            } else {
                option.classList.add('hidden');
            }
        });
    });

    // Assemble the selector
    languageSelector.appendChild(searchInput);
    languageSelector.appendChild(languageList);

    // Add click handler for language selection
    languageList.addEventListener('click', (e) => {
        e.stopPropagation();
        const option = e.target.closest('.language-option');
        if (!option) return;

        // Remove active class from all options
        languageList.querySelectorAll('.language-option').forEach(opt => {
            opt.classList.remove('active');
        });

        // Add active class to selected option
        option.classList.add('active');

        // Send message about language change
        const selectedLanguage = option.dataset.language;
        chrome.runtime.sendMessage({ 
            action: 'setLanguage',
            language: selectedLanguage
        });
    });

    return languageSelector;
}

// Function to create and manage length selector
function createLengthSelector() {
    const lengthSelector = document.createElement('div');
    lengthSelector.id = 'length-selector';
    lengthSelector.style.display = 'none';
    lengthSelector.innerHTML = `
        <div class="length-option" data-length="short">Short</div>
        <div class="length-option" data-length="shorter">Shorter</div>
        <div class="length-option" data-length="medium">Medium</div>
        <div class="length-option" data-length="longer">Longer</div>
        <div class="length-option" data-length="longest">Longest</div>
    `;

    // Add click handler for length selection
    lengthSelector.addEventListener('click', (e) => {
        e.stopPropagation();
        const lengthOption = e.target.closest('.length-option');
        if (!lengthOption) return;//gets option/element closest to where the click happened

        lengthSelector.querySelectorAll('.length-option').forEach(opt => {
            opt.classList.remove('active'); //removes the active class from all options
        });

        lengthOption.classList.add('active'); //highlights the selected option

        chrome.runtime.sendMessage({
            action: 'setLength',
            length: lengthOption.dataset.length
        });//send message about length change

    });
  return lengthSelector; //makes it available to other scripts
}

// Function to create and manage mode selector
function createModeSelector() {
    const modeSelector = document.createElement('div');
    modeSelector.id = 'searchx-mode-selector';
    modeSelector.style.display = 'none';
    modeSelector.innerHTML = `
        <div class="mode-option" data-mode="explain">Explain</div>
        <div class="mode-option" data-mode="summarize">Summarize</div>
        <div class="mode-option" data-mode="lookup">Look-up</div>
    `;

    // Add click handler for mode selection
    modeSelector.addEventListener('click', (e) => {
        e.stopPropagation();
        const modeOption = e.target.closest('.mode-option');
        if (!modeOption) return;

        modeSelector.querySelectorAll('.mode-option').forEach(opt => {
            opt.classList.remove('active');
        });//This for each loop removes the active class from all mode options, opt is like i in a for loop

        modeOption.classList.add('active');
        
        chrome.runtime.sendMessage({ 
            action: 'setMode',
            mode: modeOption.dataset.mode //gets data-mode from clicked option
        });

    });

    return modeSelector;
}


/*
Positioning functions for the toggleBar and its selectors
Positioning functions are used to determine where the toggleBar and its selectors should be placed on the screen.
They are called when the toggleBar is clicked and when the user clicks outside the toggleBar.
The drag functionality is also implemented here. It is called when the user clicks and drags the toggleBar.
*/
function calculateSelectorPosition(toggleBar, selector) {
    const toggleBarRect = toggleBar.getBoundingClientRect();
    const isOnRightSide = toggleBarRect.right > window.innerWidth / 2;

    if (isOnRightSide) {
        selector.style.right = (window.innerWidth - toggleBarRect.left + 10) + 'px';
        selector.style.left = 'auto';
    } else {
        selector.style.left = (toggleBarRect.right + 10) + 'px';
        selector.style.right = 'auto';
    }
    selector.style.top = toggleBarRect.top + 'px';
}
// Selector positioning functions
function positionModeSelector() {
    const { toggleBar, modeSelector } = elements;
    calculateSelectorPosition(toggleBar, modeSelector);
    modeSelector.style.display = modeSelector.style.display === 'none' ? 'flex' : 'none';
}

function positionLengthSelector() {
    const { toggleBar, lengthSelector } = elements;
    calculateSelectorPosition(toggleBar, lengthSelector);
    lengthSelector.style.display = lengthSelector.style.display === 'none' ? 'flex' : 'none';
}

function positionLanguageSelector() {
    const { toggleBar, languageSelector } = elements;
    calculateSelectorPosition(toggleBar, languageSelector);
    languageSelector.style.display = languageSelector.style.display === 'none' ? 'flex' : 'none';
}

// Drag functionality variables
let isDragging = false;
let currentX;
let currentY;
let initialX;
let initialY;
let xOffset = 0;
let yOffset = 0;

// Drag functionality
function dragStart(e) {
    const { toggleBar } = elements;
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;
    isDragging = true;
}

function drag(e) {
    if (isDragging) {
        const { toggleBar } = elements;
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        xOffset = currentX;
        yOffset = currentY;
        setTranslate(currentX, currentY, toggleBar);
    }
}

function dragEnd() {
    initialX = currentX;
    initialY = currentY;
    isDragging = false;
}

function setTranslate(xPos, yPos, el) {
    el.style.transform = `translate(${xPos}px, ${yPos}px)`;
} 