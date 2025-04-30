// ==UserScript==
// @name         AU Migration Toolkit
// @namespace    http://tampermonkey.net/
// @version      0.31
// @description  A bunch of handy tools to speed up AU migration work
// @author       Tim Churchward
// @match        https://load.lo.unisa.edu.au/*
// @match        https://learn.adelaide.edu.au/*
// @match        https://myuni.adelaide.edu.au/*
// @updateURL    http://127.0.0.1:3000/tools/migration-toolkit/migration-toolkit.user.js
// @downloadURL  http://127.0.0.1:3000/tools/migration-toolkit/migration-toolkit.user.js
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

/**
 * AU Migration Toolkit
 * This script will fetch and execute the latest toolkit code from GitHub
 */

const AUMigrationToolkit = (function() {
    // Private variables
    const VERSION = '0.31';
    let toolsContainer = null;
    let contentArea = null;
    let isShaded = false;
    let isDragging = false; // Flag to track dragging state
    
    // Local storage keys
    const STORAGE_KEY_POSITION = 'auMigrationToolkit_position';
    const STORAGE_KEY_SHADED = 'auMigrationToolkit_shaded';
    const STORAGE_KEY_API_KEY = 'auMigrationToolkit_apiKey';
    
    // Tool registry
    const tools = [];
    
    // Tool categories for organization
    const categories = {
        GENERAL: 'General',
        CONTENT: 'Content',
        LAYOUT: 'Layout',
        ASSESSMENT: 'Assessment',
        MEDIA: 'Media'
    };
    
    /**
     * Register a new tool in the toolkit
     * @param {Object} toolDefinition - The tool definition object
     */
    function registerTool(toolDefinition) {
        // Validate required properties
        if (!toolDefinition.id || !toolDefinition.name || !toolDefinition.urlPatterns || !toolDefinition.action) {
            console.error('[AU Migration Toolkit] Invalid tool definition:', toolDefinition);
            return;
        }
        
        // Set default category if not provided
        if (!toolDefinition.category) {
            toolDefinition.category = categories.GENERAL;
        }
        
        tools.push(toolDefinition);
        console.log(`[AU Migration Toolkit] Registered tool: ${toolDefinition.name}`);
    }
    
    /**
     * Get tools available for the current page
     * @returns {Array} - Array of available tools
     */
    function getAvailableTools() {
        const currentUrl = window.location.href;
        return tools.filter(tool => 
            tool.urlPatterns.some(pattern => 
                new RegExp(pattern).test(currentUrl)
            )
        );
    }
    
    /**
     * Create the floating UI container
     */
    function createToolsContainer() {
        // Create container
        toolsContainer = document.createElement('div');
        toolsContainer.id = 'au-migration-toolkit';
        toolsContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 300px;
            background-color: #fff;
            border: 1px solid #ccc;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            z-index: 9999;
            font-family: Arial, sans-serif;
            font-size: 14px;
            overflow: hidden;
        `;
        
        // Create header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 10px;
            background-color: #f5f5f5;
            cursor: move;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        
        const titleArea = document.createElement('div');
        titleArea.style.cssText = `
            display: flex;
            align-items: center;
            flex-grow: 1;
        `;
        
        const title = document.createElement('div');
        title.textContent = 'AU Migration Toolkit';
        title.style.fontWeight = 'bold';
        
        titleArea.appendChild(title);
        
        // Add click event to header for shade toggle
        titleArea.style.cursor = 'pointer';
        titleArea.title = 'Click to collapse/expand';
        titleArea.addEventListener('click', function(e) {
            // Only toggle shade if we're not in a drag operation
            if (!isDragging && (e.target === titleArea || e.target === title)) {
                toggleShade();
            }
        });
        
        header.appendChild(titleArea);
        
        // Create content area
        contentArea = document.createElement('div');
        contentArea.style.cssText = `
            padding: 10px;
            max-height: 400px;
            border-top: 1px solid #ddd;
            overflow-y: auto;
        `;
        
        // Add elements to container
        toolsContainer.appendChild(header);
        toolsContainer.appendChild(contentArea);
        
        // Add to document
        document.body.appendChild(toolsContainer);
        
        // Make draggable
        makeDraggable(toolsContainer, header);
        
        // Restore position from localStorage if available
        restorePosition();
        
        // Restore shade state
        const savedShadeState = localStorage.getItem(STORAGE_KEY_SHADED);
        if (savedShadeState === 'true') {
            toggleShade(true);
        }
        
        return contentArea;
    }
    
    /**
     * Make an element draggable
     * @param {HTMLElement} element - The element to make draggable
     * @param {HTMLElement} handle - The drag handle element
     */
    function makeDraggable(element, handle) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        let startX = 0, startY = 0;
        let startTime = 0;
        let hasMoved = false;
        
        // Constants for click vs. drag detection
        const DRAG_THRESHOLD = 3; // pixels
        const CLICK_TIME_THRESHOLD = 300; // milliseconds
        
        handle.onmousedown = dragMouseDown;
        
        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            
            // Reset flags
            isDragging = false;
            hasMoved = false;
            
            // Record start position and time
            startX = e.clientX;
            startY = e.clientY;
            startTime = Date.now();
            
            // Get mouse position at startup
            pos3 = e.clientX;
            pos4 = e.clientY;
            
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }
        
        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            
            // Calculate distance moved
            const dx = Math.abs(e.clientX - startX);
            const dy = Math.abs(e.clientY - startY);
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // If we've moved beyond the threshold, mark as dragging
            if (distance > DRAG_THRESHOLD) {
                hasMoved = true;
                isDragging = true;
            }
            
            // Calculate new position
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            
            // Set element's new position
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
            element.style.bottom = "auto";
            element.style.right = "auto";
        }
        
        function closeDragElement() {
            // Stop moving when mouse button is released
            document.onmouseup = null;
            document.onmousemove = null;
            
            // Save position to localStorage
            savePosition();
            
            // Calculate total time and determine if this was a click or drag
            const totalTime = Date.now() - startTime;
            
            // If it was a short interaction with minimal movement, treat as a click
            if (!hasMoved && totalTime < CLICK_TIME_THRESHOLD) {
                isDragging = false;
            } else if (hasMoved) {
                // If there was significant movement, it was a drag
                // Keep isDragging true for a moment to prevent accidental clicks
                setTimeout(() => {
                    isDragging = false;
                }, 50);
            } else {
                // Reset the flag immediately for other cases
                isDragging = false;
            }
        }
    }
    
    /**
     * Render available tools in the UI
     * @param {HTMLElement} container - The container to render tools in
     */
    /**
     * Open settings dialog
     */
    function openSettings() {
        // Create modal backdrop
        const backdrop = document.createElement('div');
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 10000;
            display: flex;
            justify-content: center;
            align-items: center;
        `;
        
        // Create modal dialog
        const modal = document.createElement('div');
        modal.style.cssText = `
            background-color: white;
            border-radius: 5px;
            padding: 20px;
            width: 400px;
            max-width: 90%;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        `;
        
        // Create modal header
        const header = document.createElement('div');
        header.style.cssText = `
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
        `;
        header.textContent = 'AU Migration Toolkit Settings';
        
        // Create form
        const form = document.createElement('form');
        form.style.cssText = `
            display: flex;
            flex-direction: column;
        `;
        
        // API Key field
        const apiKeyLabel = document.createElement('label');
        apiKeyLabel.textContent = 'Canvas API Key:';
        apiKeyLabel.style.marginBottom = '5px';
        
        const apiKeyInput = document.createElement('input');
        apiKeyInput.type = 'password';
        apiKeyInput.value = GM_getValue(STORAGE_KEY_API_KEY, '');
        apiKeyInput.style.cssText = `
            padding: 8px;
            margin-bottom: 15px;
            border: 1px solid #ddd;
            border-radius: 4px;
        `;
        
        // Buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 10px;
        `;
        
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.type = 'button';
        cancelButton.style.cssText = `
            padding: 8px 15px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background-color: #f5f5f5;
            cursor: pointer;
        `;
        
        const saveButton = document.createElement('button');
        saveButton.textContent = 'Save';
        saveButton.type = 'submit';
        saveButton.style.cssText = `
            padding: 8px 15px;
            border: 1px solid #4CAF50;
            border-radius: 4px;
            background-color: #4CAF50;
            color: white;
            cursor: pointer;
        `;
        
        // Add event listeners
        cancelButton.addEventListener('click', function() {
            document.body.removeChild(backdrop);
        });
        
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            GM_setValue(STORAGE_KEY_API_KEY, apiKeyInput.value);
            document.body.removeChild(backdrop);
            console.log('[AU Migration Toolkit] API key saved');
        });
        
        // Assemble modal
        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(saveButton);
        
        form.appendChild(apiKeyLabel);
        form.appendChild(apiKeyInput);
        form.appendChild(buttonContainer);
        
        modal.appendChild(header);
        modal.appendChild(form);
        backdrop.appendChild(modal);
        
        // Add to document
        document.body.appendChild(backdrop);
        
        // Focus the input
        apiKeyInput.focus();
    }
    
    /**
     * Toggle the shaded state of the toolkit
     * @param {boolean} [forceState] - Force a specific state (optional)
     */
    function toggleShade(forceState) {
        // If forceState is provided, use it; otherwise toggle current state
        isShaded = forceState !== undefined ? forceState : !isShaded;
        
        if (isShaded) {
            contentArea.style.display = 'none';
            toolsContainer.style.width = 'auto';
        } else {
            contentArea.style.display = 'block';
            toolsContainer.style.width = '300px';
        }
        
        // Save state to localStorage
        localStorage.setItem(STORAGE_KEY_SHADED, isShaded);
    }
    
    /**
     * Save the current position to localStorage
     */
    function savePosition() {
        if (!toolsContainer) return;
        
        const position = {
            top: toolsContainer.style.top,
            left: toolsContainer.style.left,
            bottom: toolsContainer.style.bottom,
            right: toolsContainer.style.right
        };
        
        localStorage.setItem(STORAGE_KEY_POSITION, JSON.stringify(position));
    }
    
    /**
     * Restore position from localStorage
     */
    function restorePosition() {
        if (!toolsContainer) return;
        
        const savedPosition = localStorage.getItem(STORAGE_KEY_POSITION);
        if (!savedPosition) return;
        
        try {
            const position = JSON.parse(savedPosition);
            
            // Apply saved position
            if (position.top) toolsContainer.style.top = position.top;
            if (position.left) toolsContainer.style.left = position.left;
            if (position.bottom) toolsContainer.style.bottom = position.bottom;
            if (position.right) toolsContainer.style.right = position.right;
            
            // If we have a left/top position, make sure bottom/right are set to auto
            if (position.top || position.left) {
                toolsContainer.style.bottom = 'auto';
                toolsContainer.style.right = 'auto';
            }
            
            // Check if the position is outside the viewport
            setTimeout(() => {
                const rect = toolsContainer.getBoundingClientRect();
                const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
                const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
                
                const isOutsideViewport = (
                    rect.left < 0 ||
                    rect.top < 0 ||
                    rect.right > viewportWidth ||
                    rect.bottom > viewportHeight
                );
                
                if (isOutsideViewport) {
                    console.log('[AU Migration Toolkit] Saved position is outside viewport, resetting to default');
                    // Reset to default position (bottom right)
                    toolsContainer.style.top = 'auto';
                    toolsContainer.style.left = 'auto';
                    toolsContainer.style.bottom = '20px';
                    toolsContainer.style.right = '20px';
                    savePosition(); // Update saved position
                }
            }, 0); // Use setTimeout to ensure the DOM has updated with the applied position
        } catch (error) {
            console.error('[AU Migration Toolkit] Error restoring position:', error);
        }
    }
    
    function renderTools(container) {
        const availableTools = getAvailableTools();
        
        if (availableTools.length === 0) {
            const noTools = document.createElement('div');
            noTools.textContent = 'No tools available for this page.';
            noTools.style.padding = '10px';
            noTools.style.color = '#666';
            container.appendChild(noTools);
            return;
        }
        
        // Group tools by category
        const toolsByCategory = {};
        availableTools.forEach(tool => {
            if (!toolsByCategory[tool.category]) {
                toolsByCategory[tool.category] = [];
            }
            toolsByCategory[tool.category].push(tool);
        });
        
        // Create sections for each category
        Object.keys(toolsByCategory).forEach(category => {
            const categoryTools = toolsByCategory[category];
            
            // Create category section
            const section = document.createElement('div');
            section.style.marginBottom = '15px';
            
            // Create category header
            const categoryHeader = document.createElement('div');
            categoryHeader.textContent = category;
            categoryHeader.style.cssText = `
                font-weight: bold;
                margin-bottom: 5px;
                color: #333;
            `;
            section.appendChild(categoryHeader);
            
            // Create tools list
            categoryTools.forEach(tool => {
                const button = document.createElement('button');
                button.textContent = tool.name;
                button.title = tool.description || '';
                button.style.cssText = `
                    display: block;
                    width: 100%;
                    padding: 8px 12px;
                    margin-bottom: 5px;
                    background-color: #f8f8f8;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    cursor: pointer;
                    text-align: left;
                    transition: background-color 0.2s;
                `;
                
                button.addEventListener('mouseover', function() {
                    this.style.backgroundColor = '#e9e9e9';
                });
                
                button.addEventListener('mouseout', function() {
                    this.style.backgroundColor = '#f8f8f8';
                });
                
                button.addEventListener('click', function() {
                    try {
                        tool.action();
                    } catch (error) {
                        console.error(`[AU Migration Toolkit] Error executing tool "${tool.name}":`, error);
                    }
                });
                
                section.appendChild(button);
            });
            
            container.appendChild(section);
        });

        // Create a footer with version and settings
        const footer = document.createElement('div');
        footer.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px solid #eee;
        `;
        
        // Version number
        const version = document.createElement('div');
        version.textContent = `v${VERSION}`;
        version.style.fontSize = '12px';
        version.style.color = '#666';
        
        // Settings icon
        const settingsIcon = document.createElement('div');
        settingsIcon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></svg>`;
        settingsIcon.style.cssText = `
            color: #666;
            cursor: pointer;
            padding: 5px;
        `;
        settingsIcon.title = 'Settings';
        settingsIcon.addEventListener('click', openSettings);
        
        footer.appendChild(version);
        footer.appendChild(settingsIcon);
        container.appendChild(footer);
    }
    
    /**
     * Initialize the toolkit UI
     */
    function initUI() {
        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createUI);
        } else {
            createUI();
        }
        
        function createUI() {
            const contentContainer = createToolsContainer();
            renderTools(contentContainer);
        }
    }
    
    /**
     * Helper function to define a new tool
     * @param {string} id - Unique identifier for the tool
     * @param {string} name - Display name for the button
     * @param {string} description - Short description of what the tool does
     * @param {Array} urlPatterns - Array of regex patterns to match URLs
     * @param {Function} action - Function to execute when the tool is clicked
     * @param {Object} options - Additional options (category, icon, etc.)
     */
    function defineTool(id, name, description, urlPatterns, action, options = {}) {
        registerTool({
            id,
            name,
            description,
            urlPatterns,
            action,
            ...options
        });
    }
    
    /**
     * Initialize the toolkit
     */
    function init() {
        console.log('[AU Migration Toolkit] Initializing...');
        
        // Initialize UI
        initUI();
        
        console.log('[AU Migration Toolkit] Initialized');
    }
    
    /**
     * Utility functions for working with Canvas pages
     */
    const CanvasUtils = {
        /**
         * Get the HTML content of the current Canvas page
         * @returns {string|null} The HTML content of the page or null if not available
         */
        getPage: function() {
            // Access ENV directly from the window object at the time of calling
            // This ensures we get the current state of ENV, not the state when the script loaded
            try {
                // Try to access the ENV object in different ways
                // 1. Direct window.ENV access
                if (window.ENV && window.ENV.WIKI_PAGE && window.ENV.WIKI_PAGE.body) {
                    console.log('[AU Migration Toolkit] Found page content via window.ENV');
                    return window.ENV.WIKI_PAGE.body;
                }
                
                // 2. Try to find it in the global scope
                if (typeof ENV !== 'undefined' && ENV.WIKI_PAGE && ENV.WIKI_PAGE.body) {
                    console.log('[AU Migration Toolkit] Found page content via global ENV');
                    return ENV.WIKI_PAGE.body;
                }
                
                // 3. Try to extract it from the page content if it exists in a script tag
                const envScripts = document.querySelectorAll('script:not([src])');
                for (const script of envScripts) {
                    if (script.textContent.includes('ENV = {') || script.textContent.includes('ENV={')) {
                        console.log('[AU Migration Toolkit] Attempting to extract ENV from script tag');
                        try {
                            // This is a bit risky but might work in some cases
                            // Extract the ENV object definition and evaluate it
                            const envMatch = script.textContent.match(/ENV\s*=\s*({[\s\S]*?});/);
                            if (envMatch && envMatch[1]) {
                                const extractedEnv = eval('(' + envMatch[1] + ')');
                                if (extractedEnv.WIKI_PAGE && extractedEnv.WIKI_PAGE.body) {
                                    console.log('[AU Migration Toolkit] Successfully extracted page content from script tag');
                                    return extractedEnv.WIKI_PAGE.body;
                                }
                            }
                        } catch (evalError) {
                            console.error('[AU Migration Toolkit] Error evaluating ENV from script:', evalError);
                        }
                    }
                }
                
                // No DOM fallback - we only want the original content from ENV
                
                console.log('[AU Migration Toolkit] Could not find page content');
                return null;
            } catch (error) {
                console.error('[AU Migration Toolkit] Error getting page content:', error);
                return null;
            }
        },
        
        /**
         * Get the current page path from ENV
         * @returns {Object|null} Object containing courseId and pageUrl, or null if not available
         */
        getCurrentPageInfo: function() {
            try {
                // Try to get the page path from ENV
                let pagePath = null;
                
                // Check different ENV locations
                if (window.ENV && window.ENV.WIKI_PAGE_SHOW_PATH) {
                    pagePath = window.ENV.WIKI_PAGE_SHOW_PATH;
                } else if (typeof ENV !== 'undefined' && ENV.WIKI_PAGE_SHOW_PATH) {
                    pagePath = ENV.WIKI_PAGE_SHOW_PATH;
                }
                
                if (!pagePath) {
                    console.log('[AU Migration Toolkit] Could not find page path in ENV');
                    return null;
                }
                
                // Extract course ID and page URL from the path
                // Format: /courses/4493/pages/home-page-intbus-3002-2024
                const match = pagePath.match(/\/courses\/(\d+)\/pages\/([^\/]+)/);
                if (!match) {
                    console.log('[AU Migration Toolkit] Could not parse page path:', pagePath);
                    return null;
                }
                
                return {
                    courseId: match[1],
                    pageUrl: match[2]
                };
            } catch (error) {
                console.error('[AU Migration Toolkit] Error getting current page info:', error);
                return null;
            }
        },
        
        /**
         * Update the current Canvas page
         * @param {string} newBody - The new HTML content for the page
         * @param {Object} options - Additional options for the update
         * @returns {Promise} A promise that resolves when the page is updated
         */
        updatePage: async function(newBody, options = {}) {
            try {
                // Get the current page info
                const pageInfo = this.getCurrentPageInfo();
                if (!pageInfo) {
                    throw new Error('Could not determine current page information');
                }
                
                const { courseId, pageUrl } = pageInfo;
                
                // Prepare the update data
                const updateData = {
                    body: newBody,
                    ...options
                };
                
                // Use the Canvas API to update the page
                console.log(`[AU Migration Toolkit] Updating page ${pageUrl} in course ${courseId}`);
                const result = await CanvasAPI.updatePage(courseId, pageUrl, updateData);
                
                console.log('[AU Migration Toolkit] Page updated successfully:', result);
                
                // Refresh the page to show the changes
                if (options.refresh !== false) {
                    console.log('[AU Migration Toolkit] Refreshing page...');
                    setTimeout(() => window.location.reload(), 500);
                }
                
                return result;
            } catch (error) {
                console.error('[AU Migration Toolkit] Error updating page:', error);
                throw error;
            }
        }
    };
    
    /**
     * Canvas LMS API Client
     */
    const CanvasAPI = {
        /**
         * Get the base API URL for the current Canvas instance
         * @returns {string} The base API URL
         */
        getBaseUrl: function() {
            const hostname = window.location.hostname;
            return `https://${hostname}/api/v1`;
        },
        
        /**
         * Get the API key from storage
         * @returns {string} The API key
         */
        getApiKey: function() {
            const apiKey = GM_getValue(STORAGE_KEY_API_KEY, '');
            if (!apiKey) {
                alert('Canvas API key not set. Please set your API key in the toolkit settings.');
                openSettings();
                throw new Error('Canvas API key not set');
            }
            return apiKey;
        },
        
        /**
         * Make a request to the Canvas API
         * @param {string} endpoint - The API endpoint
         * @param {Object} options - Fetch options
         * @returns {Promise} A promise that resolves with the API response
         */
        request: async function(endpoint, options = {}) {
            const baseUrl = this.getBaseUrl();
            const apiKey = this.getApiKey();
            
            const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
            
            const fetchOptions = {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                ...options
            };
            
            try {
                const response = await fetch(url, fetchOptions);
                
                if (!response.ok) {
                    // Handle specific error codes
                    if (response.status === 401) {
                        console.error('[AU Migration Toolkit] Authentication failed: Invalid API key');
                        alert('Canvas API authentication failed. Your API key may be invalid or expired. Please check your settings.');
                        openSettings(); // Open settings dialog to let user update the key
                        throw new Error('Authentication failed: Invalid API key');
                    }
                    
                    throw new Error(`Canvas API error: ${response.status} ${response.statusText}`);
                }
                
                return await response.json();
            } catch (error) {
                console.error('[AU Migration Toolkit] Canvas API error:', error);
                throw error;
            }
        },
        
        /**
         * Get a page from Canvas
         * @param {string} courseId - The course ID
         * @param {string} pageUrl - The page URL
         * @returns {Promise} A promise that resolves with the page data
         */
        getPage: async function(courseId, pageUrl) {
            return await this.request(`/courses/${courseId}/pages/${pageUrl}`);
        },
        
        /**
         * Update a page in Canvas
         * @param {string} courseId - The course ID
         * @param {string} pageUrl - The page URL
         * @param {Object} data - The page data to update
         * @returns {Promise} A promise that resolves with the updated page data
         */
        updatePage: async function(courseId, pageUrl, data) {
            return await this.request(`/courses/${courseId}/pages/${pageUrl}`, {
                method: 'PUT',
                body: JSON.stringify({ wiki_page: data })
            });
        },
        
        /**
         * Get the current course ID from the URL
         * @returns {string|null} The course ID or null if not found
         */
        getCurrentCourseId: function() {
            const match = window.location.pathname.match(/\/courses\/(\d+)/);
            return match ? match[1] : null;
        }
    };
    
    // Public API
    return {
        init,
        registerTool,
        defineTool,
        categories,
        VERSION,
        CanvasAPI, // Expose the Canvas API client
        CanvasUtils // Expose Canvas utility functions
    };
})();

