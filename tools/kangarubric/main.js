// Add smooth scrolling behavior to the document
document.documentElement.style.scrollBehavior = 'smooth';

// Add click handlers for FAQ accordions
document.querySelectorAll('.faq-header').forEach(header => {
    header.addEventListener('click', () => {
        header.parentElement.classList.toggle('expanded');

        // If expanding, scroll the FAQ item into view with some padding at the top
        if (header.parentElement.classList.contains('expanded')) {
            setTimeout(() => {
                const headerRect = header.getBoundingClientRect();
                const scrollTop = window.pageYOffset + headerRect.top - 20; // 20px padding
                window.scrollTo({ top: scrollTop });
            }, 10); // Small delay to ensure proper scrolling after expansion
        }
    });
});

// Debug mode
function log(message) {
    console.log(`${new Date().toLocaleTimeString()} - ${message}`);
}

// Helper function to get all text content from a cell
function getAllTextContent(cell) {
    return Array.from(cell.getElementsByTagName('p'))
        .map(p => p.textContent.trim())
        .join(' ');
}

// Process HTML content into a single paragraph with preserved formatting
function processHtmlContent(element) {
    const p = document.createElement('p');
    let isFirstBlock = true;

    // Helper function to process lists recursively
    function processListItems(listElement, level = 0) {
        const items = listElement.children;
        const results = [];

        Array.from(items).forEach((item, index) => {
            // Get the item's direct text content (excluding nested lists)
            let itemText = '';
            Array.from(item.childNodes).forEach(node => {
                if (node.nodeType === Node.TEXT_NODE) {
                    itemText += node.textContent;
                } else if (node.tagName !== 'UL' && node.tagName !== 'OL') {
                    itemText += node.textContent;
                }
            });

            // Create the indentation
            const indent = ' '.repeat(4 * level);
            const marker = listElement.tagName === 'UL' ? '- ' : `${index + 1}. `;
            results.push(indent + marker + itemText);

            // Process any nested lists
            const nestedLists = item.querySelectorAll(':scope > ul, :scope > ol');
            nestedLists.forEach(nestedList => {
                const nestedItems = processListItems(nestedList, level + 1);
                results.push(...nestedItems);
            });
        });

        return results;
    }

    // Process each block element (p, ul, ol) in order
    const blocks = element.children;
    Array.from(blocks).forEach(block => {
        // If not the first block, add a line break
        if (!isFirstBlock) {
            p.appendChild(document.createElement('br'));
            p.appendChild(document.createElement('br'));
        }
        isFirstBlock = false;

        if (block.tagName === 'UL' || block.tagName === 'OL') {
            // Process list items recursively
            const listLines = processListItems(block);
            listLines.forEach((line, index) => {
                if (index > 0) p.appendChild(document.createElement('br'));
                p.appendChild(document.createTextNode(line));
            });
        } else {
            // Process paragraph content
            const content = block.innerHTML;
            const temp = document.createElement('div');
            temp.innerHTML = content;

            // First, collect all text and br nodes
            const nodes = [];
            const walker = document.createTreeWalker(
                temp,
                NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
                {
                    acceptNode: function (node) {
                        if (node.nodeType === Node.TEXT_NODE) return NodeFilter.FILTER_ACCEPT;
                        if (node.tagName === 'BR') return NodeFilter.FILTER_ACCEPT;
                        return NodeFilter.FILTER_SKIP;
                    }
                }
            );

            let node;
            while (node = walker.nextNode()) {
                nodes.push(node);
            }

            // Then process them as a group
            if (nodes.length > 0) {
                let text = '';
                nodes.forEach(node => {
                    if (node.nodeType === Node.TEXT_NODE) {
                        text += node.textContent;
                    } else if (node.tagName === 'BR') {
                        text += '\n';
                    }
                });

                const lines = text.split('\n');
                lines.forEach((line, index) => {
                    if (index > 0) {
                        p.appendChild(document.createElement('br'));
                        p.appendChild(document.createElement('br'));
                    }
                    p.appendChild(document.createTextNode(line));
                });
            }
        }
    });

    // Trim the start and end without losing line breaks
    const firstChild = p.firstChild;
    const lastChild = p.lastChild;

    // Trim start
    if (firstChild && firstChild.nodeType === Node.TEXT_NODE) {
        firstChild.textContent = firstChild.textContent.trimStart();
    }

    // Trim end
    if (lastChild && lastChild.nodeType === Node.TEXT_NODE) {
        lastChild.textContent = lastChild.textContent.trimEnd();
    }

    return p;
}

