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
    
    // Create scrollable list container
    const languageList = document.createElement('div');
    languageList.className = 'language-list';
    
    // Add languages
    const languages = [
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' },
        { code: 'de', name: 'German' },
        { code: 'it', name: 'Italian' },
        { code: 'pt', name: 'Portuguese' },
        { code: 'ru', name: 'Russian' },
        { code: 'ja', name: 'Japanese' },
        { code: 'zh', name: 'Chinese' },
        { code: 'ar', name: 'Arabic' },
        { code: 'hi', name: 'Hindi' },
        { code: 'nl', name: 'Dutch' }
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

        // Hide language selector after selection
        languageSelector.style.display = 'none';
    });

    return languageSelector;
}

//Function to create and manage length selector
function createLengthSelector() {
    const lengthSelector = document.createElement('div');
    lengthSelector.id = 'searchx-length-selector';
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
        const option = e.target.closest('.length-option');
        if (!option) return;
        
    });
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
        const modeOption = e.target.closest('.mode-option');
        if (!modeOption) return;

        modeSelector.querySelectorAll('.mode-option').forEach(opt => {
            opt.classList.remove('active');
        });

        modeOption.classList.add('active');
        
        chrome.runtime.sendMessage({ 
            action: 'setMode',
            mode: modeOption.dataset.mode
        });

        modeSelector.style.display = 'none';
    });

    return modeSelector;
}

// Export the functions
export { createLanguageSelector, createModeSelector }; 