// Initialize the toolkit
(function() {
    // Wait for the page to be fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initToolkit);
    } else {
        initToolkit();
    }
    
    function initToolkit() {
        // Small delay to ensure the page is fully rendered
        setTimeout(() => {
            AUMigrationToolkit.init();
        }, 500);
    }
})();

// Tool Definitions
// This is where we can add more tools or load them from external sources

// Example of how to define a custom tool:
/*
AUMigrationToolkit.defineTool(
    'custom-tool-id',
    'Custom Tool Name',
    'Description of what this tool does',
    ['.*\\.adelaide\\.edu\\.au.*'], // URL patterns where this tool should appear
    function() {
        // Tool implementation goes here
        console.log('Custom tool executed!');
    },
    { category: AUMigrationToolkit.categories.CONTENT }
);
*/

// Hello World example tool
AUMigrationToolkit.defineTool(
    'hello-world',
    'Hello World',
    'Demonstrates getting the current page content',
    ['.*\\.adelaide\\.edu\\.au.*'], // URL patterns where this tool should appear
    function() {
        // Get the current page content using CanvasUtils
        const pageContent = AUMigrationToolkit.CanvasUtils.getPage();
        
        if (pageContent) {
            console.log('Current page content:', pageContent);
        } else {
            console.log('No page content available. Are you on a Canvas wiki page?');
        }
    },
    { category: AUMigrationToolkit.categories.CONTENT }
);

