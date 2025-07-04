// ==UserScript==
// @name         AU Migration Toolkit
// @namespace    http://tampermonkey.net/
// @version      0.70
// @description  A bunch of handy tools to speed up AU migration work
// @author       Tim Churchward
// @match        https://load.lo.unisa.edu.au/*
// @match        https://load.uo.unisa.edu.au/*
// @match        https://learn.adelaide.edu.au/*
// @match        https://myuni.adelaide.edu.au/*
// @updateURL    https://mediaproduction.adelaide.edu.au/learning-enhancement/tools/migration-toolkit/migration-toolkit.user.js
// @downloadURL  https://mediaproduction.adelaide.edu.au/learning-enhancement/tools/migration-toolkit/migration-toolkit.user.js
// @grant        GM_setValue
// @grant        GM_getValue
// @require      https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.0/papaparse.min.js
// ==/UserScript==

/**
 * AU Migration Toolkit
 * This script will fetch and execute the latest toolkit code from GitHub
 */

const AUMigrationToolkit = (function () {
    // don't run on frames or iframes
    if (window.top != window.self) {
        return;
    }
    // Private variables
    const VERSION = '0.70';
    let toolsContainer = null;
    let contentArea = null;
    let isShaded = false;
    let isDragging = false; // Flag to track dragging state

    // Local storage keys
    const STORAGE_KEY_POSITION = 'AUMigrationToolkit_position';
    const STORAGE_KEY_SHADED = 'AUMigrationToolkit_shaded';
    const STORAGE_KEY_API_KEY = 'AUMigrationToolkit_apiKey';

    // Tool registry
    const tools = [];

    // Tool categories for organization
    const categories = {
        NAVIGATION: 'Navigation',
        CONTENT: 'Content',
        ASSESSMENTS: 'Assessments'
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
            font-size: 14px;
            overflow: hidden;
        `;

        // Create header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 10px;
            cursor: move;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #836BFF;
            color: white;
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
        titleArea.addEventListener('click', function (e) {
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
        if (savedShadeState === '1') {
            toggleShade(true);
            // Width will be adjusted by the toggleShade function
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
        cancelButton.addEventListener('click', function () {
            document.body.removeChild(backdrop);
        });

        form.addEventListener('submit', function (e) {
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
        if (forceState !== undefined) {
            isShaded = forceState;
        } else {
            isShaded = !isShaded;
        }

        if (contentArea) {
            contentArea.style.display = isShaded ? 'none' : 'block';
        }

        // Adjust container width based on shaded state
        if (toolsContainer) {
            if (isShaded) {
                // Remove width style when shaded for minimal width
                toolsContainer.style.width = 'auto';
            } else {
                // Restore original width when unshaded
                toolsContainer.style.width = '300px';
            }
        }

        // Save state to localStorage
        try {
            localStorage.setItem(STORAGE_KEY_SHADED, isShaded ? '1' : '0');
        } catch (e) {
            console.warn('Could not save shaded state to localStorage');
        }
    }

    /**
     * Toggle highlighting of ADX elements
     * @param {boolean} [forceState] - Force a specific state (optional)
     */
    function toggleHighlightAdx(forceState) {
        // Remove any existing highlight style element
        const existingStyle = document.getElementById('au-migration-toolkit-highlight-style');
        if (existingStyle) {
            existingStyle.remove();
        }

        // Get the current state or use the forced state
        let highlightState;
        if (forceState !== undefined) {
            highlightState = forceState;
        } else {
            // Get from checkbox if available, otherwise toggle current state
            const checkbox = document.getElementById('highlight-adx-checkbox');
            if (checkbox) {
                highlightState = checkbox.checked;
            } else {
                // Default to false if no checkbox and no forced state
                highlightState = false;
            }
        }

        // Save state to localStorage
        try {
            localStorage.setItem('AUMigrationToolkit_highlightAdx', highlightState ? '1' : '0');
        } catch (e) {
            console.warn('Could not save highlight state to localStorage');
        }

        // Apply highlighting if enabled
        if (highlightState) {
            const styleElement = document.createElement('style');
            styleElement.id = 'au-migration-toolkit-highlight-style';
            styleElement.textContent = `
                [class*="adx"] {
                    outline: 4px dashed red !important;
                }
            `;
            document.head.appendChild(styleElement);
        }

        // Update checkbox state if it exists
        const checkbox = document.getElementById('highlight-adx-checkbox');
        if (checkbox && checkbox.checked !== highlightState) {
            checkbox.checked = highlightState;
        }
    }
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

                button.addEventListener('mouseover', function () {
                    this.style.backgroundColor = '#e9e9e9';
                });

                button.addEventListener('mouseout', function () {
                    this.style.backgroundColor = '#f8f8f8';
                });

                button.addEventListener('click', function () {
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

        // Create highlight ADX elements checkbox
        const highlightContainer = document.createElement('div');
        highlightContainer.style.cssText = `
            user-select: none;
        `;

        const highlightCheckbox = document.createElement('input');
        highlightCheckbox.type = 'checkbox';
        highlightCheckbox.id = 'highlight-adx-checkbox';
        highlightCheckbox.style.marginRight = '8px';

        // Set initial state from localStorage
        try {
            const savedState = localStorage.getItem('AUMigrationToolkit_highlightAdx');
            if (savedState) {
                highlightCheckbox.checked = savedState === '1';
                // Apply highlighting if checkbox is checked
                if (highlightCheckbox.checked) {
                    toggleHighlightAdx(true);
                }
            }
        } catch (e) {
            console.warn('Could not retrieve highlight state from localStorage');
        }

        highlightCheckbox.addEventListener('change', function () {
            toggleHighlightAdx();
        });

        const highlightLabel = document.createElement('label');
        highlightLabel.htmlFor = 'highlight-adx-checkbox';
        highlightLabel.textContent = 'Highlight ADX elements';
        highlightLabel.style.cursor = 'pointer';

        highlightContainer.appendChild(highlightCheckbox);
        highlightContainer.appendChild(highlightLabel);

        container.appendChild(highlightContainer);

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
        getPage: function () {
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
                // const envScripts = document.querySelectorAll('script:not([src])');
                // for (const script of envScripts) {
                //     if (script.textContent.includes('ENV = {') || script.textContent.includes('ENV={')) {
                //         console.log('[AU Migration Toolkit] Attempting to extract ENV from script tag');
                //         try {
                //             // This is a bit risky but might work in some cases
                //             // Extract the ENV object definition and evaluate it
                //             const envMatch = script.textContent.match(/ENV\s*=\s*({[\s\S]*?});/);
                //             if (envMatch && envMatch[1]) {
                //                 const extractedEnv = eval('(' + envMatch[1] + ')');
                //                 if (extractedEnv.WIKI_PAGE && extractedEnv.WIKI_PAGE.body) {
                //                     console.log('[AU Migration Toolkit] Successfully extracted page content from script tag');
                //                     return extractedEnv.WIKI_PAGE.body;
                //                 }
                //             }
                //         } catch (evalError) {
                //             console.error('[AU Migration Toolkit] Error evaluating ENV from script:', evalError);
                //         }
                //     }
                // }

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
        getCurrentPageInfo: function () {
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
         * @param {boolean} [options.applyDPWrapper=true] - Whether to apply DP wrapper to content
         * @returns {Promise} A promise that resolves when the page is updated
         */
        updatePage: async function (newBody, options = {}) {
            try {
                // Get the current page info
                const pageInfo = this.getCurrentPageInfo();
                if (!pageInfo) {
                    throw new Error('Could not determine current page information');
                }

                const { courseId, pageUrl } = pageInfo;

                // Apply DP wrapper to content if not disabled
                let processedBody = newBody;
                if (options.applyDPWrapper !== false) {
                    console.log('[AU Migration Toolkit] Applying DP wrapper to content');
                    // Create a temporary container to apply the wrapper
                    const tempContainer = document.createElement('div');
                    tempContainer.innerHTML = newBody;

                    // Apply the wrapper
                    const wrappedContainer = this.applyDPWrapper(tempContainer);
                    processedBody = wrappedContainer.innerHTML;
                }

                // Prepare the update data
                const updateData = {
                    body: processedBody,
                    ...options
                };
                delete updateData.applyDPWrapper; // Remove our custom option

                // Use the Canvas API to update the page
                console.log(`[AU Migration Toolkit] Updating page ${pageUrl} in course ${courseId}`);
                const result = await CanvasAPI.updatePage(courseId, pageUrl, updateData);

                console.log('[AU Migration Toolkit] Page updated successfully:', result);

                // Navigate to the edit page instead of refreshing
                // if (options.refresh !== false) {
                //     // Try to get the edit path from ENV
                //     let editPath = null;

                //     if (window.ENV && window.ENV.WIKI_PAGE_EDIT_PATH) {
                //         editPath = window.ENV.WIKI_PAGE_EDIT_PATH;
                //     } else if (typeof ENV !== 'undefined' && ENV.WIKI_PAGE_EDIT_PATH) {
                //         editPath = ENV.WIKI_PAGE_EDIT_PATH;
                //     }

                //     if (editPath) {
                //         console.log('[AU Migration Toolkit] Navigating to edit page...');
                //         setTimeout(() => window.location.href = editPath, 500);
                //     } else {
                //         // Fallback to refresh if edit path not found
                //         console.log('[AU Migration Toolkit] Edit path not found, refreshing page...');
                //         setTimeout(() => window.location.reload(), 500);
                //     }
                // }
                console.log('[AU Migration Toolkit] Refreshing page...');
                setTimeout(() => window.location.reload(), 500);

                return result;
            } catch (error) {
                console.error('[AU Migration Toolkit] Error updating page:', error);
                throw error;
            }
        },

        applyDPWrapper: function (tempContainer) {
            // First check if there's already a dp-wrapper
            const existingDpWrapper = tempContainer.querySelector('#dp-wrapper');
            if (existingDpWrapper) {
                // If it exists, unwrap its contents (remove the wrapper but keep contents)
                const parent = existingDpWrapper.parentNode;
                while (existingDpWrapper.firstChild) {
                    parent.insertBefore(existingDpWrapper.firstChild, existingDpWrapper);
                }
                parent.removeChild(existingDpWrapper);
            }
            
            // Create new wrapper
            const newDPWrapper = document.createElement('div');
            newDPWrapper.classList.add('dp-wrapper');
            newDPWrapper.id = 'dp-wrapper';
            
            // Move all of tempContainer's children into the wrapper
            while (tempContainer.firstChild) {
                newDPWrapper.appendChild(tempContainer.firstChild);
            }
            
            // Add the wrapper back to the container
            tempContainer.appendChild(newDPWrapper);
            
            return tempContainer;
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
        getBaseUrl: function () {
            const hostname = window.location.hostname;
            return `https://${hostname}/api/v1`;
        },

        /**
         * Get the API key from storage
         * @returns {string} The API key
         */
        getApiKey: function () {
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
        request: async function (endpoint, options = {}) {
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
        getPage: async function (courseId, pageUrl) {
            return await this.request(`/courses/${courseId}/pages/${pageUrl}`);
        },

        /**
         * Update a page in Canvas
         * @param {string} courseId - The course ID
         * @param {string} pageUrl - The page URL
         * @param {Object} data - The page data to update
         * @returns {Promise} A promise that resolves with the updated page data
         */
        updatePage: async function (courseId, pageUrl, data) {
            return await this.request(`/courses/${courseId}/pages/${pageUrl}`, {
                method: 'PUT',
                body: JSON.stringify({ wiki_page: data })
            });
        },

        /**
         * Get the current course ID from the URL
         * @returns {string|null} The course ID or null if not found
         */
        getCurrentCourseId: function () {
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
(function () {
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
// AUMigrationToolkit.defineTool(
//     'hello-world',
//     'Hello World',
//     'Demonstrates getting the current page content',
//     ['.*\\.adelaide\\.edu\\.au.*'], // URL patterns where this tool should appear
//     function () {
//         // Get the current page content using CanvasUtils
//         const pageContent = AUMigrationToolkit.CanvasUtils.getPage();

//         if (pageContent) {
//             console.log('Current page content:', pageContent);
//         } else {
//             console.log('No page content available. Are you on a Canvas wiki page?');
//         }
//     },
//     { category: AUMigrationToolkit.categories.CONTENT }
// );

// DP Grid Layout Fixer tool
AUMigrationToolkit.defineTool(
    'fix-dp-nav',
    'Fix DP Nav',
    'Fixes display problems with DP nav layouts and saves the changes',
    ['.*\\.adelaide\\.edu\\.au.*'],
    async function () {
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
                if (!grid.classList.contains('dp-lg-link')) {
                    grid.classList.add('dp-lg-link');
                }
                grid.querySelectorAll('*').forEach(child => {
                    child.removeAttribute('style');
                    child.style.margin = 'initial';
                });
                grid.querySelectorAll('a').forEach(a => {
                    a.classList = '';
                });
                grid.querySelectorAll('p').forEach(p => {
                    // Replace any paragraph elements with the links inside them.
                    if (!!p.querySelector('a')) {
                        let newChild = p.querySelector('a');
                        p.parentNode.replaceChild(newChild, p)
                    }
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
    { category: AUMigrationToolkit.categories.NAVIGATION }
);

// Convert KL Navigation
AUMigrationToolkit.defineTool(
    'convert-kl-nav',
    'Convert KL Nav',
    'Upgrades Cidilabs kl_navigation to a DesignPlus nav',
    ['.*\\.adelaide\\.edu\\.au.*'], // URL patterns where this tool should appear
    async function () {
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

            // Find all KL Navigation elements
            const klNavElements = tempContainer.querySelectorAll('#kl_navigation');
            if (klNavElements.length === 0) {
                alert('No KL Navigation elements found on this page.');
                return;
            }

            // Keep track of how many we convert
            let convertedCount = 0;

            // Process each KL Navigation element
            klNavElements.forEach(klNav => {
                // Get all navigation items
                const navItems = klNav.querySelectorAll('li a');
                if (navItems.length === 0) {
                    return; // Skip if no navigation items found
                }

                // Create a new DesignPlus navigation element
                const dpNav = document.createElement('nav');
                dpNav.className = 'container-fluid dp-link-grid dp-lg-link';
                dpNav.style.fontSize = '12pt';

                const ul = document.createElement('ul');
                ul.className = 'row';
                ul.style.margin = 'initial';
                dpNav.appendChild(ul);

                // Convert each navigation item
                navItems.forEach(link => {
                    // Create a new list item with DesignPlus classes
                    const li = document.createElement('li');
                    // Determine column width based on number of items
                    if (navItems.length === 3) {
                        li.className = 'col-sm-12 col-md-4 col-lg-4';
                    } else {
                        li.className = 'col-sm-12 col-md-6 col-lg-6';
                    }
                    li.style.margin = 'initial';

                    li.style.margin = 'initial';

                    // Create a new link with the same href and text, but no extra attributes
                    const a = document.createElement('a');
                    a.href = link.href;
                    a.textContent = link.textContent.trim();
                    a.style.margin = 'initial';

                    // Preserve data attributes for Canvas API integration
                    if (link.hasAttribute('data-api-endpoint')) {
                        a.setAttribute('data-api-endpoint', link.getAttribute('data-api-endpoint'));
                    }
                    if (link.hasAttribute('data-api-returntype')) {
                        a.setAttribute('data-api-returntype', link.getAttribute('data-api-returntype'));
                    }

                    li.appendChild(a);
                    ul.appendChild(li);
                });

                // Replace the old navigation with the new one
                klNav.parentNode.replaceChild(dpNav, klNav);
                convertedCount++;
            });

            if (convertedCount === 0) {
                alert('No valid KL Navigation elements could be converted.');
                return;
            }

            // Confirm before updating the page
            if (!confirm(`Found and converted ${convertedCount} KL Navigation element(s) to DesignPlus navigation. Update the page with the converted content?`)) {
                return;
            }

            // Get the updated content
            const updatedContent = tempContainer.innerHTML;

            // Update the page with the fixed content
            await AUMigrationToolkit.CanvasUtils.updatePage(updatedContent);

            // Note: The page will automatically refresh after update
        } catch (error) {
            console.error('[AU Migration Toolkit] Error converting KL Navigation:', error);
            alert(`Error converting KL Navigation: ${error.message}`);
        }
    },
    { category: AUMigrationToolkit.categories.NAVIGATION }
);

// Convert ADX Nav Table
AUMigrationToolkit.defineTool(
    'convert-adx-nav',
    'Convert ADX Nav',
    'Converts ADX Nav to a DesignPlus nav',
    ['.*\\.adelaide\\.edu\\.au.*'], // URL patterns where this tool should appear
    async function () {
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

            // Find all ADX Nav Table elements
            const adxNavElements = tempContainer.querySelectorAll('.adx-nav-table');
            if (adxNavElements.length === 0) {
                alert('No ADX Nav Table elements found on this page.');
                return;
            }

            // Keep track of how many we convert
            let convertedCount = 0;

            // Process each ADX Nav Table element
            adxNavElements.forEach(adxNav => {
                // Get all navigation items
                const navItems = adxNav.querySelectorAll('li');
                if (navItems.length === 0) {
                    return; // Skip if no navigation items found
                }

                // Create a new DesignPlus navigation element
                const dpNav = document.createElement('nav');
                dpNav.className = 'container-fluid dp-link-grid dp-lg-link';
                dpNav.style.fontSize = '12pt';

                const ul = document.createElement('ul');
                ul.className = 'row';
                ul.style.margin = 'initial';
                dpNav.appendChild(ul);

                // Convert each navigation item
                navItems.forEach(item => {
                    // Find the link in the item
                    const link = item.querySelector('a');
                    if (!link) return; // Skip if no link found

                    // Create a new list item with DesignPlus classes
                    const li = document.createElement('li');

                    // Check if the original item has the 'full' class
                    if (item.classList.contains('full')) {
                        // Full-width item
                        li.className = 'col-sm-12 col-md-12 col-lg-12';
                    } else {
                        // Determine column width based on number of items
                        if (navItems.length === 3) {
                            li.className = 'col-sm-12 col-md-4 col-lg-4';
                        } else {
                            li.className = 'col-sm-12 col-md-6 col-lg-6';
                        }
                    }
                    li.style.margin = 'initial';

                    // Create a new link with the same href and combined text content
                    const a = document.createElement('a');
                    a.href = link.href;
                    a.style.margin = 'initial';

                    // Combine text from headings and paragraphs
                    const headings = item.querySelectorAll('h1, h2, h3, h4, h5, h6');

                    let combinedText = '';

                    // Add heading text
                    headings.forEach((heading, index) => {
                        if (index > 0) combinedText += '<br>';
                        combinedText += heading.textContent.trim();
                    });

                    // Always add the link text
                    if (combinedText) combinedText += '<br>';
                    combinedText += link.textContent.trim();

                    // If we somehow have no combined text, use just the link text
                    if (!combinedText) {
                        combinedText = link.textContent.trim();
                    }

                    // Set the link's HTML content
                    a.innerHTML = combinedText;

                    // Preserve title attribute if it exists
                    if (link.hasAttribute('title')) {
                        a.setAttribute('title', link.getAttribute('title'));
                    }

                    // Preserve data attributes for Canvas API integration
                    if (link.hasAttribute('data-api-endpoint')) {
                        a.setAttribute('data-api-endpoint', link.getAttribute('data-api-endpoint'));
                    }
                    if (link.hasAttribute('data-api-returntype')) {
                        a.setAttribute('data-api-returntype', link.getAttribute('data-api-returntype'));
                    }
                    if (link.hasAttribute('data-course-type')) {
                        a.setAttribute('data-course-type', link.getAttribute('data-course-type'));
                    }
                    if (link.hasAttribute('data-published')) {
                        a.setAttribute('data-published', link.getAttribute('data-published'));
                    }

                    li.appendChild(a);
                    ul.appendChild(li);
                });

                // Replace the old navigation with the new one
                adxNav.parentNode.replaceChild(dpNav, adxNav);
                convertedCount++;
            });

            if (convertedCount === 0) {
                alert('No valid ADX Nav Table elements could be converted.');
                return;
            }

            // Confirm before updating the page
            if (!confirm(`Found and converted ${convertedCount} ADX Nav Table element(s) to DesignPlus navigation. Update the page with the converted content?`)) {
                return;
            }

            // Get the updated content
            const updatedContent = tempContainer.innerHTML;

            // Update the page with the fixed content
            await AUMigrationToolkit.CanvasUtils.updatePage(updatedContent);

            // Note: The page will automatically navigate to the edit page after update
        } catch (error) {
            console.error('[AU Migration Toolkit] Error converting ADX Nav Table:', error);
            alert(`Error converting ADX Nav Table: ${error.message}`);
        }
    },
    { category: AUMigrationToolkit.categories.NAVIGATION }
);

// Convert ADX directions
AUMigrationToolkit.defineTool(
    'convert-adx-directions',
    'Convert ADX directions',
    'Converts ADX directions into DP callouts with inline customisations',
    ['.*\\.adelaide\\.edu\\.au.*'], // URL patterns where this tool should appear
    async function () {
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

            // Find all ADX Direction elements
            const adxDirectionSelector = [
                '.adx-direction', // Generic adx-direction class
                '.adx-direction-assessment', '.adx-direction-discussion', '.adx-direction-extra',
                '.adx-direction-interactive', '.adx-direction-listen', '.adx-direction-practice',
                '.adx-direction-reading', '.adx-direction-reflect', '.adx-direction-watch',
                '.adx-direction-write', '.adx-direction-university', '.adx-direction-hsm',
                '.adx-direction-ib', '.adx-direction-investigate'
            ].join(',');

            const adxDirections = tempContainer.querySelectorAll(adxDirectionSelector);

            if (adxDirections.length === 0) {
                alert('No ADX Direction elements found on this page.');
                return;
            }

            // Keep track of how many we convert
            let convertedCount = 0;

            // Process each ADX Direction element
            adxDirections.forEach(adxDirection => {
                // Get the original content
                const originalContent = adxDirection.innerHTML;

                // Determine the type of direction based on classes
                let directionType = '';
                let calloutTitle = 'Action';
                let iconClass = 'far fa-hand-pointer';
                let borderColor = '#0073CF'; // Default DP primary color
                let backgroundColor = '#F2F9FF'; // Default DP primary light color

                // Check which direction class is present
                for (const className of adxDirection.classList) {
                    if (className.startsWith('adx-direction-')) {
                        directionType = className.replace('adx-direction-', '');
                        break;
                    }
                }

                // Set specific properties based on direction type
                switch (directionType) {
                    case 'assessment':
                        calloutTitle = 'Assessment';
                        iconClass = 'fas fa-tasks';
                        borderColor = '#3706BB'; // Purple from ADX
                        backgroundColor = '#ebe6f8';
                        break;
                    case 'discussion':
                        calloutTitle = 'Discussion';
                        iconClass = 'far fa-comments';
                        borderColor = '#9106BB'; // Purple from ADX
                        backgroundColor = '#f4e6f8';
                        break;
                    case 'extra':
                        calloutTitle = 'Extra Information';
                        iconClass = 'fas fa-info-circle';
                        borderColor = '#BB068B'; // Pink from ADX
                        backgroundColor = '#f8e6f3';
                        break;
                    case 'interactive':
                        calloutTitle = 'Interactive Activity';
                        iconClass = 'fas fa-mouse-pointer';
                        borderColor = '#BB3706'; // Orange from ADX
                        backgroundColor = '#f8ebe6';
                        break;
                    case 'listen':
                        calloutTitle = 'Listen';
                        iconClass = 'fas fa-headphones';
                        borderColor = '#046E8B'; // Blue from ADX
                        backgroundColor = '#e6f1f3';
                        break;
                    case 'practice':
                        calloutTitle = 'Practice Activity';
                        iconClass = 'fas fa-pencil-alt';
                        borderColor = '#96BB06'; // Green from ADX
                        backgroundColor = '#f5f8e6';
                        break;
                    case 'reading':
                        calloutTitle = 'Reading';
                        iconClass = 'fas fa-book-open';
                        borderColor = '#3EBB06'; // Green from ADX
                        backgroundColor = '#ecf8e6';
                        break;
                    case 'reflect':
                        calloutTitle = 'Reflection';
                        iconClass = 'far fa-lightbulb';
                        borderColor = '#058869'; // Teal from ADX
                        backgroundColor = '#e6f3f0';
                        break;
                    case 'watch':
                        calloutTitle = 'Watch';
                        iconClass = 'fas fa-video';
                        borderColor = '#046E8B'; // Blue from ADX
                        backgroundColor = '#e6f1f3';
                        break;
                    case 'write':
                        calloutTitle = 'Writing Activity';
                        iconClass = 'fas fa-pencil-alt';
                        borderColor = '#052A8A'; // Dark Blue from ADX
                        backgroundColor = '#e6eaf3';
                        break;
                    case 'university':
                        calloutTitle = 'University';
                        iconClass = 'fas fa-university';
                        borderColor = '#102535'; // Dark Blue from ADX
                        backgroundColor = '#e7e9eb';
                        break;
                    case 'hsm':
                        calloutTitle = 'HSM';
                        iconClass = 'fas fa-heartbeat';
                        borderColor = '#4bcaf1'; // Light Blue from ADX
                        backgroundColor = '#edfafe';
                        break;
                    case 'ib':
                        calloutTitle = 'IB';
                        iconClass = 'fas fa-globe';
                        borderColor = '#fb6f26'; // Orange from ADX
                        backgroundColor = '#fff1e9';
                        break;
                    case 'investigate':
                        calloutTitle = 'Investigate';
                        iconClass = 'fas fa-globe';
                        borderColor = '#BB9106'; // Yellow from ADX
                        backgroundColor = '#f8f4e6';
                        break;
                    default:
                        calloutTitle = 'Action';
                        iconClass = 'far fa-hand-pointer';
                        borderColor = 'unset';
                        backgroundColor = 'unset';
                }

                // Create a new DP Callout element
                const dpCallout = document.createElement('div');
                dpCallout.className = 'dp-callout dp-callout-placeholder card dp-callout-position-default dp-callout-color-dp-primary dp-out-primary dp-border-dir-all dp-callout-type-info dp-action-box dp-action migrated-content';

                console.log(`Converting ${directionType || 'generic'} ADX direction to DP callout`)

                // Apply styles with !important using cssText, but only if it's not a generic adx-direction
                if (directionType) {
                    dpCallout.style.cssText = `border-left: 10px solid ${borderColor} !important; background-color: ${backgroundColor} !important;`;
                }

                // Create the callout HTML structure
                dpCallout.innerHTML = `
                    <div class="dp-callout-side-emphasis"><i class="dp-icon ${iconClass} dp-default-icon">​</i></div>
                    <div class="card-body">
                        <h3 class="card-title">${calloutTitle}</h3>
                        <div class="card-text dp-border-dir-none">${originalContent}</div>
                    </div>
                `;

                // Replace the original element with the new callout
                adxDirection.parentNode.replaceChild(dpCallout, adxDirection);
                convertedCount++;
            });

            if (convertedCount === 0) {
                alert('No valid ADX Direction elements could be converted.');
                return;
            }

            // Confirm before updating the page
            if (!confirm(`Found and converted ${convertedCount} ADX Direction element(s) to DesignPlus Callouts. Update the page with the converted content?`)) {
                return;
            }

            // Get the updated content
            const updatedContent = tempContainer.innerHTML;

            // Update the page with the fixed content
            await AUMigrationToolkit.CanvasUtils.updatePage(updatedContent);

            // Note: The page will automatically navigate to the edit page after update
        } catch (error) {
            console.error('[AU Migration Toolkit] Error converting ADX Directions:', error);
            alert(`Error converting ADX Directions: ${error.message}`);
        }
    },
    { category: AUMigrationToolkit.categories.CONTENT }
);

// UniSA Rubric downloader
AUMigrationToolkit.defineTool(
    'download-rubric-csv',
    'Download Rubric CSV',
    'Converts UniSA rubrics to CSV format and downloads them.',
    ['.*\\.load\\.lo\\.unisa\\.edu\\.au.*', '.*\\.unisa\\.edu\\.au.*'], // URL patterns where this tool should appear
    async function () {
        // Tool implementation goes here
        console.log('Rubric CSV download tool started!');

        // Function to normalize text content (remove line breaks and extra spaces)
        function normalizeText(text) {
            if (!text) return '';
            // Replace line breaks and multiple spaces with a single space
            return text.replace(/\s+/g, ' ').trim();
        }

        // Generate and download the CSV immediately when the tool is clicked
        console.log('Generating and downloading CSV');
        const rubricName = normalizeText(document.querySelector('.page-header-headings h1')?.textContent || 'Rubric');
        console.log('Rubric name:', rubricName);

        const rubricTable = document.getElementById('rubric-criteria');

        if (!rubricTable) {
            console.log('Rubric table not found');
            alert('Rubric table not found! Please make sure you are on a rubric page.');
            return;
        }

        // Get all criterion rows
        const criterionRows = rubricTable.querySelectorAll('tr.criterion');
        console.log('Number of criterion rows found:', criterionRows.length);

        if (criterionRows.length === 0) {
            console.log('No criterion rows found');
            alert('No criterion rows found in the rubric!');
            return;
        }

        // Prepare CSV data
        const csvData = [];

        criterionRows.forEach((row, index) => {
            const criterionNumber = index + 1;
            const criterionName = `Criterion ${criterionNumber}`;
            const criterionDescription = normalizeText(row.querySelector('.description')?.textContent || '');
            console.log(`Processing criterion ${criterionNumber}:`, criterionDescription);

            // Get all rating cells in this criterion row
            const ratingCells = row.querySelectorAll('td.level');
            console.log(`Number of rating cells for criterion ${criterionNumber}:`, ratingCells.length);

            // Prepare the row data
            const rowData = {
                'Rubric Name': rubricName,
                'Criteria Name': criterionName,
                'Criteria Description': criterionDescription,
                'Criteria Enable Range': 'false'
            };

            // Add rating data
            ratingCells.forEach((cell, ratingIndex) => {
                const ratingName = normalizeText(cell.querySelector('.score')?.textContent || '(Rating name not found)');
                const ratingDescription = normalizeText(cell.querySelector('.definition')?.textContent || '(Rating description)');
                const ratingPoints = normalizeText(cell.querySelector('.scorevalue')?.textContent || '0');

                rowData[`Rating Name${ratingIndex + 1}`] = ratingName;
                rowData[`Rating Description${ratingIndex + 1}`] = ratingDescription;
                rowData[`Rating Points${ratingIndex + 1}`] = ratingPoints;

                console.log(`Rating ${ratingIndex + 1} for criterion ${criterionNumber}:`, ratingDescription, ratingPoints);
            });

            csvData.push(rowData);
        });

        console.log('CSV data prepared:', csvData);

        // Convert to CSV using Papa Parse
        const csv = Papa.unparse(csvData);
        console.log('CSV generated');

        // Create and trigger download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${rubricName.replace(/\s+/g, '_')}_rubric.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log('CSV download triggered');
    },
    { category: AUMigrationToolkit.categories.ASSESSMENTS }
);

// Convert ADX Cues
AUMigrationToolkit.defineTool(
    'convert-adx-cues',
    'Convert ADX cues',
    'Converts ADX cues into DP callouts with inline customisations',
    ['.*\\.adelaide\\.edu\\.au.*'], // URL patterns where this tool should appear
    async function () {
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

            // Find all ADX Cue elements
            const adxCueSelector = [
                '.adx-cue',
                '.adx-cue-left',
                '.adx-cue-bordered',
                '.adx-cue-note',
                '.adx-cue-case-study',
                '.adx-cue-example',
                '.adx-cue-definition',
                '.adx-cue-phil-toolkit',
                '.adx-cue-notification',
                '.adx-cue-attention',
                '.adx-cue-content-warning',
                '.adx-cue-summary',
                '.adx-cue-reference'
            ].join(',');

            const adxCues = tempContainer.querySelectorAll(adxCueSelector);

            if (adxCues.length === 0) {
                alert('No ADX Cue elements found on this page.');
                return;
            }

            // Keep track of how many we convert
            let convertedCount = 0;

            // Process each ADX Cue element
            adxCues.forEach(adxCue => {
                // Get the original content
                const originalContent = adxCue.innerHTML;

                // Create a temporary div to hold our HTML
                const tempDiv = document.createElement('div');

                // Check if this is a special type of cue
                let isSpecialCue = false;
                let htmlTemplate = '';

                // Check for note cue
                if (adxCue.classList.contains('adx-cue-note')) {
                    console.log('Converting ADX note cue to DP callout with Note title');
                    isSpecialCue = true;
                    htmlTemplate = `
                        <div class="dp-callout dp-callout-placeholder card dp-callout-position-default dp-callout-type-default dp-callout-color-dp-primary migrated-content">
                            <div class="card-body">
                                <h3 class="card-title">Note</h3>
                                <div class="card-text">${originalContent}</div>
                            </div>
                        </div>
                    `;
                }

                // Check for case study cue
                if (adxCue.classList.contains('adx-cue-case-study')) {
                    console.log('Converting ADX case study cue to DP callout with Case Study title');
                    isSpecialCue = true;
                    htmlTemplate = `
                        <div class="dp-callout dp-callout-placeholder card dp-callout-position-default dp-callout-type-default dp-callout-color-dp-primary migrated-content">
                            <div class="card-body">
                                <h3 class="card-title">Case Study</h3>
                                <div class="card-text">${originalContent}</div>
                            </div>
                        </div>
                    `;
                }

                // Check for example cue
                if (adxCue.classList.contains('adx-cue-example')) {
                    console.log('Converting ADX example cue to DP callout with Example title');
                    isSpecialCue = true;
                    htmlTemplate = `
                        <div class="dp-callout dp-callout-placeholder card dp-callout-position-default dp-callout-color-dp-primary dp-callout-type-default dp-example-box migrated-content">
                            <div class="card-body">
                                <h3 class="card-title">Example</h3>
                                <div class="card-text">${originalContent}</div>
                            </div>
                        </div>
                    `;
                }

                // Check for defintion cue
                if (adxCue.classList.contains('adx-cue-definition')) {
                    console.log('Converting ADX example cue to DP callout with Definition title');
                    isSpecialCue = true;
                    htmlTemplate = `
                        <div class="dp-callout dp-callout-placeholder card dp-callout-position-default dp-callout-type-default dp-callout-color-dp-primary migrated-content" style="background: #ECF7F3 !important">
                            <div class="card-body">
                                <h3 class="card-title">Definition</h3>
                                <div class="card-text">${originalContent}</div>
                            </div>
                        </div>
                    `;
                }

                // Check for philosphical toolkit cue
                if (adxCue.classList.contains('adx-cue-phil-toolkit')) {
                    console.log('Converting ADX example cue to DP callout with philosophical toolkit title');
                    isSpecialCue = true;
                    htmlTemplate = `
                        <div class="dp-callout dp-callout-placeholder card dp-callout-position-default dp-callout-type-default dp-callout-color-dp-primary migrated-content" style="background: #F9F4F9 !important">
                            <div class="card-body">
                                <h3 class="card-title">Philosophical Toolkit</h3>
                                <div class="card-text">${originalContent}</div>
                            </div>
                        </div>
                    `;
                }

                // Check for notification cue
                if (adxCue.classList.contains('adx-cue-notification')) {
                    console.log('Converting ADX Notification cue to DP callout with Notification title');
                    isSpecialCue = true;
                    htmlTemplate = `
                        <div class="dp-callout dp-callout-placeholder card dp-callout-position-default dp-callout-type-default dp-callout-color-dp-primary migrated-content" style="background: #E6EFF5 !important">
                            <div class="card-body">
                                <h3 class="card-title">Notification</h3>
                                <div class="card-text">${originalContent}</div>
                            </div>
                        </div>
                    `;
                }

                // Check for attention cue
                if (adxCue.classList.contains('adx-cue-attention')) {
                    console.log('Converting ADX attention cue to DP callout with attention title');
                    isSpecialCue = true;
                    htmlTemplate = `
                        <div class="dp-callout dp-callout-placeholder card dp-callout-position-default dp-callout-color-dp-primary dp-callout-type-info dp-alert-box migrated-content">
                            <div class="dp-callout-side-emphasis"><i class="dp-icon fas fa-info-circle dp-default-icon">​</i></div>
                            <div class="card-body">
                                <h3 class="card-title">Attention</h3>
                                <div class="card-text">${originalContent}</div>
                            </div>
                        </div>
                    `;
                }

                // Check for content warning cue
                if (adxCue.classList.contains('adx-cue-content-warning')) {
                    console.log('Converting ADX content-warning cue to DP callout with content warning title');
                    isSpecialCue = true;
                    htmlTemplate = `
                        <div class="dp-callout dp-callout-placeholder card dp-callout-position-default dp-callout-color-dp-primary dp-callout-type-info dp-content-warning migrated-content">
                            <div class="dp-callout-side-emphasis"><i class="dp-icon fas fa-exclamation-triangle">​</i></div>
                            <div class="card-body">
                                <h3 class="card-title">Content Warning</h3>
                                <div class="card-text">${originalContent}</div>
                            </div>
                        </div>                        
                    `;
                }

                // Check for summary cue
                if (adxCue.classList.contains('adx-cue-summary')) {
                    console.log('Converting ADX summary cue to DP callout with summary title');
                    isSpecialCue = true;
                    htmlTemplate = `
                        <div class="dp-callout dp-callout-placeholder card dp-callout-position-default dp-callout-color-dp-primary dp-callout-type-default dp-summary-box migrated-content">
                            <div class="card-body">
                                <h3 class="card-title">Summary</h3>
                                <div class="card-text">${originalContent}</div>
                            </div>
                        </div>                     
                    `;
                }

                // Check for reference cue
                if (adxCue.classList.contains('adx-cue-reference')) {
                    console.log('Converting ADX reference cue to DP callout with References title');
                    isSpecialCue = true;
                    htmlTemplate = `
                        <div class="dp-callout dp-callout-placeholder card dp-callout-position-default dp-callout-type-default dp-callout-color-dp-primary dp-references-box">
                            <div class="card-body">
                                <h3 class="card-title">References</h3>
                                <div class="card-text">${originalContent}</div>
                            </div>
                        </div>                  
                    `;
                }

                // If not a special cue, use the default template
                if (!isSpecialCue) {
                    console.log(`Converting standard ADX cue to DP callout`);
                    htmlTemplate = `
                        <div class="dp-callout dp-callout-placeholder card dp-callout-position-default dp-callout-type-default dp-callout-color-dp-primary migrated-content">
                            <div class="card-body">
                                <p class="card-text">${originalContent}</p>
                            </div>
                        </div>
                    `;
                }

                // Set the HTML content of the temp div
                tempDiv.innerHTML = htmlTemplate;

                // Get the first child (our callout div)
                const dpCallout = tempDiv.firstElementChild;

                // Replace the original element with the new callout
                adxCue.parentNode.replaceChild(dpCallout, adxCue);
                convertedCount++;
            });

            if (convertedCount === 0) {
                alert('No valid ADX Cue elements could be converted.');
                return;
            }

            // Confirm before updating the page
            if (!confirm(`Found and converted ${convertedCount} ADX Cue element(s) to DesignPlus Callouts. Update the page with the converted content?`)) {
                return;
            }

            // Get the updated content
            const updatedContent = tempContainer.innerHTML;

            // Update the page with the fixed content
            await AUMigrationToolkit.CanvasUtils.updatePage(updatedContent);

            // Note: The page will automatically navigate to the edit page after update
        } catch (error) {
            console.error('[AU Migration Toolkit] Error converting ADX Cues:', error);
            alert(`Error converting ADX Cues: ${error.message}`);
        }
    },
    { category: AUMigrationToolkit.categories.CONTENT }
);

// Convert ADX Direction Cues
AUMigrationToolkit.defineTool(
    'convert-adx-direction-cues',
    'Convert ADX direction cues',
    'Converts ADX direction cues into DP callouts with inline customisations',
    ['.*\\.adelaide\\.edu\\.au.*'], // URL patterns where this tool should appear
    async function () {
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

            // Find all ADX Cue elements
            const adxDirectionCueSelector = [
                '.adx-direction-cue-assessment',
                '.adx-direction-cue-discussion',
                '.adx-direction-cue-extra',
                '.adx-direction-cue-interactive',
                '.adx-direction-cue-investigate',
                '.adx-direction-cue-practice',
                '.adx-direction-cue-reading',
                '.adx-direction-cue-reflect',
                '.adx-direction-cue-watch',
                '.adx-direction-cue-write'
            ].join(',');

            const adxDirectionCues = tempContainer.querySelectorAll(adxDirectionCueSelector);

            if (adxDirectionCues.length === 0) {
                alert('No ADX Direction Cue elements found on this page.');
                return;
            }

            // Keep track of how many we convert
            let convertedCount = 0;

            // Process each ADX Direction Cue element
            adxDirectionCues.forEach(adxCue => {
                // Get the original content
                const originalContent = adxCue.innerHTML;

                // Create a temporary div to hold our HTML
                const tempDiv = document.createElement('div');

                // Determine the direction type and set appropriate color and title
                let borderColor = '#000000';
                let title = 'Action';

                if (adxCue.classList.contains('adx-direction-cue-assessment')) {
                    console.log('Converting ADX assessment direction cue');
                    borderColor = '#3706BB';
                    title = 'Assessment';
                } else if (adxCue.classList.contains('adx-direction-cue-discussion')) {
                    console.log('Converting ADX discussion direction cue');
                    borderColor = '#9106BB';
                    title = 'Discussion';
                } else if (adxCue.classList.contains('adx-direction-cue-extra')) {
                    console.log('Converting ADX extra direction cue');
                    borderColor = '#BB068B';
                    title = 'Extra';
                } else if (adxCue.classList.contains('adx-direction-cue-interactive')) {
                    console.log('Converting ADX interactive direction cue');
                    borderColor = '#BB3706';
                    title = 'Interactive';
                } else if (adxCue.classList.contains('adx-direction-cue-investigate')) {
                    console.log('Converting ADX investigate direction cue');
                    borderColor = '#BB9106';
                    title = 'Investigate';
                } else if (adxCue.classList.contains('adx-direction-cue-practice')) {
                    console.log('Converting ADX practice direction cue');
                    borderColor = '#96BB06';
                    title = 'Practice';
                } else if (adxCue.classList.contains('adx-direction-cue-reading')) {
                    console.log('Converting ADX reading direction cue');
                    borderColor = '#3EBB06';
                    title = 'Reading';
                } else if (adxCue.classList.contains('adx-direction-cue-reflect')) {
                    console.log('Converting ADX reflect direction cue');
                    borderColor = '#058869';
                    title = 'Reflect';
                } else if (adxCue.classList.contains('adx-direction-cue-watch')) {
                    console.log('Converting ADX watch direction cue');
                    borderColor = '#046E8B';
                    title = 'Watch';
                } else if (adxCue.classList.contains('adx-direction-cue-write')) {
                    console.log('Converting ADX write direction cue');
                    borderColor = '#052A8A';
                    title = 'Write';
                } else {
                    console.log('Converting generic ADX direction cue');
                }

                // Create the HTML template with the specified border color and title
                const htmlTemplate = `
                    <div class="dp-callout dp-callout-placeholder card dp-callout-position-default dp-callout-type-default dp-callout-color-dp-primary migrated-content" style="border-left: solid 10px ${borderColor} !important;">
                        <div class="card-body">
                            <h3 class="card-title">${title}</h3>
                            <div class="card-text">${originalContent}</div>
                        </div>
                    </div>
                `;

                // Set the HTML content of the temp div
                tempDiv.innerHTML = htmlTemplate;

                // Get the first child (our callout div)
                const dpCallout = tempDiv.firstElementChild;

                // Replace the original element with the new callout
                adxCue.parentNode.replaceChild(dpCallout, adxCue);
                convertedCount++;
            });

            if (convertedCount === 0) {
                alert('No valid ADX Cue elements could be converted.');
                return;
            }

            // Confirm before updating the page
            if (!confirm(`Found and converted ${convertedCount} ADX Cue element(s) to DesignPlus Callouts. Update the page with the converted content?`)) {
                return;
            }

            // Get the updated content
            const updatedContent = tempContainer.innerHTML;

            // Update the page with the fixed content
            await AUMigrationToolkit.CanvasUtils.updatePage(updatedContent);

            // Note: The page will automatically navigate to the edit page after update
        } catch (error) {
            console.error('[AU Migration Toolkit] Error converting ADX Direction Cues:', error);
            alert(`Error converting ADX Direction Cues: ${error.message}`);
        }
    },
    { category: AUMigrationToolkit.categories.CONTENT }
);

// Convert ADX Buttons
AUMigrationToolkit.defineTool(
    'convert-adx-buttons',
    'Convert ADX buttons',
    'Converts ADX buttons into DP buttons',
    ['.*\\.adelaide\\.edu\\.au.*'], // URL patterns where this tool should appear
    async function () {
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

            // Find all ADX button elements
            const adxButtonSelector = [
                '.adx-button',
                '.adx-button.brand-red',
                '.adx-button.primary',
                '.adx-button.accent',
                '.adx-button.complimentary',
                '.adx-button.brand-midblue'
            ].join(',');

            const adxButtons = tempContainer.querySelectorAll(adxButtonSelector);

            if (adxButtons.length === 0) {
                alert('No ADX button elements found on this page.');
                return;
            }

            // Keep track of how many we convert
            let convertedCount = 0;

            adxButtons.forEach(adxButton => {
                // Get the original content
                const originalContent = adxButton.innerHTML;

                // Get the original href if it exists
                const originalHref = adxButton.getAttribute('href') || '#';

                // Create a temporary div to hold our HTML
                const tempDiv = document.createElement('div');

                // Determine which type of button it is
                let htmlTemplate = '';

                if (adxButton.classList.contains('brand-red')) {
                    console.log('Converting ADX brand-red button');
                    htmlTemplate = `<a class="btn cph-bg-danger btn-outline-danger" href="${originalHref}">${originalContent}</a>`;
                } else if (adxButton.classList.contains('primary')) {
                    console.log('Converting ADX primary button');
                    htmlTemplate = `<a class="btn btn-outline-primary" href="${originalHref}">${originalContent}</a>`;
                } else if (adxButton.classList.contains('accent')) {
                    console.log('Converting ADX accent button');
                    htmlTemplate = `<a class="btn btn-outline-success cph-bg-success" href="${originalHref}">${originalContent}</a>`;
                } else if (adxButton.classList.contains('complimentary')) {
                    console.log('Converting ADX complimentary button');
                    htmlTemplate = `<a class="btn btn-outline-dp-accent cph-bg-dp-accent" href="${originalHref}">${originalContent}</a>`;
                } else if (adxButton.classList.contains('brand-midblue')) {
                    console.log('Converting ADX brand-midblue button');
                    htmlTemplate = `<a class="btn btn-outline-dp-primary cph-bg-dp-primary" href="${originalHref}">${originalContent}</a>`;
                } else {
                    // Default case for plain .adx-button
                    console.log('Converting standard ADX button');
                    htmlTemplate = `<a class="btn btn-outline-primary" href="${originalHref}">${originalContent}</a>`;
                }

                // Set the HTML content of the temp div
                tempDiv.innerHTML = htmlTemplate;

                // Get the first child (our button)
                const dpButton = tempDiv.firstElementChild;

                // Replace the original element with the new button
                adxButton.parentNode.replaceChild(dpButton, adxButton);
                convertedCount++;
            });

            if (convertedCount === 0) {
                alert('No valid ADX button elements could be converted.');
                return;
            }

            // Confirm before updating the page
            if (!confirm(`Found and converted ${convertedCount} ADX button element(s) to DesignPlus buttons. Update the page with the converted content?`)) {
                return;
            }

            // Get the updated content
            const updatedContent = tempContainer.innerHTML;

            // Update the page with the fixed content
            await AUMigrationToolkit.CanvasUtils.updatePage(updatedContent);

            // Note: The page will automatically navigate to the edit page after update
        } catch (error) {
            console.error('[AU Migration Toolkit] Error converting ADX Tables:', error);
            alert(`Error converting ADX Tables: ${error.message}`);
        }
    },
    { category: AUMigrationToolkit.categories.CONTENT }
);

// Convert ADX Tables
AUMigrationToolkit.defineTool(
    'convert-adx-tables',
    'Convert ADX tables',
    'Converts ADX tables into DP tables',
    ['.*\\.adelaide\\.edu\\.au.*'], // URL patterns where this tool should appear
    async function () {
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

            // Find all ADX table elements
            const adxTableSelector = 'table.adx, table.adx.simple';
            const adxTables = tempContainer.querySelectorAll(adxTableSelector);

            if (adxTables.length === 0) {
                alert('No ADX table elements found on this page.');
                return;
            }

            // Keep track of how many we convert
            let convertedCount = 0;

            adxTables.forEach(adxTable => {
                console.log('Converting ADX table');

                // Remove the adx and simple classes and add aux class
                adxTable.classList.remove('adx', 'simple');
                adxTable.classList.add('aux');

                convertedCount++;
            });

            if (convertedCount === 0) {
                alert('No valid ADX table elements could be converted.');
                return;
            }

            // Confirm before updating the page
            if (!confirm(`Found and converted ${convertedCount} ADX table element(s) to DP tables. Update the page with the converted content?`)) {
                return;
            }

            // Get the updated content
            const updatedContent = tempContainer.innerHTML;

            // Update the page with the fixed content
            await AUMigrationToolkit.CanvasUtils.updatePage(updatedContent);

            // Note: The page will automatically navigate to the edit page after update
        } catch (error) {
            console.error('[AU Migration Toolkit] Error converting ADX Tables:', error);
            alert(`Error converting ADX Tables: ${error.message}`);
        }
    },
    { category: AUMigrationToolkit.categories.CONTENT }
);