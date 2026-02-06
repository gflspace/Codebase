const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, convertInchesToTwip } = require('docx');
const { marked } = require('marked');
const puppeteer = require('puppeteer');

// Directories
const baseDir = __dirname;
const outputWordDir = path.join(baseDir, 'Downloads_Word');
const outputPdfDir = path.join(baseDir, 'Downloads_PDF');

// Ensure output directories exist
if (!fs.existsSync(outputWordDir)) fs.mkdirSync(outputWordDir, { recursive: true });
if (!fs.existsSync(outputPdfDir)) fs.mkdirSync(outputPdfDir, { recursive: true });

// Find all markdown files
function findMarkdownFiles(dir) {
    let results = [];
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory() && !item.startsWith('node_modules') && !item.startsWith('Downloads')) {
            results = results.concat(findMarkdownFiles(fullPath));
        } else if (item.endsWith('.md')) {
            results.push(fullPath);
        }
    }
    return results;
}

// Parse markdown into structured elements
function parseMarkdown(content) {
    const lines = content.split('\n');
    const elements = [];
    let inTable = false;
    let tableRows = [];
    let inCodeBlock = false;
    let codeContent = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Handle code blocks
        if (line.startsWith('```')) {
            if (inCodeBlock) {
                elements.push({ type: 'code', content: codeContent.join('\n') });
                codeContent = [];
                inCodeBlock = false;
            } else {
                inCodeBlock = true;
            }
            continue;
        }

        if (inCodeBlock) {
            codeContent.push(line);
            continue;
        }

        // Handle tables
        if (line.includes('|') && line.trim().startsWith('|')) {
            if (!inTable) {
                inTable = true;
                tableRows = [];
            }
            // Skip separator rows
            if (!line.match(/^\|[\s\-:]+\|/)) {
                const cells = line.split('|').filter(c => c.trim() !== '');
                tableRows.push(cells.map(c => c.trim()));
            }
            continue;
        } else if (inTable) {
            if (tableRows.length > 0) {
                elements.push({ type: 'table', rows: tableRows });
            }
            inTable = false;
            tableRows = [];
        }

        // Handle headings
        if (line.startsWith('# ')) {
            elements.push({ type: 'h1', content: line.substring(2).trim() });
        } else if (line.startsWith('## ')) {
            elements.push({ type: 'h2', content: line.substring(3).trim() });
        } else if (line.startsWith('### ')) {
            elements.push({ type: 'h3', content: line.substring(4).trim() });
        } else if (line.startsWith('#### ')) {
            elements.push({ type: 'h4', content: line.substring(5).trim() });
        } else if (line.startsWith('**') && line.endsWith('**')) {
            elements.push({ type: 'bold', content: line.replace(/\*\*/g, '') });
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
            elements.push({ type: 'bullet', content: line.substring(2).trim() });
        } else if (line.match(/^\d+\.\s/)) {
            elements.push({ type: 'numbered', content: line.replace(/^\d+\.\s/, '').trim() });
        } else if (line.trim() === '---') {
            elements.push({ type: 'hr' });
        } else if (line.trim() !== '') {
            elements.push({ type: 'paragraph', content: line });
        }
    }

    // Handle remaining table
    if (inTable && tableRows.length > 0) {
        elements.push({ type: 'table', rows: tableRows });
    }

    return elements;
}