// Update Page demonstration tool
AUMigrationToolkit.defineTool(
    'update-page',
    'Update Page',
    'Updates the current page with Hello World content',
    ['.*\\.adelaide\\.edu\\.au.*'], // URL patterns where this tool should appear
    async function() {
        try {
            // Get the current page info to confirm we're on a wiki page
            const pageInfo = AUMigrationToolkit.CanvasUtils.getCurrentPageInfo();
            if (!pageInfo) {
                alert('Could not determine current page information. Are you on a Canvas wiki page?');
                return;
            }
            
            // Confirm before updating
            if (!confirm(`Are you sure you want to update the page "${pageInfo.pageUrl}" in course ${pageInfo.courseId}?`)) {
                return;
            }
            
            // Update the page with Hello World content
            await AUMigrationToolkit.CanvasUtils.updatePage('<h1>HELLO WORLD!</h1>');
            
            // Note: The page will automatically refresh after update
        } catch (error) {
            console.error('Error updating page:', error);
            alert(`Error updating page: ${error.message}`);
        }
    },
    { category: AUMigrationToolkit.categories.CONTENT }
);

// DP Grid Layout Fixer tool
AUMigrationToolkit.defineTool(
    'fix-dp-grid',
    'Fix DP Grid Layout',
    'Fixes display problems with DP grid layouts and saves the changes',
    ['.*\\.unisa\\.edu\\.au.*', '.*\\.adelaide\\.edu\\.au.*'],
    async function() {
        try {
            // Get the current page content
            const pageContent = AUMigrationToolkit.CanvasUtils.getPage();
            if (!pageContent) {
                alert('Could not retrieve the page content. Are you on a Canvas wiki page?');
                return;
            }
            
            // Create a temporary DOM element to manipulate the content
            const tempContainer = document.createElement('div');
            tempContainer.innerHTML = pageContent;
            
            // Find DP grids in the temporary DOM
            const dpGrids = tempContainer.querySelectorAll('.dp-link-grid');
            if (dpGrids.length === 0) {
                alert('No DP grids found on this page.');
                return;
            }
            
            // Fix the grids in the temporary DOM
            dpGrids.forEach(grid => {
                grid.querySelectorAll('*').forEach(child => {
                    child.removeAttribute('style');
                    child.style.margin = 'initial';
                });
                grid.style.fontSize = '12pt';
            });
            
            // Confirm before updating the page
            if (!confirm(`Found ${dpGrids.length} DP grid(s) on this page. Update the page with the fixed content?`)) {
                return;
            }
            
            // Get the updated content
            const updatedContent = tempContainer.innerHTML;
            
            // Update the page with the fixed content
            await AUMigrationToolkit.CanvasUtils.updatePage(updatedContent);
            
            // Note: The page will automatically refresh after update
        } catch (error) {
            console.error('[AU Migration Toolkit] Error fixing DP grids:', error);
            alert(`Error fixing DP grids: ${error.message}`);
        }
    },
    { category: AUMigrationToolkit.categories.LAYOUT }
);