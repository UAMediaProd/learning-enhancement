/**
 * AU Migration Toolkit
 * A collection of tools to assist with content migration between LMS platforms
*/

console.log('[AU Migration Toolkit] Toolkit script loaded')

// Main namespace to avoid conflicts
const AUMigrationToolkit = (function() {
    // Private variables
    const VERSION = '0.1';
    let toolsContainer = null;
    
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
            border-bottom: 1px solid #ddd;
            cursor: move;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        
        const title = document.createElement('div');
        title.textContent = 'AU Migration Toolkit';
        title.style.fontWeight = 'bold';
        
        const version = document.createElement('div');
        version.textContent = `v${VERSION}`;
        version.style.fontSize = '12px';
        version.style.color = '#666';
        
        header.appendChild(title);
        header.appendChild(version);
        
        // Create content area
        const content = document.createElement('div');
        content.style.cssText = `
            padding: 10px;
            max-height: 400px;
            overflow-y: auto;
        `;
        
        // Add elements to container
        toolsContainer.appendChild(header);
        toolsContainer.appendChild(content);
        
        // Add to document
        document.body.appendChild(toolsContainer);
        
        // Make draggable
        makeDraggable(toolsContainer, header);
        
        return content;
    }
    
    /**
     * Make an element draggable
     * @param {HTMLElement} element - The element to make draggable
     * @param {HTMLElement} handle - The drag handle element
     */
    function makeDraggable(element, handle) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        
        handle.onmousedown = dragMouseDown;
        
        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            
            // Get mouse position at startup
            pos3 = e.clientX;
            pos4 = e.clientY;
            
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }
        
        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            
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
        }
    }
    
    /**
     * Render available tools in the UI
     * @param {HTMLElement} container - The container to render tools in
     */
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
        
        // Register built-in tools
        registerBuiltInTools();
        
        // Initialize UI
        initUI();
        
        console.log('[AU Migration Toolkit] Initialized');
    }
    
    /**
     * Register built-in tools
     */
    function registerBuiltInTools() {
        // Example tool: Fix DP Grid Layout
        defineTool(
            'fix-dp-grid',
            'Fix DP Grid Layout',
            'Fixes display problems with DP grid layouts',
            ['.*\\.unisa\\.edu\\.au.*', '.*\\.adelaide\\.edu\\.au.*'],
            function() {
                const dpGrids = document.querySelectorAll('.dp-link-grid');
                if (dpGrids.length === 0) {
                    alert('No DP grids found on this page.');
                    return;
                }
                
                dpGrids.forEach(grid => {
                    grid.querySelectorAll('*').forEach(child => {
                        child.removeAttribute('style');
                        child.style.margin = 'initial';
                    });
                    grid.style.fontSize = '0.9rem';
                });
                
                alert(`Fixed ${dpGrids.length} DP grid(s) on this page.`);
            },
            { category: categories.LAYOUT }
        );
        
        // Add more built-in tools here
    }
    
    // Public API
    return {
        init,
        registerTool,
        defineTool,
        categories,
        VERSION
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


// Ugly grid fixer
// const dpGrids = document.querySelectorAll('.dp-link-grid');
// dpGrids.forEach(grid => {
//     grid.querySelectorAll('*').forEach(child => {
//         child.removeAttribute('style');
//         child.style.margin = 'initial';
//     });
//     grid.style.fontSize = '0.9rem'
// });