// Create Word document
async function createWordDocument(markdownPath) {
    const content = fs.readFileSync(markdownPath, 'utf8');
    const elements = parseMarkdown(content);
    const children = [];

    for (const el of elements) {
        switch (el.type) {
            case 'h1':
                children.push(new Paragraph({
                    text: el.content,
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 400, after: 200 }
                }));
                break;
            case 'h2':
                children.push(new Paragraph({
                    text: el.content,
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 300, after: 150 }
                }));
                break;
            case 'h3':
                children.push(new Paragraph({
                    text: el.content,
                    heading: HeadingLevel.HEADING_3,
                    spacing: { before: 200, after: 100 }
                }));
                break;
            case 'h4':
                children.push(new Paragraph({
                    children: [new TextRun({ text: el.content, bold: true, size: 24 })],
                    spacing: { before: 150, after: 80 }
                }));
                break;
            case 'bold':
                children.push(new Paragraph({
                    children: [new TextRun({ text: el.content, bold: true })],
                    spacing: { before: 100, after: 50 }
                }));
                break;
            case 'bullet':
                children.push(new Paragraph({
                    text: el.content,
                    bullet: { level: 0 },
                    spacing: { before: 50, after: 50 }
                }));
                break;
            case 'numbered':
                children.push(new Paragraph({
                    text: el.content,
                    numbering: { reference: 'default-numbering', level: 0 },
                    spacing: { before: 50, after: 50 }
                }));
                break;
            case 'table':
                try {
                    const tableRows = el.rows.map((row, rowIndex) => {
                        const cells = row.map(cell => new TableCell({
                            children: [new Paragraph({
                                children: [new TextRun({
                                    text: cell,
                                    bold: rowIndex === 0,
                                    size: 20
                                })]
                            })],
                            width: { size: 100 / row.length, type: WidthType.PERCENTAGE },
                            shading: rowIndex === 0 ? { fill: 'E0E0E0' } : undefined
                        }));
                        return new TableRow({ children: cells });
                    });
                    children.push(new Table({
                        rows: tableRows,
                        width: { size: 100, type: WidthType.PERCENTAGE }
                    }));
                    children.push(new Paragraph({ text: '', spacing: { after: 100 } }));
                } catch (e) {
                    // Skip malformed tables
                }
                break;
            case 'code':
                children.push(new Paragraph({
                    children: [new TextRun({
                        text: el.content,
                        font: 'Courier New',
                        size: 18
                    })],
                    shading: { fill: 'F0F0F0' },
                    spacing: { before: 100, after: 100 }
                }));
                break;
            case 'hr':
                children.push(new Paragraph({
                    text: '',
                    border: { bottom: { style: BorderStyle.SINGLE, size: 6 } },
                    spacing: { before: 200, after: 200 }
                }));
                break;
            case 'paragraph':
            default:
                // Handle inline formatting
                const text = el.content || '';
                const runs = [];
                let remaining = text;

                // Simple bold/italic parsing
                const boldRegex = /\*\*([^*]+)\*\*/g;
                let lastIndex = 0;
                let match;

                while ((match = boldRegex.exec(text)) !== null) {
                    if (match.index > lastIndex) {
                        runs.push(new TextRun({ text: text.substring(lastIndex, match.index) }));
                    }
                    runs.push(new TextRun({ text: match[1], bold: true }));
                    lastIndex = match.index + match[0].length;
                }

                if (lastIndex < text.length) {
                    runs.push(new TextRun({ text: text.substring(lastIndex) }));
                }

                if (runs.length === 0) {
                    runs.push(new TextRun({ text }));
                }

                children.push(new Paragraph({
                    children: runs,
                    spacing: { before: 50, after: 50 }
                }));
                break;
        }
    }

    const doc = new Document({
        numbering: {
            config: [{
                reference: 'default-numbering',
                levels: [{
                    level: 0,
                    format: 'decimal',
                    text: '%1.',
                    alignment: AlignmentType.START
                }]
            }]
        },
        sections: [{
            properties: {
                page: {
                    margin: {
                        top: convertInchesToTwip(1),
                        bottom: convertInchesToTwip(1),
                        left: convertInchesToTwip(1),
                        right: convertInchesToTwip(1)
                    }
                }
            },
            children
        }]
    });

    return doc;
}