// Helper function to process a criterion cell
function processCriterionCell(cell, criterionIndex) {
    // Create container
    const container = document.createElement('div');
    container.className = 'criterion-cell';

    // Create header (name and score)
    const header = document.createElement('div');
    header.className = 'criterion-header';

    // 1. Set criterion name
    const nameSpan = document.createElement('span');
    nameSpan.className = 'criterion-name';
    nameSpan.contentEditable = 'true';
    nameSpan.textContent = `Criterion ${criterionIndex}`;
    header.appendChild(nameSpan);

    // 2. Find maximum score
    let maxScore = null;
    let scoreText = '';
    const scoreMatches = getAllTextContent(cell).match(/\(?\d{1,3}%\)?/g);

    if (!scoreMatches) {
        scoreText = '(NotFound%)';
    } else {
        // Always use the first percentage found
        maxScore = parseInt(scoreMatches[0].match(/\d+/)[0]);
        scoreText = `(${maxScore}%)`;
    }

    const scoreSpan = document.createElement('span');
    scoreSpan.className = maxScore ? 'criterion-score' : 'error-text';
    scoreSpan.contentEditable = 'true';
    scoreSpan.textContent = scoreText;
    header.appendChild(scoreSpan);
    container.appendChild(header);

    // Get all paragraphs for processing
    const paragraphs = Array.from(cell.getElementsByTagName('p'));
    let textContent = '';

    // 3. First check for potentially ambiguous CO references
    const coRegex = /(?:\((?:COs?\W*\s*\d+(?:\s*[,;&]\s*(?:COs?\W*\s*)?\d+)*)\))|(?:COs?\W*\s*\d+(?:\s*[,;&]\s*(?:COs?\W*\s*)?\d+)*)/i;
    const coMatch = getAllTextContent(cell).match(coRegex);
    if (coMatch && !hasShownCOWarning) {
        const confirmed = confirm('Warning: Found "CO" references in your rubric (e.g. "' + coMatch[0] + '"). ' +
            'These could be Course Outcomes or chemical compounds (like CO2). ' +
            'To avoid ambiguity, these will not be processed. ' +
            'Please use "CLO" instead of "CO" if you meant Course Learning Outcomes.\n\n' +
            'Click OK to continue processing the rest of the rubric.');
        if (!confirmed) {
            return;
        }
        hasShownCOWarning = true; // Mark that we've shown the warning
    }

    // 4. Find CLOs
    let cloText = '';
    // Match either a full group of CLOs in brackets, or individual CLO references
    // Version that matches both CLO/CO (commented out to avoid accidental matches with CO2 etc)
    // const cloRegex = /(?:\((?:(?:CLOs?|COs?)\W*\s*\d+(?:\s*[,;&]\s*(?:(?:CLOs?|COs?)\W*\s*)?\d+)*)\))|(?:(?:CLOs?|COs?)\W*\s*\d+(?:\s*[,;&]\s*(?:(?:CLOs?|COs?)\W*\s*)?\d+)*)/i;

    // Version that only matches CLO variants (safer as it won't match CO2 etc)
    const cloRegex = /(?:\((?:CLOs?\W*\s*\d+(?:\s*[,;&]\s*(?:CLOs?\W*\s*)?\d+)*)\))|(?:CLOs?\W*\s*\d+(?:\s*[,;&]\s*(?:CLOs?\W*\s*)?\d+)*)/gi;
    const allCloMatches = [...getAllTextContent(cell).matchAll(cloRegex)];

    if (allCloMatches.length > 0) {
        // Set to store unique CLO numbers
        const uniqueNumbers = new Set();

        // Process each CLO match
        allCloMatches.forEach(match => {
            const cloContent = match[0];
            // Extract numbers from this match
            cloContent
                .replace(/\(|\)/g, '') // remove brackets
                .split(/[,;&]\s*/) // split on comma, semicolon, or ampersand
                .forEach(part => {
                    // Extract just the number from each part, ignoring CLO/CO prefix
                    const numMatch = part.match(/\d+/);
                    if (numMatch) {
                        uniqueNumbers.add(numMatch[0]);
                    }
                });
        });

        // Convert to array, sort numerically, and format
        const numbers = Array.from(uniqueNumbers)
            .sort((a, b) => parseInt(a) - parseInt(b));

        cloText = numbers.length > 0 ? `(CLO ${numbers.join(', ')})` : '(CLO NotFound)';
    } else {
        cloText = '(CLO NotFound)';
    }

    // 4. Clean up description
    const descriptionDiv = document.createElement('div');
    descriptionDiv.className = 'criterion-description';

    // Clone the cell content for processing
    const contentClone = cell.cloneNode(true);

    // Helper function to clean text after each step
    const cleanText = (str) => {
        return str.replace(/^[^a-zA-Z0-9]+/, '').trim(); // Remove any leading non-alphanumeric chars
    };

    // Function to process text content
    const processText = (text) => {
        // Remove criterion names
        text = text.replace(/(?:Criterion|Criteria)\s+\d+/gi, '');
        text = cleanText(text);

        // Remove all percentages from the description
        text = text.replace(/\(?\d+%\)?/g, '');
        text = cleanText(text);

        // Remove CLOs if found
        if (allCloMatches.length > 0) {
            text = text.replace(cloRegex, '');
            text = cleanText(text);
        }

        return text;
    };

    // Process all text nodes
    const walker = document.createTreeWalker(
        contentClone,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );

    let node;
    while (node = walker.nextNode()) {
        node.textContent = processText(node.textContent);
    }

    // Clean up empty elements
    const removeEmpty = (element) => {
        Array.from(element.children).forEach(removeEmpty);
        if (element.children.length === 0 && !element.textContent.trim()) {
            element.remove();
        }
    };
    removeEmpty(contentClone);

    // Process the cleaned content with processHtmlContent
    const processedContent = processHtmlContent(contentClone);
    processedContent.contentEditable = 'true';
    descriptionDiv.appendChild(processedContent);
    container.appendChild(descriptionDiv);

    // Add CLOs
    const cloDiv = document.createElement('div');
    cloDiv.className = allCloMatches.length > 0 ? 'criterion-clos' : 'error-text';
    cloDiv.contentEditable = 'true';
    cloDiv.textContent = cloText;
    container.appendChild(cloDiv);

    return container;
}

