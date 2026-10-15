const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createWorker } = require('tesseract.js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(express.static(path.join(__dirname)));

// Configure multer with safe 100MB limit
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024 // 100 MB max file size
    },
    fileFilter: (req, file, cb) => {
        const allowedExts = ['.pdf', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.webp', '.heic'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedExts.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`Unsupported file type '${ext}'. Please upload PDF, DOCX, TXT, or Image files.`));
        }
    }
});

// Configure Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const CANDIDATE_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-flash-latest'];

async function generateWithFallback(systemInstruction, promptParts, jsonMode = false, maxRetries = 2) {
    let lastError = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        for (const modelName of CANDIDATE_MODELS) {
            try {
                const config = {
                    temperature: jsonMode ? 0.2 : 0.3
                };
                if (jsonMode) {
                    config.responseMimeType = "application/json";
                }
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    systemInstruction: systemInstruction,
                    generationConfig: config
                });
                const result = await model.generateContent(promptParts);
                return result.response.text();
            } catch (err) {
                console.warn(`Gemini model ${modelName} notice (attempt ${attempt + 1}):`, err.message);
                lastError = err;
            }
        }
        if (attempt < maxRetries) {
            // Exponential backoff to absorb transient 503 demand spikes
            await new Promise(r => setTimeout(r, 1200 * (attempt + 1)));
        }
    }
    throw lastError || new Error('All candidate Gemini models failed.');
}

// Robust Text Chunker with overlap
function chunkText(text, maxChunkSize = 14000, overlap = 1500) {
    if (!text || text.length <= maxChunkSize) {
        return [text];
    }
    const chunks = [];
    let start = 0;
    while (start < text.length) {
        let end = Math.min(start + maxChunkSize, text.length);
        if (end < text.length) {
            const lastBreak = text.lastIndexOf('\n', end);
            if (lastBreak > start + maxChunkSize * 0.6) {
                end = lastBreak;
            }
        }
        chunks.push(text.slice(start, end).trim());
        if (end >= text.length) break;
        start = Math.max(0, end - overlap);
    }
    return chunks;
}

// Clean and parse JSON safely (resilient against trailing commas and model preambles)
function cleanAndParseJSON(rawText) {
    if (!rawText) throw new Error('Empty response from AI model.');
    let clean = rawText.trim();
    if (clean.startsWith('```json')) {
        clean = clean.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
    } else if (clean.startsWith('```')) {
        clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    clean = clean.trim();

    // 1. Direct parse attempt
    try {
        return JSON.parse(clean);
    } catch (err1) {
        // 2. Sanitize trailing commas before closing braces/brackets
        try {
            const sanitized = clean.replace(/,\s*([}\]])/g, '$1');
            return JSON.parse(sanitized);
        } catch (err2) {
            // 3. Extract outer JSON bounds if model emitted any surrounding text
            const firstBrace = clean.indexOf('{');
            const lastBrace = clean.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                try {
                    const extracted = clean.slice(firstBrace, lastBrace + 1).replace(/,\s*([}\]])/g, '$1');
                    return JSON.parse(extracted);
                } catch (err3) {}
            }
            throw err1;
        }
    }
}

// Process-level safety guards to ensure server resilience
process.on('uncaughtException', (err) => {
    console.warn('Recovered from uncaught exception:', err.message);
});
process.on('unhandledRejection', (reason) => {
    console.warn('Recovered from unhandled rejection:', reason);
});

// OCR Helper using tesseract.js with robust error handler
async function performOCR(imageBuffer) {
    let worker = null;
    try {
        worker = await createWorker('eng', 1, {
            errorHandler: (err) => console.warn('Tesseract worker notice:', err.message || err)
        });
        const ret = await worker.recognize(imageBuffer);
        return ret?.data?.text || '';
    } catch (ocrErr) {
        console.warn('OCR processing warning:', ocrErr.message);
        return '';
    } finally {
        if (worker) {
            await worker.terminate().catch(() => {});
        }
    }
}

