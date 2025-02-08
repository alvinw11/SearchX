{
    "manifest_version": 3,
    "name": "Extension",
    "version": "1.0",
    "description": "A simple web extension.",
    "background":{
      "service_worker":"background.js"
    },
    "action": {
      "default_popup": "popup.html",
      "default_icon": {
        "16": "icon16.png",
        "48": "icon48.png",
        "128": "icon128.png"
      }
    },
    "content":[{
      "js":["content.js"]
    }],
    "permissions": ["storage"],
    "host_permissions": ["https://*/*"]
  }
  