// Initialize the UI
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const processButton = document.getElementById('processButton');
let currentFile = null;

// Event listeners for drag and drop
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    handleFileSelection(file);
});

dropZone.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    handleFileSelection(file);
});

function handleFileSelection(file) {
    // Clear any existing output
    const output = document.getElementById('output');
    output.innerHTML = '';

    if (file && file.name.endsWith('.docx')) {
        currentFile = file;
        dropZone.querySelector('p').textContent = `Selected: ${file.name}`;
        processButton.disabled = false;
        log(`File selected: ${file.name}`);
    } else {
        alert('Please select a .docx file');
        log('Invalid file type selected');
    }
}

let hasShownCOWarning = false; // Track if we've shown the CO warning for current document
let avoidCanvasBugs = true; // If true, avoid newlines in criterion descriptions for Canvas compatibility

processButton.addEventListener('click', async () => {
    if (!currentFile) {
        log('No file selected');
        return;
    }

    hasShownCOWarning = false; // Reset the warning flag for each new document

    log('Starting file processing');
    processButton.disabled = true;

    try {
        const arrayBuffer = await currentFile.arrayBuffer();
        log('File loaded into memory');

        const result = await mammoth.convertToHtml({ arrayBuffer });
        log('Document converted to HTML');

        const html = result.value;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        // Helper function to extract content from a table
        const extractTableContent = (table) => {
            log('Extracting content from nested table with dimensions: ' +
                table.getElementsByTagName('tr').length + ' rows x ' +
                (table.getElementsByTagName('tr')[0]?.getElementsByTagName('td').length || 0) + ' columns');

            // Create a single paragraph to hold all content
            const paragraph = document.createElement('p');
            paragraph.contentEditable = 'true';

            // Process each row
            const rows = table.getElementsByTagName('tr');
            Array.from(rows).forEach((row, rowIndex) => {
                const cells = row.getElementsByTagName('td');
                if (cells.length === 0) return; // Skip header rows

                Array.from(cells).forEach((cell, i) => {
                    // Get the text content, handling any nested tables recursively
                    const nestedTables = cell.getElementsByTagName('table');
                    if (nestedTables.length > 0) {
                        Array.from(nestedTables).forEach(nestedTable => {
                            const nestedContent = extractTableContent(nestedTable);
                            nestedTable.parentNode.replaceChild(nestedContent, nestedTable);
                        });
                    }

                    const cellText = cell.textContent.trim();
                    if (cellText) {
                        if (paragraph.textContent) {
                            paragraph.textContent += '\n' + cellText;
                        } else {
                            paragraph.textContent = cellText;
                        }
                    }
                });
            });

            return paragraph;
        };

        // Helper function to flatten nested tables in a cell
        const flattenNestedTables = (element) => {
            const tables = element.getElementsByTagName('table');
            // Convert to array since we'll be modifying the DOM
            Array.from(tables).forEach(table => {
                const container = extractTableContent(table);
                table.parentNode.replaceChild(container, table);
            });
        };

        // Flatten all nested tables in all cells of all tables
        const allTables = tempDiv.getElementsByTagName('table');
        log('Processing ' + allTables.length + ' top-level tables');
        Array.from(allTables).forEach((table, index) => {
            const cells = table.getElementsByTagName('td');
            log('Table ' + (index + 1) + ' has ' + cells.length + ' cells');
            let nestedTableCount = 0;
            Array.from(cells).forEach((cell, cellIndex) => {
                const nestedTables = cell.getElementsByTagName('table');
                if (nestedTables.length > 0) {
                    log('Found ' + nestedTables.length + ' nested table(s) in cell ' + (cellIndex + 1));
                    nestedTableCount += nestedTables.length;
                }
                flattenNestedTables(cell);
            });
            if (nestedTableCount > 0) {
                log('Flattened ' + nestedTableCount + ' nested tables in table ' + (index + 1));
            }
        });

        // Find all tables (now without any nested ones)
        const tables = tempDiv.getElementsByTagName('table');
        log(`Found ${tables.length} tables in document`);

        let foundRubricStart = false;
        let foundContentBreakdown = false;
        const rubricTables = [];

        for (let i = 0; i < tables.length; i++) {
            const table = tables[i];
            const cells = table.getElementsByTagName('td');

            if (cells.length === 1) {
                const cellText = cells[0].textContent.trim();
                log(`Found single-cell table with text: "${cellText}"`);

                if (cellText.includes("Assessment Rubric")) {
                    foundRubricStart = true;
                    log('Found Assessment Rubric marker');
                    continue;
                }

                if (cellText.includes("Course Content Breakdown")) {
                    foundContentBreakdown = true;
                    log('Found Content Breakdown marker');
                    break;
                }
            }

            if (foundRubricStart && !foundContentBreakdown && cells.length > 1) {
                rubricTables.push(table);
                log('Found a rubric table');
            }
        }

        // Display the rubrics
        const output = document.getElementById('output');
        output.innerHTML = '';

        if (rubricTables.length === 0) {
            output.innerHTML = '<p>No rubrics found in the document.</p>';
            log('No rubrics found');
        } else {
            log(`Found ${rubricTables.length} rubric tables`);

            // Clear the output before adding new content
            output.innerHTML = '';

            rubricTables.forEach((table, index) => {
                // Create the accordion container
                const rubricDiv = document.createElement('div');
                rubricDiv.className = 'rubric-accordion expanded';

                // Create header container
                const headerDiv = document.createElement('div');
                headerDiv.className = 'rubric-header';

                // Add expand icon
                const expandIcon = document.createElement('div');
                expandIcon.className = 'expand-icon';
                headerDiv.appendChild(expandIcon);

                // Create content container
                const contentDiv = document.createElement('div');
                contentDiv.className = 'rubric-content';

                // Add click handler for accordion
                headerDiv.addEventListener('click', () => {
                    rubricDiv.classList.toggle('expanded');
                });

                // Extract assignment name from first row of this table
                let assignmentName = '';
                const firstRow = table.rows[0];
                if (firstRow) {
                    const paragraphs = firstRow.getElementsByTagName('p');
                    for (const p of paragraphs) {
                        const text = p.textContent.trim();
                        if (text) {
                            assignmentName = text;
                            break;
                        }
                    }
                }

                // Add heading
                const heading = document.createElement('h2');
                heading.textContent = assignmentName || `Rubric ${index + 1}`;
                headerDiv.appendChild(heading);
                rubricDiv.appendChild(headerDiv);

                // Create clean table
                const cleanTable = document.createElement('table');
                cleanTable.className = 'rubric-table';

                // Create header
                const thead = document.createElement('thead');
                const headerRow = document.createElement('tr');
                const headers = ['Criteria', 'High Distinction', 'Distinction', 'Credit', 'Pass', 'Fail'];

                headers.forEach(text => {
                    const th = document.createElement('th');
                    th.textContent = text;
                    headerRow.appendChild(th);
                });

                thead.appendChild(headerRow);
                cleanTable.appendChild(thead);

                const tbody = document.createElement('tbody');
                cleanTable.appendChild(tbody);

                // Clean up the table
                const rows = table.getElementsByTagName('tr');
                let skipNextRow = false;
                let criterionNumber = 1; // Initialize criterion counter for this table

                // Start from index 1 to skip the title row
                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];

                    // Skip the Course Learning Outcomes row and the row after it
                    const rowText = row.textContent.trim().toLowerCase();
                    if (rowText.includes('course learning outcomes')) {
                        skipNextRow = true;
                        continue;
                    }
                    if (skipNextRow) {
                        skipNextRow = false;
                        continue;
                    }

                    // Clean up paragraphs in the row
                    const cells = row.getElementsByTagName('td');
                    let hasContent = false;

                    const newRow = document.createElement('tr');
                    for (let cellIndex = 0; cellIndex < cells.length; cellIndex++) {
                        const cell = cells[cellIndex];
                        const newCell = document.createElement('td');
                        // Add class based on cell type
                        if (cellIndex === 0) {
                            newCell.className = 'criterion';
                        } else {
                            const cellTypes = ['high-distinction', 'distinction', 'credit', 'pass', 'fail'];
                            if (cellIndex - 1 < cellTypes.length) {
                                newCell.className = cellTypes[cellIndex - 1];
                            }
                        }

                        // Only process the first cell (criteria cell) specially
                        if (cellIndex === 0) {
                            // Check if the cell has any non-whitespace content
                            const cellContent = getAllTextContent(cell).trim();
                            if (cellContent) {
                                newCell.appendChild(processCriterionCell(cell, criterionNumber));
                                criterionNumber++; // Increment counter after processing each criterion cell
                                hasContent = true;
                            }
                        } else {
                            // Process non-criterion cells
                            const p = processHtmlContent(cell);
                            if (p.hasChildNodes()) {
                                p.contentEditable = 'true';
                                newCell.appendChild(p);
                                
                                // Add point range display for rating cells
                                // Get the criterion score from the first cell in this row
                                const criterionCell = newRow.querySelector('.criterion');
                                const criterionScoreElement = criterionCell ? criterionCell.querySelector('.criterion-score') : null;
                                let maxPoints = 0;
                                if (criterionScoreElement) {
                                    const maxPointsText = criterionScoreElement.textContent.match(/\d+/);
                                    maxPoints = maxPointsText ? parseInt(maxPointsText[0]) : 0;
                                }
                                
                                // Only add point range if we have a valid maxPoints
                                if (maxPoints > 0) {
                                    // Get rating type from cell class
                                    const cellClass = newCell.className;
                                    
                                    // Calculate and display points range based on rating type
                                    const pointsInfo = calculateRatingPointsRange(maxPoints, cellClass);
                                    if (pointsInfo) {
                                        const pointsDiv = document.createElement('div');
                                        pointsDiv.className = 'rating-points';
                                        pointsDiv.textContent = pointsInfo;
                                        newCell.appendChild(pointsDiv);
                                    }
                                }
                                
                                hasContent = true;
                            }
                        }

                        newRow.appendChild(newCell);
                    }

                    // Only add rows that have actual content
                    if (hasContent) {
                        tbody.appendChild(newRow);
                    }
                }

                // Add the clean table to the rubric div
                contentDiv.appendChild(cleanTable);
                rubricDiv.appendChild(contentDiv);

                // After processing, check if the table is blank
                const isBlankTable = Array.from(cleanTable.rows).every(row => {
                    // Check all cells except the first one
                    return Array.from(row.cells).slice(1).every(cell => !getAllTextContent(cell).trim());
                });

                if (isBlankTable) {
                    // Remove the table and its preceding heading
                    rubricDiv.removeChild(headerDiv);
                    rubricDiv.removeChild(contentDiv);
                } else {
                    // Add a download button for CSV export
                    const downloadButton = document.createElement('button');
                    downloadButton.textContent = 'Download CSV';
                    downloadButton.onclick = function () {
                        const csvContent = generateCSVContent(cleanTable, heading.textContent.trim());
                        downloadCSV(csvContent, `${heading.textContent.trim().replace(/\s+/g, '_')}_rubric.csv`);
                    };
                    contentDiv.appendChild(downloadButton);
                    rubricDiv.appendChild(contentDiv);
                }

                // Add the complete rubric div to the output
                output.appendChild(rubricDiv);

                // If this is the first rubric, scroll to its heading
                if (index === 0) {
                    // Use requestAnimationFrame to wait for DOM update
                    requestAnimationFrame(() => {
                        const firstH2 = output.querySelector('h2');
                        if (firstH2) {
                            firstH2.scrollIntoView({ behavior: 'smooth' });
                        }
                    });
                }
            });

            // Function to generate CSV content using Papa Parse
            function generateCSVContent(table, rubricName) {
                const rows = Array.from(table.rows);
                const headerRow = rows[0];
                const headers = Array.from(headerRow.cells).slice(1).map(cell => cell.textContent.trim());

                // First row is the header
                const csvData = [[
                    'Rubric Name', 'Criteria Name', 'Criteria Description', 'Criteria Enable Range',
                    'Rating Name', 'Rating Description', 'Rating Points',
                    'Rating Name', 'Rating Description', 'Rating Points',
                    'Rating Name', 'Rating Description', 'Rating Points',
                    'Rating Name', 'Rating Description', 'Rating Points',
                    'Rating Name', 'Rating Description', 'Rating Points'
                ]];

                // Process each criterion row
                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    const criterionCell = row.cells[0];
                    const criterionName = criterionCell.querySelector('.criterion-name').textContent;
                    const criterionScore = criterionCell.querySelector('.criterion-score')?.textContent || '';
                    const fullCriterionName = `${criterionName} ${criterionScore}`;
                    // Get description content and handle line breaks based on avoidCanvasBugs setting
                    const descriptionP = criterionCell.querySelector('.criterion-description p');
                    let criterionDescription = '';
                    if (descriptionP) {
                        if (avoidCanvasBugs) {
                            // For Canvas compatibility, replace <br> with spaces
                            criterionDescription = descriptionP.innerHTML
                                .replace(/<br\s*\/?>/gi, ' ')
                                .replace(/\s+/g, ' '); // Normalize spaces
                            // Set the modified content back to get proper text extraction
                            descriptionP.innerHTML = criterionDescription;
                            criterionDescription = descriptionP.textContent.trim();
                        } else {
                            // Normal processing with newlines
                            descriptionP.innerHTML = descriptionP.innerHTML.replace(/<br\s*\/?>/gi, '\n');
                            criterionDescription = descriptionP.textContent;
                        }
                    }
                    let maxPointsText = 0;
                    if (criterionCell.querySelector('.criterion-score')) {
                        maxPointsText = criterionCell.querySelector('.criterion-score').textContent.match(/\d+/);
                    }
                    const maxPoints = maxPointsText ? parseInt(maxPointsText[0]) : 0;

                    // Helper function to escape CSV field and handle special characters
                    // No need for escapeCSV anymore - Papa Parse handles this

                    // Get CLOs
                    const clos = criterionCell.querySelector('.criterion-clos')?.textContent || '';
                    const fullDescription = criterionDescription + (clos ? ` ${clos}` : '');

                    const rowData = [
                        rubricName,
                        fullCriterionName,
                        fullDescription,
                        'true' // Criteria Enable Range
                    ];

                    headers.forEach((ratingName, index) => {
                        // Get the cell's paragraph content to preserve line breaks
                        const cell = row.cells[index + 1];
                        const p = cell.querySelector('p');
                        // Replace <br> tags with newlines before getting text content
                        if (p) {
                            // Convert <br> to newlines in the HTML
                            p.innerHTML = p.innerHTML.replace(/<br\s*\/?>/gi, '\n');
                        }
                        const ratingDescription = p ? p.textContent : cell.textContent.trim();
                        let ratingPoints = 0;
                        ratingPoints = calculateRatingPoints(maxPoints, ratingName);

                        rowData.push(ratingName, ratingDescription, ratingPoints);
                    });

                    csvData.push(rowData);
                }

                // Use Papa Parse to generate the CSV
                return Papa.unparse(csvData, {
                    quotes: true, // Quote fields that need it
                    quoteChar: '"',
                    escapeChar: '"',
                    newline: '\n', // Explicitly set newline character
                });
            }

            // Function to calculate rating points based on max points and rating name
            function calculateRatingPoints(maxPoints, ratingName) {
                let points = 0;
                
                switch (ratingName) {
                    case 'High Distinction':
                        points = maxPoints.toFixed(2);
                        break;
                    case 'Distinction':
                        points = (maxPoints * 0.85 - 0.01).toFixed(2);
                        break;
                    case 'Credit':
                        points = (maxPoints * 0.75 - 0.01).toFixed(2);
                        break;
                    case 'Pass':
                        points = (maxPoints * 0.65 - 0.01).toFixed(2);
                        break;
                    case 'Fail':
                        points = (maxPoints * 0.5 - 0.01).toFixed(2);
                        break;
                }
                
                return points;
            }
            
            // Function to calculate rating point ranges for display in the table
            function calculateRatingPointsRange(maxPoints, ratingType) {
                // Define thresholds for each rating
                const hdLower = parseFloat((maxPoints * 0.85).toFixed(2));
                const dLower = parseFloat((maxPoints * 0.75).toFixed(2));
                const cLower = parseFloat((maxPoints * 0.65).toFixed(2));
                const pLower = parseFloat((maxPoints * 0.5).toFixed(2));
                
                // Adjust upper bounds to avoid overlap
                const hdUpper = maxPoints;
                const dUpper = hdLower - 0.01;
                const cUpper = dLower - 0.01;
                const pUpper = cLower - 0.01;
                
                switch (ratingType) {
                    case 'high-distinction':
                        return `${hdLower.toFixed(2)} to ${hdUpper.toFixed(2)} pts`;
                    case 'distinction':
                        return `${dLower.toFixed(2)} to ${dUpper.toFixed(2)} pts`;
                    case 'credit':
                        return `${cLower.toFixed(2)} to ${cUpper.toFixed(2)} pts`;
                    case 'pass':
                        return `${pLower.toFixed(2)} to ${pUpper.toFixed(2)} pts`;
                    case 'fail':
                        return `${(pLower - 0.01).toFixed(2)} pts or less`;
                    default:
                        return null;
                }
            }
            
            // Function to trigger CSV download
            function downloadCSV(csvContent, filename) {
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', filename);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        }
    } catch (error) {
        log(`Error processing file: ${error.message}`);
        alert('Error processing file. Check the debug log for details.');
    } finally {
        processButton.disabled = false;
    }
});

log('Application initialized');