// Comprehensive Document Extraction Pipeline
async function extractDocumentContent(file) {
    if (!file) return { text: '', pageCount: 1, isScanned: false, warnings: [] };

    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const warnings = [];
    let extractedText = '';
    let pageCount = 1;
    let isScanned = false;

    // 1. Plain Text
    if (ext === 'txt') {
        extractedText = file.buffer.toString('utf-8');
        pageCount = Math.max(1, Math.ceil(extractedText.length / 2500));
        return { text: extractedText, pageCount, isScanned: false, warnings };
    }

    // 2. Word Document (.docx)
    if (ext === 'docx') {
        try {
            const result = await mammoth.extractRawText({ buffer: file.buffer });
            extractedText = result?.value || '';
            pageCount = Math.max(1, Math.ceil(extractedText.length / 2500));
            return { text: extractedText, pageCount, isScanned: false, warnings };
        } catch (docxErr) {
            throw new Error(`Failed to extract text from DOCX file: ${docxErr.message}`);
        }
    }

    // 3. Image Files (.jpg, .jpeg, .png, .webp)
    if (['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext)) {
        // Run OCR on image for textual representation
        try {
            const ocrText = await performOCR(file.buffer);
            extractedText = ocrText;
            if (!extractedText.trim()) {
                warnings.push('OCR extracted minimal text from image. AI vision model will inspect visual content directly.');
            }
        } catch (err) {
            warnings.push('Local OCR failed, relying on multimodal vision.');
        }
        return { text: extractedText, pageCount: 1, isScanned: true, warnings, isImage: true };
    }

    // 4. PDF Documents
    if (ext === 'pdf') {
        try {
            if (pdf && pdf.PDFParse) {
                const parser = new pdf.PDFParse({ data: file.buffer });
                try {
                    const pdfData = await parser.getText();
                    pageCount = pdfData?.total || 1;

                    if (Array.isArray(pdfData?.pages) && pdfData.pages.length > 0) {
                        const pagePieces = [];
                        pdfData.pages.forEach(p => {
                            const pText = (p.text || '').trim();
                            pagePieces.push(`--- [Page ${p.num}] ---\n${pText}`);
                        });
                        extractedText = pagePieces.join('\n\n');
                    } else {
                        extractedText = pdfData?.text || '';
                    }
                } finally {
                    if (typeof parser.destroy === 'function') {
                        await parser.destroy().catch(() => {});
                    }
                }
            } else if (typeof pdf === 'function') {
                const pdfData = await pdf(file.buffer);
                extractedText = pdfData?.text || '';
                pageCount = pdfData?.numpages || 1;
            } else if (typeof pdf?.default === 'function') {
                const pdfData = await pdf.default(file.buffer);
                extractedText = pdfData?.text || '';
                pageCount = pdfData?.numpages || 1;
            } else {
                throw new Error('PDF parsing engine unavailable.');
            }

            // Quality Check: Is this a scanned PDF with no selectable text?
            const cleanedText = extractedText.replace(/---\s*\[Page\s*\d+\]\s*---/g, '').trim();
            if (cleanedText.length < 35 || (cleanedText.length / Math.max(1, pageCount)) < 15) {
                isScanned = true;
                warnings.push(`Scanned or image-based PDF detected (${pageCount} page(s)). Minimal embedded selectable text found. Analysis may be limited without high-contrast optical text.`);
            }

            return { text: extractedText, pageCount, isScanned, warnings };

        } catch (pdfErr) {
            console.error('PDF extraction failed:', pdfErr);
            throw new Error(`Failed to parse PDF file (${file.originalname}): ${pdfErr.message}`);
        }
    }

    throw new Error(`Unsupported document extension '.${ext}'.`);
}

// Config and Health Endpoints
app.get('/api/config', (req, res) => {
    res.json({
        supabaseUrl: process.env.SUPABASE_URL || '',
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ''
    });
});

app.get('/api/status', (req, res) => {
    const rawKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';
    const hasApiKey = Boolean(rawKey && rawKey !== 'your_gemini_api_key_here');
    res.json({
        status: 'online',
        hasApiKey: hasApiKey,
        agentName: 'Summora',
        supportedMarks: [1, 2, 3, 5, 8, 10, 12, 13, 15],
        message: hasApiKey ? 'Gemini AI API active and ready.' : 'API key not configured in .env'
    });
});

// Core Prompt Generator for Grounded Analysis
function buildSystemInstruction(subject, selectedMarks, questionsPerTopic) {
    const marksListStr = selectedMarks.map(m => `${m} Mark`).join(', ');

    return `You are Summora, a Senior Academic Study Assistant and Examination Analyzer.
CRITICAL INTEGRITY RULES:
1. Ground EVERYTHING strictly in the provided study material. Do NOT introduce external concepts, unrelated subjects, or imaginary topics.
2. If no specific subject was supplied, accurately detect and name the subject from the actual source content.
3. For EACH important topic identified in the text, generate MULTIPLE distinct, high-yield examination questions (approximately ${questionsPerTopic} questions per topic if the text covers enough material; generate fewer questions if material is limited, NEVER invent content).
4. Strictly generate questions ONLY for the requested marks: [${marksListStr}]. Do not generate questions for marks that were not requested.
5. Marks depth guidelines:
   - 1 Mark: Direct factual recall, definitions, key terms, or single-phrase answers.
   - 2 to 3 Marks: Concise conceptual explanations, clear differences/distinctions, or short statements.
   - 5 Marks: Structured explanations, 4-5 key points, step-by-step algorithms, or short examples.
   - 8 Marks: Detailed conceptual walkthroughs, comprehensive algorithms, worked problems, or derivations.
   - 10 to 15 Marks: Exhaustive essay-style, analytical architecture breakdowns, multi-part problem solving with detailed sub-questions.
6. Provide a concise, grounded answer outline for every question showing the key points an examiner expects.
7. Include source references (e.g., "[Page 2]", "[Section 1.3]") whenever available from page delimiters in the text.
8. NEVER invent guaranteed exam questions. Format output strictly as JSON.

YOU MUST RESPOND STRICTLY WITH VALID JSON MATCHING THIS EXACT SCHEMA:
{
  "document": {
    "detectedSubject": "Actual Subject Name from Document",
    "extractionStatus": "complete"
  },
  "summary": {
    "shortSummary": "A concise 2-4 sentence executive summary of the uploaded document.",
    "mainConcepts": ["Core concept 1 directly from text", "Core concept 2 directly from text"],
    "importantPoints": ["Crucial exam takeaway 1", "Crucial exam takeaway 2"]
  },
  "topics": [
    {
      "name": "Topic Name",
      "level": "HIGH",
      "explanation": "Detailed explanation of why this topic is vital based on the source.",
      "whyItMatters": "Reason for exam importance according to the material.",
      "sourceReferences": ["Page 1"]
    }
  ],
  "questionsByMarks": [
    {
      "marks": 5,
      "questions": [
        {
          "topic": "Topic Name",
          "question": "Clear, specific exam-style question?",
          "answerOutline": "Key points required: 1. ..., 2. ..., 3. ...",
          "difficulty": "Medium",
          "sourceReferences": ["Page 2"]
        }
      ]
    }
  ],
  "definitions": [
    {
      "term": "Term Name",
      "definition": "Exact academic definition grounded in source.",
      "example": "Example or application from text.",
      "sourceReferences": ["Page 1"]
    }
  ],
  "formulas": [
    {
      "name": "Formula or Rule Name",
      "formula": "Mathematical or algorithmic formula expression",
      "context": "Exam condition or application context"
    }
  ],
  "formulasAndKeyPoints": [
    {
      "concept": "Key Formula or Rule",
      "details": "Formula expression or critical rule from text."
    }
  ],
  "difficultConcepts": [
    {
      "topic": "Topic Name",
      "whyDifficult": "Why students find this challenging.",
      "simpleExplanation": "Clear, intuitive breakdown."
    }
  ],
  "flashcards": [
    {
      "front": "Prompt or Question",
      "back": "Concise answer from notes"
    }
  ],
  "warnings": []
}`;
}

// ----------------------------------------------------------------------
// Main API Route: /api/analyze
// ----------------------------------------------------------------------
app.post('/api/analyze', upload.single('file'), async (req, res) => {
    let { notesText, subject, examDate, options, selectedMarks, questionsPerTopic } = req.body;
    const file = req.file;

    // Parse options & selected marks safely
    if (typeof options === 'string') {
        try { options = JSON.parse(options); } catch (e) { options = {}; }
    }
    if (typeof selectedMarks === 'string') {
        try { selectedMarks = JSON.parse(selectedMarks); } catch (e) { selectedMarks = []; }
    }
    if (!Array.isArray(selectedMarks) || selectedMarks.length === 0) {
        selectedMarks = [2, 5, 10]; // Sensible default marks
    } else {
        selectedMarks = selectedMarks.map(m => parseInt(m, 10)).filter(m => !isNaN(m) && m > 0);
        if (selectedMarks.length === 0) selectedMarks = [2, 5, 10];
    }

    questionsPerTopic = parseInt(questionsPerTopic, 10) || 5;
    if (questionsPerTopic < 1) questionsPerTopic = 3;
    if (questionsPerTopic > 10) questionsPerTopic = 10;

    let extractionMeta = {
        filename: file ? file.originalname : 'Pasted Notes',
        totalPages: 1,
        totalCharacters: 0,
        isScanned: false,
        warnings: []
    };

    let isImage = false;

    // 1. Extract Document Content
    if (file) {
        try {
            const extResult = await extractDocumentContent(file);
            extractionMeta.totalPages = extResult.pageCount || 1;
            extractionMeta.isScanned = extResult.isScanned || false;
            extractionMeta.warnings = extResult.warnings || [];
            isImage = Boolean(extResult.isImage);

            if (extResult.text && extResult.text.trim().length > 0) {
                notesText = extResult.text;
            }
        } catch (err) {
            return res.status(400).json({
                error: err.message,
                document: extractionMeta
            });
        }
    }

    // 2. Strict Input Validation (Do NOT invent answers for empty documents)
    if (!isImage && (!notesText || notesText.trim().length < 15)) {
        return res.status(400).json({
            error: 'No readable study material found. Please upload a file with readable text or paste your lecture notes.',
            document: extractionMeta
        });
    }

    extractionMeta.totalCharacters = notesText ? notesText.length : 0;

    // 3. Check API key
    const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';
    if (!apiKey) {
        return res.status(503).json({
            error: 'GEMINI_API_KEY_MISSING',
            message: 'Gemini API Key is not configured on the backend. Please add it to your .env file.'
        });
    }

    // 4. Chunking & Multistage Analysis for Large Documents
    const chunks = chunkText(notesText, 18000, 1800);
    const systemInstruction = buildSystemInstruction(subject, selectedMarks, questionsPerTopic);

    try {
        let contentStr = '';

        if (chunks.length <= 1) {
            // Single Document Pass
            const promptParts = [
                `Subject Target: ${subject || 'Auto-detect from source'}
Exam Date: ${examDate || 'Upcoming Examination'}
Requested Marks: [${selectedMarks.join(', ')}]
Questions Per Topic: ${questionsPerTopic}
Document Metadata: ${JSON.stringify(extractionMeta)}

STUDY MATERIAL:
${notesText}`
            ];

            if (isImage && file) {
                promptParts.push({
                    inlineData: {
                        data: file.buffer.toString("base64"),
                        mimeType: file.mimetype
                    }
                });
            }

            contentStr = await generateWithFallback(systemInstruction, promptParts, true);

        } else {
            // Multi-Chunk Document Handling (Large Multi-page PDF)
            console.log(`Processing large document in ${chunks.length} overlapping chunks...`);
            
            // Map Phase: Extract Section Summaries & Core Topics from Chunks
            const chunkSummaries = [];
            for (let i = 0; i < chunks.length; i++) {
                const chunkPrompt = `You are analyzing Section ${i + 1} of ${chunks.length} of a large document.
Extract all key topics, essential definitions, and major exam concepts present strictly in this chunk.
Keep it dense, accurate, and faithful to this section.

CHUNK ${i + 1} TEXT:
${chunks[i]}`;
                const chunkRes = await generateWithFallback(
                    "You are an academic extractor. Extract topics, facts, and formulas strictly from this text chunk.",
                    [chunkPrompt],
                    false
                );
                chunkSummaries.push(`--- SECTION ${i + 1} DIGEST ---\n${chunkRes}`);
            }

            // Synthesis Phase: Generate Coherent Full Grounded Analysis
            const combinedDigest = chunkSummaries.join('\n\n');
            const synthesisPrompt = `Subject Target: ${subject || 'Auto-detect from source'}
Exam Date: ${examDate || 'Upcoming Examination'}
Requested Marks: [${selectedMarks.join(', ')}]
Questions Per Topic: ${questionsPerTopic}
Total Document Pages: ${extractionMeta.totalPages}
Total Original Characters: ${extractionMeta.totalCharacters}

SYNTHESIZED FULL DOCUMENT CONTENT ACROSS ALL ${chunks.length} SECTIONS:
${combinedDigest}

SAMPLE ORIGINAL DOCUMENT EXCERPT (FOR EXACT TERMINOLOGY):
${chunks[0].slice(0, 4000)}`;

            contentStr = await generateWithFallback(systemInstruction, [synthesisPrompt], true);
        }

        // 5. Parse and Validate Structured JSON
        const parsedJSON = cleanAndParseJSON(contentStr);

        // Normalize Document Information
        parsedJSON.document = {
            filename: extractionMeta.filename,
            detectedSubject: parsedJSON.document?.detectedSubject || subject || 'Document Study Material',
            extractionStatus: extractionMeta.isScanned ? 'partial' : 'complete',
            totalPages: extractionMeta.totalPages,
            totalCharacters: extractionMeta.totalCharacters,
            selectedMarks: selectedMarks
        };

        // Ensure questionsByMarks format matches requested marks
        if (!Array.isArray(parsedJSON.questionsByMarks)) {
            parsedJSON.questionsByMarks = [];
        }

        // Normalize formulas array
        if (!parsedJSON.formulas && Array.isArray(parsedJSON.formulasAndKeyPoints)) {
            parsedJSON.formulas = parsedJSON.formulasAndKeyPoints.map(f => ({
                name: f.concept || f.name || 'Key Formula',
                formula: f.details || f.formula || '',
                context: f.context || ''
            }));
        }

        // Merge any extraction warnings
        if (!Array.isArray(parsedJSON.warnings)) {
            parsedJSON.warnings = [];
        }
        if (extractionMeta.warnings && extractionMeta.warnings.length > 0) {
            parsedJSON.warnings = Array.from(new Set([...extractionMeta.warnings, ...parsedJSON.warnings]));
        }

        res.json({
            success: true,
            result: parsedJSON,
            extractedText: file ? notesText : null,
            documentMeta: parsedJSON.document
        });

    } catch (err) {
        console.error('Gemini Analysis Error:', err.message);
        res.status(500).json({
            error: err.message || 'Something went wrong while analyzing your study notes.',
            document: extractionMeta
        });
    }
});

// ----------------------------------------------------------------------
// Route: /api/regenerate-questions (Fast regeneration on new marks)
// ----------------------------------------------------------------------
app.post('/api/regenerate-questions', async (req, res) => {
    let { notesText, extractedText, subject, selectedMarks, questionsPerTopic, existingTopics } = req.body;
    const content = (extractedText || notesText || '').trim();

    if (!content || content.length === 0) {
        return res.status(400).json({ error: 'Source notes text is required to regenerate questions.' });
    }

    if (typeof selectedMarks === 'string') {
        try { selectedMarks = JSON.parse(selectedMarks); } catch (e) { selectedMarks = []; }
    }
    if (!Array.isArray(selectedMarks) || selectedMarks.length === 0) {
        selectedMarks = [2, 5, 10];
    } else {
        selectedMarks = selectedMarks.map(m => parseInt(m, 10)).filter(m => !isNaN(m) && m > 0);
    }

    questionsPerTopic = parseInt(questionsPerTopic, 10) || 5;

    const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';
    if (!apiKey) {
        return res.status(503).json({ error: 'GEMINI_API_KEY_MISSING' });
    }

    const marksStr = selectedMarks.map(m => `${m} Mark`).join(', ');

    const prompt = `Subject: ${subject || 'Study Material'}
Requested Marks: [${marksStr}]
Target Questions Per Topic: ${questionsPerTopic}

STUDY MATERIAL CONTENT:
${content.slice(0, 30000)}

Generate multiple distinct exam questions strictly grounded in this material for ONLY the selected marks: [${marksStr}].
Respond strictly with valid JSON format:
{
  "questionsByMarks": [
    {
      "marks": 5,
      "questions": [
        {
          "topic": "Topic Name",
          "question": "Specific question?",
          "answerOutline": "Model answer points",
          "difficulty": "Medium",
          "sourceReferences": ["Page 1"]
        }
      ]
    }
  ]
}`;

    try {
        const rawRes = await generateWithFallback(
            "You are an exam questions generator. Ground every question strictly in the notes for the exact marks requested. Output valid JSON only.",
            [prompt],
            true
        );
        const data = cleanAndParseJSON(rawRes);
        res.json({ success: true, questionsByMarks: data.questionsByMarks || [] });
    } catch (err) {
        console.error('Regenerate questions error:', err.message);
        res.status(500).json({ error: err.message || 'Failed to regenerate questions.' });
    }
});

// ----------------------------------------------------------------------
// Route: /api/chat (Contextual grounded Q&A)
// ----------------------------------------------------------------------
app.post('/api/chat', async (req, res) => {
    const { message, notesContext, subject, chatHistory } = req.body;

    if (!message || message.trim().length === 0) {
        return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';
    if (!apiKey) {
        return res.status(503).json({
            error: 'GEMINI_API_KEY_MISSING',
            message: 'Gemini API Key is not configured on backend. Please add it to your .env file.'
        });
    }

    const systemInstruction = `You are Summora, an academic study assistant. 
Answer questions based PRIMARILY on the uploaded notes provided below for subject "${subject || 'General'}".
If the answer CANNOT be found in the notes or inferred directly from them, clearly state:
"I couldn't find this information in your uploaded notes."
Do NOT invent information or pretend it came from the student's notes. Keep responses concise, student-friendly, and formatted nicely with markdown bullet points if helpful.

UPLOADED NOTES CONTEXT:
${notesContext || 'No specific notes uploaded yet.'}`;

    try {
        const historyPrompt = (chatHistory || []).map(item => `${item.sender === 'user' ? 'Student' : 'Summora'}: ${item.text}`).join('\n');
        const promptText = `${historyPrompt ? 'Previous Conversation:\n' + historyPrompt + '\n\n' : ''}Student Question: ${message}`;

        const reply = await generateWithFallback(systemInstruction, [promptText], false);
        res.json({ reply: reply || "I couldn't find this information in your uploaded notes." });

    } catch (err) {
        console.error('Gemini Chat Error:', err);
        res.status(500).json({ error: err.message || 'Failed to process chat query with AI.' });
    }
});

// Global error handling middleware (handles Multer validation and route errors)
app.use((err, req, res, next) => {
    if (err) {
        console.warn('API request error:', err.message);
        return res.status(400).json({
            error: err.message || 'An error occurred during file upload or request processing.'
        });
    }
    next();
});

// Fallback to index.html for SPA behavior
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server with generous request timeouts
if (require.main === module) {
    const server = app.listen(PORT, () => {
        console.log(`====================================================`);
        console.log(` Summora AI Server running on http://localhost:${PORT}`);
        console.log(` Status: ${process.env.GEMINI_API_KEY ? 'Gemini Key Detected' : 'Demo Mode Fallback Active'}`);
        console.log(` Large File Support: 100MB limit, Multi-page Chunker & OCR active`);
        console.log(`====================================================`);
    });

    server.timeout = 180000; // 3 minutes for large multi-page PDF processing
    server.keepAliveTimeout = 65000;
}

module.exports = app;
