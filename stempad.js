class StemPad {
  constructor() {
    this.active = false;
    this.API_ENDPOINT = 'https://api.stempad.com/v1'; // Replace with actual API endpoint
    this.editor = null;
  }

  async initialize() {
    try {
      // Wait for Stempad editor to load
      await this.waitForEditor();
      this.active = true;
      console.log('Stempad integration initialized');
    } catch (error) {
      console.error('Stempad initialization failed:', error);
      throw new Error('Failed to initialize Stempad');
    }
  }

  async waitForEditor() {
    // Wait for the editor element to be available
    return new Promise((resolve) => {
      const checkEditor = () => {
        // Look for the main editor container
        const editor = document.querySelector('.scratchpad-editor');
        if (editor) {
          this.editor = editor;
          resolve();
        } else {
          setTimeout(checkEditor, 100);
        }
      };
      checkEditor();
    });
  }

  async addToEditor(text) {
    if (!this.active) {
      await this.initialize();
    }

    try {
      // Create a new text block
      const textBlock = document.createElement('div');
      textBlock.className = 'stempad-text-block';
      textBlock.textContent = text;

      // Add to editor
      if (this.editor) {
        this.editor.appendChild(textBlock);
        console.log('Added text to Stempad editor');
        return true;
      } else {
        throw new Error('Editor not found');
      }
    } catch (error) {
      console.error('Failed to add text to editor:', error);
      return false;
    }
  }

  async postToStempad(note) {
    if (!this.active) {
      await this.initialize();
    }

    try {
      // Get template ID from storage or use default
      const { template_id = 'default_template' } = await chrome.storage.local.get(['template_id']);
      
      const response = await fetch(`${this.API_ENDPOINT}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-User-ID': this.userId
        },
        body: JSON.stringify({
          template_id: template_id,
          content: {
            text: note,
            source_url: window.location.href,
            timestamp: new Date().toISOString()
          },
          metadata: {
            created_by: 'chrome_extension',
            original_url: window.location.href,
            page_title: document.title
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to post note to Stempad');
      }

      const result = await response.json();
      console.log('Successfully posted note to Stempad:', result);
      
      return {
        success: true,
        note_id: result.note_id,
        message: 'Note successfully saved to Stempad'
      };

    } catch (error) {
      console.error('Failed to post note to Stempad:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  activate() {
    this.active = true;
    this.initializeUI();
  }

  deactivate() {
    this.active = false;
    this.removeUI();
  }

  initializeUI() {
    // Add UI elements to the page
    const container = document.createElement('div');
    container.id = 'stempad-container';
    document.body.appendChild(container);
  }

  removeUI() {
    // Remove UI elements
    const container = document.getElementById('stempad-container');
    if (container) {
      container.remove();
    }
  }

  async validateCredentials() {
    try {
      const response = await fetch(`${this.API_ENDPOINT}/validate`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-User-ID': this.userId
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Credential validation failed:', error);
      return false;
    }
  }
}

// Export the StemPad instance
const stempad = new StemPad();

// Listen for simplified text messages when on Stempad editor page
if (window.location.href.includes('stempad.com/editor')) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'simplifiedText') {
      stempad.addToEditor(request.text)
        .then(success => {
          sendResponse({ success });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }
  });
} 