// Create PDF from markdown
async function createPdfDocument(markdownPath, outputPath) {
    const content = fs.readFileSync(markdownPath, 'utf8');
    const htmlContent = marked(content);

    const styledHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {
                font-family: 'Segoe UI', Arial, sans-serif;
                font-size: 11pt;
                line-height: 1.6;
                max-width: 8in;
                margin: 0 auto;
                padding: 0.5in;
                color: #333;
            }
            h1 {
                font-size: 24pt;
                color: #1a1a2e;
                border-bottom: 3px solid #1a1a2e;
                padding-bottom: 10px;
                margin-top: 30px;
            }
            h2 {
                font-size: 18pt;
                color: #16213e;
                border-bottom: 1px solid #ddd;
                padding-bottom: 5px;
                margin-top: 25px;
            }
            h3 {
                font-size: 14pt;
                color: #0f3460;
                margin-top: 20px;
            }
            h4 {
                font-size: 12pt;
                color: #333;
                margin-top: 15px;
            }
            table {
                border-collapse: collapse;
                width: 100%;
                margin: 15px 0;
                font-size: 10pt;
            }
            th, td {
                border: 1px solid #ddd;
                padding: 8px 12px;
                text-align: left;
            }
            th {
                background-color: #1a1a2e;
                color: white;
                font-weight: bold;
            }
            tr:nth-child(even) {
                background-color: #f9f9f9;
            }
            code {
                background-color: #f4f4f4;
                padding: 2px 6px;
                border-radius: 3px;
                font-family: 'Consolas', monospace;
                font-size: 10pt;
            }
            pre {
                background-color: #f4f4f4;
                padding: 15px;
                border-radius: 5px;
                overflow-x: auto;
                font-size: 9pt;
            }
            pre code {
                background: none;
                padding: 0;
            }
            ul, ol {
                margin: 10px 0;
                padding-left: 25px;
            }
            li {
                margin: 5px 0;
            }
            hr {
                border: none;
                border-top: 2px solid #ddd;
                margin: 20px 0;
            }
            blockquote {
                border-left: 4px solid #1a1a2e;
                margin: 15px 0;
                padding-left: 15px;
                color: #666;
            }
            .page-break {
                page-break-after: always;
            }
            @media print {
                body {
                    padding: 0;
                }
                h1, h2 {
                    page-break-after: avoid;
                }
                table {
                    page-break-inside: avoid;
                }
            }
        </style>
    </head>
    <body>
        ${htmlContent}
    </body>
    </html>
    `;

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(styledHtml, { waitUntil: 'networkidle0' });
    await page.pdf({
        path: outputPath,
        format: 'A4',
        margin: {
            top: '0.75in',
            bottom: '0.75in',
            left: '0.75in',
            right: '0.75in'
        },
        printBackground: true
    });
    await browser.close();
}

// Main conversion function
async function convertAll() {
    console.log('Finding markdown files...');
    const markdownFiles = findMarkdownFiles(baseDir);
    console.log(`Found ${markdownFiles.length} markdown files`);

    for (const mdFile of markdownFiles) {
        const baseName = path.basename(mdFile, '.md');
        console.log(`\nProcessing: ${baseName}`);

        // Create Word document
        try {
            console.log('  Creating Word document...');
            const doc = await createWordDocument(mdFile);
            const wordPath = path.join(outputWordDir, `${baseName}.docx`);
            const buffer = await Packer.toBuffer(doc);
            fs.writeFileSync(wordPath, buffer);
            console.log(`  ✓ Word: ${wordPath}`);
        } catch (error) {
            console.error(`  ✗ Word error: ${error.message}`);
        }

        // Create PDF document
        try {
            console.log('  Creating PDF document...');
            const pdfPath = path.join(outputPdfDir, `${baseName}.pdf`);
            await createPdfDocument(mdFile, pdfPath);
            console.log(`  ✓ PDF: ${pdfPath}`);
        } catch (error) {
            console.error(`  ✗ PDF error: ${error.message}`);
        }
    }

    console.log('\n========================================');
    console.log('Conversion complete!');
    console.log(`Word documents: ${outputWordDir}`);
    console.log(`PDF documents: ${outputPdfDir}`);
    console.log('========================================');
}

// Run
convertAll().catch(console.error);
