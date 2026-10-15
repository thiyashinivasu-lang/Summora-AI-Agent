/* ==========================================================================
   Summora AI – Core Application Logic
   Pure Vanilla JavaScript Architecture
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------------------------
    // 1. Application State & Storage Defaults (Strict Document Isolation)
    // ----------------------------------------------------------------------
    const state = {
        theme: localStorage.getItem('summora_theme') || localStorage.getItem('exammind_theme') || 'light',
        currentView: 'dashboard',
        isDemoMode: false,
        subject: '',
        examDate: '',
        notesText: '',
        uploadedFile: null,
        analysisData: null,
        documentInfo: null,
        warnings: [],
        selectedMarks: [2, 5, 10], // Default marks selection
        questionsPerTopic: 5,
        currentQuestionsFilter: 'all',
        currentFlashcardIndex: 0,
        isCardFlipped: false,
        chatHistory: [],
        recentNotes: (() => {
            const stored = localStorage.getItem('summora_recent_notes') || localStorage.getItem('exammind_recent_notes');
            if (stored !== null) {
                try { return JSON.parse(stored); } catch (e) {}
            }
            const defaults = [];
            localStorage.setItem('summora_recent_notes', JSON.stringify(defaults));
            return defaults;
        })()
    };

    // ----------------------------------------------------------------------
    // 2. DOM Element Selectors
    // ----------------------------------------------------------------------
    const elements = {
        themeToggleBtn: document.getElementById('themeToggleBtn'),
        themeIcon: document.getElementById('themeIcon'),
        sidebar: document.getElementById('sidebar'),
        sidebarOverlay: document.getElementById('sidebarOverlay'),
        menuToggleBtn: document.getElementById('menuToggleBtn'),
        sidebarCloseBtn: document.getElementById('sidebarCloseBtn'),
        navLinks: document.querySelectorAll('.nav-link'),
        viewSections: document.querySelectorAll('.view-section'),
        currentPageTitle: document.getElementById('currentPageTitle'),
        timeGreeting: document.getElementById('timeGreeting'),
        demoBanner: document.getElementById('demoBanner'),
        dismissDemoBanner: document.getElementById('dismissDemoBanner'),
        
        // Notes Analyzer Inputs
        subjectInput: document.getElementById('subjectInput'),
        examDateInput: document.getElementById('examDateInput'),
        uploadDropzone: document.getElementById('uploadDropzone'),
        fileInput: document.getElementById('fileInput'),
        fileDetailsBox: document.getElementById('fileDetailsBox'),
        fileName: document.getElementById('fileName'),
        fileSize: document.getElementById('fileSize'),
        removeFileBtn: document.getElementById('removeFileBtn'),
        notesTextarea: document.getElementById('notesTextarea'),
        charCounter: document.getElementById('charCounter'),
        clearNotesBtn: document.getElementById('clearNotesBtn'),
        optionsGrid: document.getElementById('optionsGrid'),
        analyzeBtn: document.getElementById('analyzeBtn'),
        loadingOverlay: document.getElementById('loadingOverlay'),
        loadingStatusText: document.getElementById('loadingStatusText'),
        newAnalysisBtn: document.getElementById('newAnalysisBtn'),

        // Marks Control Panel (Requirement 4)
        selectAllMarksBtn: document.getElementById('selectAllMarksBtn'),
        clearAllMarksBtn: document.getElementById('clearAllMarksBtn'),
        marksChipsGrid: document.getElementById('marksChipsGrid'),
        questionsPerTopicSelect: document.getElementById('questionsPerTopicSelect'),

        // Results Container Elements
        resultSubjectTitle: document.getElementById('resultSubjectTitle'),
        resultMetaDate: document.getElementById('resultMetaDate'),
        downloadPackBtn: document.getElementById('downloadPackBtn'),
        reAnalyzeBtn: document.getElementById('reAnalyzeBtn'),
        uploadAnotherBtn: document.getElementById('uploadAnotherBtn'),
        copySummaryBtn: document.getElementById('copySummaryBtn'),

        // Document Metadata Section (Requirement 6)
        docInfoSection: document.getElementById('docInfoSection'),
        docFilename: document.getElementById('docFilename'),
        docDetectedSubject: document.getElementById('docDetectedSubject'),
        docPageCoverage: document.getElementById('docPageCoverage'),
        docStatus: document.getElementById('docStatus'),
        docWarningsBox: document.getElementById('docWarningsBox'),
        docWarningsText: document.getElementById('docWarningsText'),

        // Summary & Content Containers
        summaryShortText: document.getElementById('summaryShortText'),
        summaryMainConcepts: document.getElementById('summaryMainConcepts'),
        summaryImportantPoints: document.getElementById('summaryImportantPoints'),
        topicsContainer: document.getElementById('topicsContainer'),
        definitionsContainer: document.getElementById('definitionsContainer'),

        // Formulas Section (Requirement 6.5)
        formulasSection: document.getElementById('formulasSection'),
        formulasContainer: document.getElementById('formulasContainer'),

        // Questions Section (Requirement 3 & 4)
        questionsSection: document.getElementById('questionsSection'),
        questionsContainer: document.getElementById('questionsContainer'),
        questionsCategoryTabs: document.getElementById('questionsCategoryTabs'),
        totalQuestionsCountBadge: document.getElementById('totalQuestionsCountBadge'),
        moreQuestionsBtn: document.getElementById('moreQuestionsBtn'),
        
        // Revision & Difficult Concepts
        revisionContainer: document.getElementById('revisionContainer'),
        difficultContainer: document.getElementById('difficultContainer'),
        
        // Flashcard Elements
        flashcardElement: document.getElementById('flashcardElement'),
        fcFrontText: document.getElementById('fcFrontText'),
        fcBackText: document.getElementById('fcBackText'),
        fcPrevBtn: document.getElementById('fcPrevBtn'),
        fcNextBtn: document.getElementById('fcNextBtn'),
        fcFlipBtn: document.getElementById('fcFlipBtn'),
        fcCounter: document.getElementById('fcCounter'),

        // Dashboard Recent Notes Grid
        recentNotesGrid: document.getElementById('recentNotesGrid'),

        // Mode & Status Indicators
        modeBadge: document.getElementById('modeBadge'),
        modeBadgeText: document.getElementById('modeBadgeText'),
        modeBadgeIcon: document.getElementById('modeBadgeIcon'),

        // Search & Settings Elements
        searchInput: document.getElementById('searchInput'),
        checkApiBtn: document.getElementById('checkApiBtn'),
        apiStatusText: document.getElementById('apiStatusText'),
        clearStorageBtn: document.getElementById('clearStorageBtn'),

        // Chatbot Elements
        chatWidgetBtn: document.getElementById('chatWidgetBtn'),
        chatPanel: document.getElementById('chatPanel'),
        chatCloseBtn: document.getElementById('chatCloseBtn'),
        navChatTrigger: document.getElementById('navChatTrigger'),
        chatForm: document.getElementById('chatForm'),
        chatInput: document.getElementById('chatInput'),
        chatBody: document.getElementById('chatBody'),
        presetChips: document.querySelectorAll('.preset-chip'),
        toastContainer: document.getElementById('toastContainer'),
        
        // Auth Elements
        navAuthTrigger: document.getElementById('navAuthTrigger'),
        navAuthText: document.getElementById('navAuthText'),
        authModalOverlay: document.getElementById('authModalOverlay'),
        authCloseBtn: document.getElementById('authCloseBtn'),
        authForm: document.getElementById('authForm'),
        authName: document.getElementById('authName'),
        authEmail: document.getElementById('authEmail'),
        authPassword: document.getElementById('authPassword'),
        authToggleBtn: document.getElementById('authToggleBtn'),
        nameGroup: document.getElementById('nameGroup'),
        authModalTitle: document.getElementById('authModalTitle'),
        authModalSubtitle: document.getElementById('authModalSubtitle'),
        authSubmitBtn: document.getElementById('authSubmitBtn')
    };

    // Supabase Initialization variables
    let supabase = null;
    let currentUser = null;
    let isLoginMode = true;

    // ----------------------------------------------------------------------
    // 3. Initialization & Setup
    // ----------------------------------------------------------------------
    async function init() {
        applyTheme(state.theme);
        updateGreeting();
        checkApiStatus(false);
        renderRecentNotes();
        setupEventListeners();
        setupMarksSelectionListeners();
        setupAuthListeners();
        
        // Initialize Supabase if available
        try {
            const res = await fetch(getApiUrl('/api/config'));
            if (res.ok) {
                const config = await res.json();
                if (config.supabaseUrl && config.supabaseAnonKey && window.supabase) {
                    supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
                    checkSession();
                }
            }
        } catch (e) {
            console.warn('Could not load Supabase config', e);
        }

        // Strict: Start with no preloaded or fabricated analysis
        state.analysisData = null;
    }

    // ----------------------------------------------------------------------
    // Auth & Supabase Logic
    // ----------------------------------------------------------------------
    async function checkSession() {
        if (!supabase) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            currentUser = session.user;
            updateAuthUI();
        }
        
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                currentUser = session.user;
                updateAuthUI();
                elements.authModalOverlay.style.display = 'none';
                showToast('Successfully signed in!', 'success');
            } else if (event === 'SIGNED_OUT') {
                currentUser = null;
                updateAuthUI();
                showToast('Signed out', 'info');
            }
        });
    }

    function updateAuthUI() {
        if (currentUser) {
            elements.navAuthText.textContent = currentUser.user_metadata?.full_name || 'My Account (Sign Out)';
        } else {
            elements.navAuthText.textContent = 'Login / Sign Up';
        }
    }

    function setupAuthListeners() {
        if (!elements.navAuthTrigger) return;

        elements.navAuthTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentUser && supabase) {
                if (confirm('Are you sure you want to sign out?')) {
                    supabase.auth.signOut();
                }
            } else {
                elements.authModalOverlay.style.display = 'flex';
            }
        });

        if (elements.authCloseBtn) {
            elements.authCloseBtn.addEventListener('click', () => {
                elements.authModalOverlay.style.display = 'none';
            });
        }

        if (elements.authToggleBtn) {
            elements.authToggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                isLoginMode = !isLoginMode;
                if (isLoginMode) {
                    elements.authModalTitle.textContent = 'Welcome Back';
                    elements.authModalSubtitle.textContent = 'Sign in to save your notes & summaries.';
                    elements.nameGroup.style.display = 'none';
                    elements.authSubmitBtn.textContent = 'Sign In';
                    elements.authToggleBtn.textContent = "Don't have an account? Sign up";
                } else {
                    elements.authModalTitle.textContent = 'Create Account';
                    elements.authModalSubtitle.textContent = 'Join to sync your study materials.';
                    elements.nameGroup.style.display = 'block';
                    elements.authSubmitBtn.textContent = 'Sign Up';
                    elements.authToggleBtn.textContent = "Already have an account? Sign in";
                }
            });
        }

        if (elements.authForm) {
            elements.authForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (!supabase) {
                    showToast('Database connection missing', 'error');
                    return;
                }

                const email = elements.authEmail.value;
                const password = elements.authPassword.value;
                const name = elements.authName.value;

                elements.authSubmitBtn.disabled = true;
                elements.authSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

                try {
                    if (isLoginMode) {
                        const { error } = await supabase.auth.signInWithPassword({ email, password });
                        if (error) throw error;
                    } else {
                        const { error } = await supabase.auth.signUp({
                            email,
                            password,
                            options: { data: { full_name: name } }
                        });
                        if (error) throw error;
                        showToast('Check your email to verify your account.', 'info');
                        elements.authModalOverlay.style.display = 'none';
                    }
                } catch (err) {
                    showToast(err.message, 'error');
                } finally {
                    elements.authSubmitBtn.disabled = false;
                    elements.authSubmitBtn.textContent = isLoginMode ? 'Sign In' : 'Sign Up';
                }
            });
        }
    }

    // ----------------------------------------------------------------------
    // 4. Theme & Greeting Manager
    // ----------------------------------------------------------------------
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        state.theme = theme;
        localStorage.setItem('summora_theme', theme);
        if (elements.themeIcon) {
            elements.themeIcon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        }
    }

    function toggleTheme() {
        const newTheme = state.theme === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
        showToast(`Switched to ${newTheme} mode`, 'info');
    }

    function updateGreeting() {
        const hour = new Date().getHours();
        let greeting = 'Good evening, Student 👋';
        if (hour < 12) greeting = 'Good morning, Student 👋';
        else if (hour < 17) greeting = 'Good afternoon, Student 👋';
        if (elements.timeGreeting) elements.timeGreeting.textContent = greeting;
    }

    // ----------------------------------------------------------------------
    // 5. Navigation & View Switcher
    // ----------------------------------------------------------------------
    function switchView(viewName) {
        state.currentView = viewName;

        elements.navLinks.forEach(link => {
            if (link.getAttribute('data-view') === viewName) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        elements.viewSections.forEach(section => {
            section.classList.remove('active');
        });

        let targetId = `${viewName}-view`;
        if (['summaries', 'topics', 'questions', 'revision', 'flashcards'].includes(viewName)) {
            targetId = 'results-view';
            setTimeout(() => {
                const sectionMap = {
                    'summaries': 'summarySection',
                    'topics': 'topicsSection',
                    'questions': 'questionsSection',
                    'revision': 'revisionSection',
                    'flashcards': 'flashcardsSection'
                };
                const el = document.getElementById(sectionMap[viewName]);
                if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }

        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        const titleMap = {
            'dashboard': 'Dashboard',
            'analyzer': 'Notes Analyzer',
            'results': 'Analysis Results',
            'summaries': 'Summaries',
            'topics': 'Important Topics',
            'questions': 'Exam Questions',
            'revision': 'Quick Revision',
            'flashcards': 'Flashcards',
            'settings': 'Settings'
        };
        if (elements.currentPageTitle) {
            elements.currentPageTitle.textContent = titleMap[viewName] || 'Dashboard';
        }

        closeMobileSidebar();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function openMobileSidebar() {
        elements.sidebar.classList.add('mobile-open');
        elements.sidebarOverlay.classList.add('active');
    }

    function closeMobileSidebar() {
        elements.sidebar.classList.remove('mobile-open');
        elements.sidebarOverlay.classList.remove('active');
    }

    // ----------------------------------------------------------------------
    // 6. Marks Selection Controls (Requirement 4)
    // ----------------------------------------------------------------------
    function getSelectedMarks() {
        if (!elements.marksChipsGrid) return [2, 5, 10];
        const checkedChips = elements.marksChipsGrid.querySelectorAll('input[type="checkbox"]:checked');
        const marks = Array.from(checkedChips).map(cb => parseInt(cb.value, 10)).filter(n => !isNaN(n));
        return marks.sort((a, b) => a - b);
    }

    function setSelectedMarksUI(marks) {
        if (!elements.marksChipsGrid) return;
        const chips = elements.marksChipsGrid.querySelectorAll('.mark-chip');
        chips.forEach(chip => {
            const input = chip.querySelector('input[type="checkbox"]');
            if (input) {
                const val = parseInt(input.value, 10);
                const isChecked = marks.includes(val);
                input.checked = isChecked;
                chip.classList.toggle('checked', isChecked);
            }
        });
    }

    function setupMarksSelectionListeners() {
        if (!elements.marksChipsGrid) return;

        // Chip click toggles
        elements.marksChipsGrid.querySelectorAll('.mark-chip').forEach(chip => {
            const cb = chip.querySelector('input[type="checkbox"]');
            chip.addEventListener('click', (e) => {
                if (e.target !== cb) {
                    cb.checked = !cb.checked;
                }
                chip.classList.toggle('checked', cb.checked);
            });
        });

        // Select All button
        if (elements.selectAllMarksBtn) {
            elements.selectAllMarksBtn.addEventListener('click', () => {
                elements.marksChipsGrid.querySelectorAll('.mark-chip').forEach(chip => {
                    const cb = chip.querySelector('input[type="checkbox"]');
                    if (cb) {
                        cb.checked = true;
                        chip.classList.add('checked');
                    }
                });
                showToast('Selected all marks categories (1 to 15 marks)', 'info');
            });
        }

        // Clear Selection button
        if (elements.clearAllMarksBtn) {
            elements.clearAllMarksBtn.addEventListener('click', () => {
                elements.marksChipsGrid.querySelectorAll('.mark-chip').forEach(chip => {
                    const cb = chip.querySelector('input[type="checkbox"]');
                    if (cb) {
                        cb.checked = false;
                        chip.classList.remove('checked');
                    }
                });
                showToast('Cleared marks selection', 'info');
            });
        }
    }

    // ----------------------------------------------------------------------
    // 7. File Upload & Text Area Handlers (Strict Document Isolation)
    // ----------------------------------------------------------------------
    function handleFileSelect(file) {
        if (!file) return;

        const allowedExtensions = ['txt', 'pdf', 'docx', 'jpg', 'jpeg', 'png', 'webp', 'heic'];
        const ext = file.name.split('.').pop().toLowerCase();

        if (!allowedExtensions.includes(ext)) {
            showToast('Unsupported file type. Please upload PDF, DOCX, TXT, or Image files.', 'error');
            return;
        }

        // Strict Document Isolation: Reset any previous analysis and document state
        state.uploadedFile = file;
        state.analysisData = null;
        state.documentInfo = null;
        state.warnings = [];
        state.notesText = '';

        elements.fileName.textContent = file.name;
        elements.fileSize.textContent = `(${(file.size / 1024).toFixed(1)} KB)`;
        elements.fileDetailsBox.style.display = 'flex';
        elements.uploadDropzone.style.display = 'none';

        // Auto-detect subject hint from filename if user hasn't specified one
        if (!elements.subjectInput.value.trim()) {
            const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
            elements.subjectInput.value = cleanName;
        }

        if (ext === 'txt') {
            const reader = new FileReader();
            reader.onload = (e) => {
                elements.notesTextarea.value = e.target.result;
                state.notesText = e.target.result;
                updateCharCounter();
            };
            reader.readAsText(file);
        } else {
            // NEVER inject hardcoded Data Structures text!
            elements.notesTextarea.value = `[Attached Document: ${file.name} (${(file.size / 1024).toFixed(1)} KB)]\nSummora AI will extract full multi-page text using chunking & OCR upon clicking "Analyze Notes".`;
            updateCharCounter();
        }

        showToast(`Document "${file.name}" attached successfully!`, 'success');
    }

    function removeFile() {
        state.uploadedFile = null;
        state.documentInfo = null;
        elements.fileInput.value = '';
        elements.fileDetailsBox.style.display = 'none';
        elements.uploadDropzone.style.display = 'block';
        showToast('Document detached', 'info');
    }

    function updateCharCounter() {
        const text = elements.notesTextarea.value;
        const len = text.length;
        elements.charCounter.textContent = `${len.toLocaleString()} characters`;
    }

    function clearNotes() {
        elements.notesTextarea.value = '';
        removeFile();
        updateCharCounter();
        showToast('Notes cleared', 'info');
    }

    // Completely reset document state for new upload (Requirement 2 & 6)
    function resetDocumentState() {
        state.uploadedFile = null;
        state.notesText = '';
        state.subject = '';
        state.analysisData = null;
        state.documentInfo = null;
        state.warnings = [];

        elements.subjectInput.value = '';
        elements.notesTextarea.value = '';
        elements.fileInput.value = '';
        elements.fileDetailsBox.style.display = 'none';
        elements.uploadDropzone.style.display = 'block';
        updateCharCounter();

        // Clear all results views to prevent stale questions/topics leakage
        elements.resultSubjectTitle.textContent = 'Document Study Pack';
        elements.summaryShortText.textContent = '';
        elements.summaryMainConcepts.innerHTML = '';
        elements.summaryImportantPoints.innerHTML = '';
        elements.topicsContainer.innerHTML = '';
        elements.definitionsContainer.innerHTML = '';
        elements.questionsContainer.innerHTML = '';
        elements.questionsCategoryTabs.innerHTML = '';
        elements.revisionContainer.innerHTML = '';
        elements.difficultContainer.innerHTML = '';
        if (elements.formulasSection) elements.formulasSection.style.display = 'none';
        if (elements.docWarningsBox) elements.docWarningsBox.style.display = 'none';

        switchView('analyzer');
        showToast('Ready for new study material upload.', 'info');
    }

    // ----------------------------------------------------------------------
    // 8. API Communication & AI Processing Engine
    // ----------------------------------------------------------------------
    function getApiUrl(endpoint) {
        if (window.location.protocol.startsWith('http')) {
            return endpoint;
        }
        return `http://localhost:3000${endpoint}`;
    }

    async function checkApiStatus(showToastNotification = false) {
        try {
            const res = await fetch(getApiUrl('/api/status'));
            if (res.ok) {
                const data = await res.json();
                state.isDemoMode = !data.hasApiKey;
            } else {
                state.isDemoMode = false;
            }
        } catch (err) {
            state.isDemoMode = false;
        }

        if (!state.isDemoMode) {
            if (elements.apiStatusText) {
                elements.apiStatusText.textContent = 'Live AI Mode (Google Gemini Connected)';
                elements.apiStatusText.style.color = 'var(--success)';
            }
            if (elements.demoBanner) elements.demoBanner.style.display = 'none';
            
            if (elements.modeBadge) {
                elements.modeBadge.className = 'mode-badge live';
                elements.modeBadgeText.textContent = 'Live AI Mode';
                elements.modeBadgeIcon.className = 'fa-solid fa-circle-check';
            }
            if (showToastNotification) {
                showToast('Google Gemini AI is active and connected live!', 'success');
            }
        } else {
            if (elements.apiStatusText) {
                elements.apiStatusText.textContent = 'API Key Missing (Configure in .env)';
                elements.apiStatusText.style.color = 'var(--warning)';
            }
            if (elements.demoBanner) elements.demoBanner.style.display = 'flex';
            
            if (elements.modeBadge) {
                elements.modeBadge.className = 'mode-badge demo';
                elements.modeBadgeText.textContent = 'Setup Needed';
                elements.modeBadgeIcon.className = 'fa-solid fa-bolt';
            }
        }
    }

    async function analyzeNotes() {
        const text = elements.notesTextarea.value.trim();
        const subject = elements.subjectInput.value.trim();
        const examDate = elements.examDateInput.value;

        // Strict Requirement 2: No uploaded source material means no analysis
        const isAttachmentPlaceholder = text.startsWith('[Attached Document:');
        if (!state.uploadedFile && (!text || isAttachmentPlaceholder)) {
            showToast('Please upload a study material file or paste notes first.', 'error');
            return;
        }

        // Get selected options
        const checkboxes = elements.optionsGrid.querySelectorAll('input[type="checkbox"]:checked');
        const selectedOptions = Array.from(checkboxes).map(cb => cb.value);

        if (selectedOptions.length === 0) {
            showToast('Please select at least one analysis option checkbox.', 'error');
            return;
        }

        // Get selected marks (Requirement 4)
        const selectedMarks = getSelectedMarks();
        if (selectedMarks.length === 0) {
            showToast('Please select at least one examination marks category (e.g. 2, 5, 10).', 'error');
            return;
        }
        state.selectedMarks = selectedMarks;
        state.questionsPerTopic = parseInt(elements.questionsPerTopicSelect.value, 10) || 5;

        // Show loading state with clear progress indicator
        elements.analyzeBtn.disabled = true;
        elements.loadingOverlay.style.display = 'block';
        if (elements.loadingStatusText) {
            elements.loadingStatusText.textContent = state.uploadedFile
                ? `Extracting & chunking ${state.uploadedFile.name} with OCR & AI analysis...`
                : `Analyzing text material and generating grounded questions for ${selectedMarks.join(', ')} marks...`;
        }
        elements.loadingOverlay.scrollIntoView({ behavior: 'smooth' });

        state.subject = subject || (state.uploadedFile ? state.uploadedFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') : 'General Notes');
        state.examDate = examDate;

        try {
            const formData = new FormData();
            formData.append('notesText', isAttachmentPlaceholder ? '' : text);
            formData.append('subject', state.subject);
            formData.append('examDate', examDate);
            formData.append('options', JSON.stringify(selectedOptions));
            formData.append('selectedMarks', JSON.stringify(selectedMarks));
            formData.append('questionsPerTopic', state.questionsPerTopic);
            if (state.uploadedFile) {
                formData.append('file', state.uploadedFile);
            }

            const response = await fetch(getApiUrl('/api/analyze'), {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `Server returned error ${response.status}`);
            }

            const resData = await response.json();
            if (!resData || !resData.result) {
                throw new Error('Analysis completed but no structured data was received from the server.');
            }

            if (resData.extractedText) {
                state.notesText = resData.extractedText;
                elements.notesTextarea.value = resData.extractedText;
                updateCharCounter();
            }

            state.analysisData = resData.result;
            state.documentInfo = resData.document || null;
            state.warnings = resData.warnings || [];

            renderAnalysisResults(state.analysisData, state.documentInfo, state.warnings);
            saveNoteToHistory(state.subject, (state.notesText || state.subject).substring(0, 40) + '...');
            switchView('results');
            showToast('Summora AI analysis successfully generated!', 'success');

        } catch (err) {
            console.error('Analysis error:', err);
            // Strict Requirement 2 & 7: Do NOT replace failed analysis with sample data!
            showToast('Analysis error: ' + (err.message || 'Could not complete AI analysis.'), 'error');
        } finally {
            elements.analyzeBtn.disabled = false;
            elements.loadingOverlay.style.display = 'none';
        }
    }

    // ----------------------------------------------------------------------
    // 9. Results Rendering Logic (Requirement 6)
    // ----------------------------------------------------------------------
    function renderAnalysisResults(data, docInfo, warnings) {
        if (!data) return;

        elements.resultSubjectTitle.textContent = data.document?.detectedSubject || state.subject || 'Document Study Pack';
        elements.resultMetaDate.textContent = `Target Exam: ${state.examDate || 'Upcoming'} • Analyzed: ${new Date().toLocaleDateString()}`;

        // 1. Document Information & Warnings (Requirement 6.1 & 6.6)
        if (elements.docInfoSection) {
            elements.docFilename.textContent = docInfo?.filename || state.uploadedFile?.name || 'Direct Input Notes';
            elements.docDetectedSubject.textContent = data.document?.detectedSubject || docInfo?.detectedSubject || state.subject || 'General Study Material';
            
            const pages = docInfo?.pageCount || data.document?.pageCount;
            const chars = docInfo?.characterCount || state.notesText?.length || 0;
            elements.docPageCoverage.textContent = pages ? `${pages} Page${pages > 1 ? 's' : ''} (${chars.toLocaleString()} chars)` : `${chars.toLocaleString()} chars`;
            
            const status = docInfo?.extractionStatus || data.document?.extractionStatus || 'Complete';
            elements.docStatus.textContent = status;
            elements.docStatus.className = `meta-val status-badge ${status === 'Complete' ? 'success' : 'ready'}`;

            const allWarnings = [
                ...(warnings || []),
                ...(data.warnings || [])
            ].filter(Boolean);

            if (allWarnings.length > 0) {
                elements.docWarningsBox.style.display = 'flex';
                elements.docWarningsText.innerHTML = allWarnings.map(w => `<div>• ${escapeHTML(w)}</div>`).join('');
            } else {
                elements.docWarningsBox.style.display = 'none';
            }
        }

        // 2. Summary (Requirement 6.2)
        if (data.summary) {
            elements.summaryShortText.textContent = data.summary.shortSummary || 'Summary unavailable.';
            elements.summaryMainConcepts.innerHTML = (data.summary.mainConcepts || [])
                .map(item => `<li>${escapeHTML(item)}</li>`).join('');
            elements.summaryImportantPoints.innerHTML = (data.summary.importantPoints || [])
                .map(item => `<li>${escapeHTML(item)}</li>`).join('');
        }

        // 3. Important Topics (Requirement 6.3)
        const topicsList = data.topics || data.importantTopics || [];
        if (topicsList.length > 0) {
            elements.topicsContainer.innerHTML = topicsList.map(topic => {
                const refs = topic.sourceReferences && topic.sourceReferences.length > 0
                    ? `<div class="topic-ref" style="margin-top: 6px; font-size: 0.8rem; color: var(--text-muted);"><i class="fa-solid fa-bookmark"></i> Source: ${escapeHTML(topic.sourceReferences.join(', '))}</div>`
                    : '';
                const why = topic.whyItMatters
                    ? `<div class="topic-why" style="margin-top: 6px; font-size: 0.85rem; color: var(--primary);"><strong>Why it matters:</strong> ${escapeHTML(topic.whyItMatters)}</div>`
                    : '';
                return `
                    <div class="topic-item-card ${topic.level ? topic.level.toLowerCase() : 'medium'}">
                        <div class="topic-card-header">
                            <h4>${escapeHTML(topic.name)}</h4>
                            <span class="level-badge ${topic.level ? topic.level.toLowerCase() : 'medium'}">${escapeHTML(topic.level || 'HIGH')}</span>
                        </div>
                        <p>${escapeHTML(topic.explanation)}</p>
                        ${why}
                        ${refs}
                    </div>
                `;
            }).join('');
        } else {
            elements.topicsContainer.innerHTML = `<div style="text-align:center; padding: 20px; color: var(--text-muted);">No topics extracted.</div>`;
        }

        // 4. Key Definitions
        if (data.definitions && data.definitions.length > 0) {
            elements.definitionsContainer.innerHTML = data.definitions.map(def => `
                <div class="definition-card">
                    <div class="definition-term">${escapeHTML(def.term)}</div>
                    <div class="definition-text">${escapeHTML(def.definition)}</div>
                    ${def.example ? `<div class="definition-example"><strong>Example:</strong> ${escapeHTML(def.example)}</div>` : ''}
                </div>
            `).join('');
        } else {
            elements.definitionsContainer.innerHTML = `<div style="text-align:center; padding: 20px; color: var(--text-muted);">No key definitions detected.</div>`;
        }

        // 5. Formulas, Definitions & Key Points (Requirement 6.5)
        if (elements.formulasSection) {
            if (data.formulas && data.formulas.length > 0) {
                elements.formulasSection.style.display = 'block';
                elements.formulasContainer.innerHTML = data.formulas.map(f => `
                    <div class="formula-card" style="background: var(--bg-card); padding: 14px 18px; border-radius: 10px; border-left: 4px solid var(--primary); margin-bottom: 12px; box-shadow: var(--shadow-sm);">
                        <div class="formula-title" style="font-weight: 600; color: var(--text); display: flex; align-items: center; gap: 8px;">
                            <i class="fa-solid fa-calculator" style="color: var(--primary);"></i> ${escapeHTML(f.name)}
                        </div>
                        <div class="formula-code" style="margin: 8px 0; background: rgba(0,0,0,0.05); padding: 6px 12px; border-radius: 6px; font-family: monospace; font-size: 0.95rem;">
                            <code>${escapeHTML(f.formula)}</code>
                        </div>
                        ${f.context ? `<div class="formula-desc" style="font-size: 0.85rem; color: var(--text-muted);">${escapeHTML(f.context)}</div>` : ''}
                    </div>
                `).join('');
            } else {
                elements.formulasSection.style.display = 'none';
            }
        }

        // 6. Exam Questions by Marks (Requirement 3, 4, 6.4)
        renderExamQuestionsByMarks(data, 'all');

        // 7. Quick Revision Notes
        if (data.revisionNotes && data.revisionNotes.length > 0) {
            elements.revisionContainer.innerHTML = data.revisionNotes.map(note => `
                <li class="revision-item">
                    <i class="fa-solid fa-bolt"></i>
                    <span>${escapeHTML(note)}</span>
                </li>
            `).join('');
        }

        // 8. Difficult Concepts
        if (data.difficultConcepts && data.difficultConcepts.length > 0) {
            elements.difficultContainer.innerHTML = data.difficultConcepts.map(item => `
                <div class="difficult-concept-card">
                    <div class="difficult-concept-title"><i class="fa-solid fa-circle-question"></i> ${escapeHTML(item.topic)}</div>
                    <div class="difficult-why">Why it may be tricky: ${escapeHTML(item.whyDifficult)}</div>
                    <div class="difficult-explanation">
                        <strong>Simplified Explanation:</strong> ${escapeHTML(item.simpleExplanation)}
                    </div>
                </div>
            `).join('');
        }

        // 9. Flashcards
        if (data.flashcards && data.flashcards.length > 0) {
            state.currentFlashcardIndex = 0;
            state.isCardFlipped = false;
            renderCurrentFlashcard();
        }
    }

    // Helper: Normalize question models across format schemas
    function getNormalizedQuestions(data) {
        if (!data) return [];
        let list = [];

        // Structured schema: data.questionsByMarks = [{ marks: N, questions: [...] }]
        if (Array.isArray(data.questionsByMarks)) {
            data.questionsByMarks.forEach(group => {
                const markNum = parseInt(group.marks, 10);
                (group.questions || []).forEach(q => {
                    list.push({
                        marks: markNum,
                        topic: q.topic || 'Core Concept',
                        question: q.question,
                        difficulty: q.difficulty || 'Medium',
                        answerOutline: q.answerOutline || '',
                        sourceReferences: q.sourceReferences || [],
                        isInferred: !!q.isInferred
                    });
                });
            });
        }

        // Legacy format: data.examQuestions = { twoMark: [...], ... }
        if (list.length === 0 && data.examQuestions) {
            const map = { twoMark: 2, fiveMark: 5, tenMark: 10, fifteenMark: 15 };
            Object.keys(data.examQuestions).forEach(k => {
                const m = map[k] || 5;
                (data.examQuestions[k] || []).forEach(q => {
                    list.push({
                        marks: m,
                        topic: q.topic || 'General',
                        question: q.question,
                        difficulty: q.difficulty || 'Medium',
                        answerOutline: q.answerOutline || '',
                        sourceReferences: q.sourceReferences || [],
                        isInferred: false
                    });
                });
            });
        }

        return list;
    }

    function renderExamQuestionsByMarks(data, markFilter = 'all') {
        const allQuestions = getNormalizedQuestions(data);

        // Update Total Question Count Badges
        const totalCount = allQuestions.length;
        if (elements.totalQuestionsCountBadge) {
            elements.totalQuestionsCountBadge.textContent = `${totalCount} Questions`;
        }

        // Dynamically create category tabs based on marks present in the questions
        const presentMarks = [...new Set(allQuestions.map(q => q.marks))].sort((a, b) => a - b);
        
        if (elements.questionsCategoryTabs) {
            let tabsHtml = `<button class="q-tab-btn ${markFilter === 'all' ? 'active' : ''}" data-marks="all">All Selected Marks (${totalCount})</button>`;
            presentMarks.forEach(m => {
                const count = allQuestions.filter(q => q.marks === m).length;
                tabsHtml += `<button class="q-tab-btn ${markFilter === String(m) ? 'active' : ''}" data-marks="${m}">${m} Mark${m > 1 ? 's' : ''} (${count})</button>`;
            });
            elements.questionsCategoryTabs.innerHTML = tabsHtml;

            // Attach tab click events
            elements.questionsCategoryTabs.querySelectorAll('.q-tab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    elements.questionsCategoryTabs.querySelectorAll('.q-tab-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    const selected = btn.getAttribute('data-marks');
                    renderExamQuestionsByMarks(data, selected);
                });
            });
        }

        // Filter questions by selected tab
        const filtered = markFilter === 'all' 
            ? allQuestions 
            : allQuestions.filter(q => q.marks === parseInt(markFilter, 10));

        if (filtered.length === 0) {
            elements.questionsContainer.innerHTML = `<div style="text-align:center; padding: 24px; color: var(--text-muted);">No questions found for this mark category.</div>`;
            return;
        }

        // Render Question Cards with grounded topic, mark badge, and answer outline
        elements.questionsContainer.innerHTML = filtered.map(q => {
            const answerSection = q.answerOutline ? `
                <div class="answer-outline" style="margin-top: 10px; padding: 10px 14px; background: rgba(0,0,0,0.025); border-left: 3px solid var(--primary); border-radius: 6px; font-size: 0.88rem; line-height: 1.5;">
                    <div style="font-weight: 600; color: var(--primary); margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                        <i class="fa-solid fa-lightbulb"></i> Answer Outline:
                    </div>
                    <div>${escapeHTML(q.answerOutline)}</div>
                </div>
            ` : '';

            const refSection = q.sourceReferences && q.sourceReferences.length > 0 ? `
                <span class="source-ref" style="font-size: 0.8rem; color: var(--text-muted);"><i class="fa-solid fa-bookmark"></i> Ref: ${escapeHTML(q.sourceReferences.join(', '))}</span>
            ` : '';

            return `
                <div class="question-card" style="margin-bottom: 14px; padding: 16px; border-radius: 12px; background: var(--bg-card); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
                    <div class="question-card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <span class="subject-tag" style="background: var(--primary-light); color: var(--primary); padding: 3px 8px; border-radius: 6px; font-weight: 600; font-size: 0.8rem;">
                                ${q.marks} Mark${q.marks > 1 ? 's' : ''}
                            </span>
                            ${q.isInferred ? '<span class="diff-badge" style="background: rgba(245,158,11,0.15); color: #d97706; padding: 3px 8px; border-radius: 6px; font-size: 0.75rem;">Exam Application</span>' : ''}
                        </div>
                        <span class="diff-badge ${q.difficulty ? q.difficulty.toLowerCase() : 'medium'}">${escapeHTML(q.difficulty || 'Medium')}</span>
                    </div>
                    <div class="question-text" style="font-weight: 500; font-size: 1rem; color: var(--text); margin-bottom: 8px;">${escapeHTML(q.question)}</div>
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                        <div class="question-topic-tag" style="font-size: 0.82rem; color: var(--text-muted);"><i class="fa-solid fa-tag"></i> Topic: <strong>${escapeHTML(q.topic)}</strong></div>
                        ${refSection}
                    </div>
                    ${answerSection}
                </div>
            `;
        }).join('');
    }

    // ----------------------------------------------------------------------
    // 10. Regenerate Questions on Demand (Requirement 4)
    // ----------------------------------------------------------------------
    async function handleRegenerateQuestions() {
        if (!state.notesText) {
            showToast('Please analyze a document first to regenerate questions.', 'warning');
            return;
        }

        const marks = getSelectedMarks();
        if (marks.length === 0) {
            showToast('Please select at least one mark category in the analyzer settings.', 'warning');
            return;
        }

        elements.moreQuestionsBtn.disabled = true;
        elements.moreQuestionsBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Regenerating Questions...';

        try {
            const response = await fetch(getApiUrl('/api/regenerate-questions'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    extractedText: state.notesText,
                    selectedMarks: marks,
                    questionsPerTopic: parseInt(elements.questionsPerTopicSelect?.value, 10) || 5,
                    subject: state.subject
                })
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || `Regeneration failed (${response.status})`);
            }

            const data = await response.json();
            if (data.questionsByMarks) {
                if (!state.analysisData) state.analysisData = {};
                state.analysisData.questionsByMarks = data.questionsByMarks;
                renderExamQuestionsByMarks(state.analysisData, 'all');
                showToast(`Questions regenerated for ${marks.join(', ')} marks!`, 'success');
            }
        } catch (err) {
            console.error('Regenerate questions error:', err);
            showToast('Could not regenerate questions: ' + err.message, 'error');
        } finally {
            elements.moreQuestionsBtn.disabled = false;
            elements.moreQuestionsBtn.innerHTML = '<i class="fa-solid fa-sliders"></i> Change Marks & Regenerate Questions';
        }
    }

    // ----------------------------------------------------------------------
    // 11. Interactive Flashcards Controller
    // ----------------------------------------------------------------------
    function renderCurrentFlashcard() {
        const cards = state.analysisData?.flashcards || [];
        if (cards.length === 0) return;

        const card = cards[state.currentFlashcardIndex];
        elements.flashcardElement.classList.remove('flipped');
        state.isCardFlipped = false;

        setTimeout(() => {
            elements.fcFrontText.textContent = card.front;
            elements.fcBackText.textContent = card.back;
        }, 150);

        elements.fcCounter.textContent = `Card ${state.currentFlashcardIndex + 1} of ${cards.length}`;
    }

    function flipFlashcard() {
        state.isCardFlipped = !state.isCardFlipped;
        elements.flashcardElement.classList.toggle('flipped', state.isCardFlipped);
    }

    function nextFlashcard() {
        const cards = state.analysisData?.flashcards || [];
        if (cards.length === 0) return;
        state.currentFlashcardIndex = (state.currentFlashcardIndex + 1) % cards.length;
        renderCurrentFlashcard();
    }

    function prevFlashcard() {
        const cards = state.analysisData?.flashcards || [];
        if (cards.length === 0) return;
        state.currentFlashcardIndex = (state.currentFlashcardIndex - 1 + cards.length) % cards.length;
        renderCurrentFlashcard();
    }

    // ----------------------------------------------------------------------
    // 12. Floating AI Chatbot Engine (Document Grounded)
    // ----------------------------------------------------------------------
    function toggleChatPanel() {
        elements.chatPanel.classList.toggle('active');
        if (elements.chatPanel.classList.contains('active')) {
            elements.chatInput.focus();
        }
    }

    async function handleChatMessage(userText) {
        if (!userText.trim()) return;

        appendMessage('user', userText);
        elements.chatInput.value = '';

        const botMsgDiv = appendMessage('bot', '<i class="fa-solid fa-ellipsis fa-beat"></i> Thinking...');

        try {
            const response = await fetch(getApiUrl('/api/chat'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userText,
                    notesContext: state.notesText || JSON.stringify(state.analysisData || {}),
                    subject: state.subject,
                    chatHistory: state.chatHistory
                })
            });

            let replyText;
            if (response.ok) {
                const data = await response.json();
                replyText = data.reply || 'No response returned.';
            } else {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || 'Chat request failed');
            }

            botMsgDiv.querySelector('.msg-bubble').innerHTML = formatMarkdown(replyText);
            state.chatHistory.push({ sender: 'user', text: userText }, { sender: 'bot', text: replyText });

        } catch (err) {
            console.error('Chat error:', err);
            botMsgDiv.querySelector('.msg-bubble').textContent = "I couldn't process your request: " + (err.message || 'Unknown error');
        }

        elements.chatBody.scrollTop = elements.chatBody.scrollHeight;
    }

    function appendMessage(sender, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-msg ${sender}`;
        msgDiv.innerHTML = `<div class="msg-bubble">${text}</div>`;
        elements.chatBody.appendChild(msgDiv);
        elements.chatBody.scrollTop = elements.chatBody.scrollHeight;
        return msgDiv;
    }

    // ----------------------------------------------------------------------
    // 13. Download Study Pack Feature (Requirement 6)
    // ----------------------------------------------------------------------
    function downloadStudyPack() {
        if (!state.analysisData) {
            showToast('No analyzed content available to download.', 'error');
            return;
        }

        const data = state.analysisData;
        const subject = data.document?.detectedSubject || state.subject || 'Study_Material';
        let fileContent = `====================================================\n`;
        fileContent += `  Summora AI – Exam Ready Study Pack\n`;
        fileContent += `  Document: ${elements.docFilename?.textContent || 'Study Material'}\n`;
        fileContent += `  Subject: ${subject}\n`;
        fileContent += `  Coverage: ${elements.docPageCoverage?.textContent || 'N/A'}\n`;
        fileContent += `  Date: ${new Date().toLocaleDateString()}\n`;
        fileContent += `====================================================\n\n`;

        if (state.warnings && state.warnings.length > 0) {
            fileContent += `[ SOURCE COVERAGE & NOTICES ]\n`;
            state.warnings.forEach(w => fileContent += `⚠ ${w}\n`);
            fileContent += `\n`;
        }

        fileContent += `[ 1. SUMMARY ]\n${data.summary?.shortSummary || ''}\n\n`;
        
        fileContent += `[ MAIN CONCEPTS ]\n`;
        (data.summary?.mainConcepts || []).forEach(c => fileContent += `- ${c}\n`);
        fileContent += `\n`;

        fileContent += `[ 2. IMPORTANT TOPICS ]\n`;
        const topicsList = data.topics || data.importantTopics || [];
        topicsList.forEach(t => {
            fileContent += `• [${t.level || 'IMPORTANT'}] ${t.name}: ${t.explanation}\n`;
            if (t.whyItMatters) fileContent += `  Why it matters: ${t.whyItMatters}\n`;
            if (t.sourceReferences && t.sourceReferences.length > 0) fileContent += `  References: ${t.sourceReferences.join(', ')}\n`;
        });
        fileContent += `\n`;

        if (data.formulas && data.formulas.length > 0) {
            fileContent += `[ 3. FORMULAS & CORE RULES ]\n`;
            data.formulas.forEach(f => {
                fileContent += `• ${f.name}: ${f.formula}\n`;
                if (f.context) fileContent += `  Context: ${f.context}\n`;
            });
            fileContent += `\n`;
        }

        fileContent += `[ 4. KEY DEFINITIONS ]\n`;
        (data.definitions || []).forEach(d => {
            fileContent += `• ${d.term}: ${d.definition}\n  Example: ${d.example || 'N/A'}\n`;
        });
        fileContent += `\n`;

        fileContent += `[ 5. PREDICTED EXAM QUESTIONS BY MARKS ]\n`;
        const normalizedQ = getNormalizedQuestions(data);
        const marksList = [...new Set(normalizedQ.map(q => q.marks))].sort((a, b) => a - b);
        marksList.forEach(m => {
            fileContent += `\n--- ${m} MARKS QUESTIONS ---\n`;
            const qInMark = normalizedQ.filter(q => q.marks === m);
            qInMark.forEach((q, idx) => {
                fileContent += `${idx + 1}. [Topic: ${q.topic}] ${q.question} (${q.difficulty || 'Medium'})\n`;
                if (q.sourceReferences && q.sourceReferences.length > 0) {
                    fileContent += `   Source: ${q.sourceReferences.join(', ')}\n`;
                }
                if (q.answerOutline) {
                    fileContent += `   Answer Outline: ${q.answerOutline}\n`;
                }
            });
        });

        fileContent += `\n\n[ 6. QUICK REVISION BULLETS ]\n`;
        (data.revisionNotes || []).forEach(r => fileContent += `✔ ${r}\n`);

        const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${subject.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_StudyPack.txt`;
        link.click();
        URL.revokeObjectURL(link.href);

        showToast('Study Pack text file downloaded!', 'success');
    }

    // ----------------------------------------------------------------------
    // 14. Search & Highlights
    // ----------------------------------------------------------------------
    function handleSearch() {
        const query = elements.searchInput.value.toLowerCase().trim();
        const activeView = document.querySelector('.view-section.active');
        if (!activeView) return;

        if (!query) {
            removeHighlights(activeView);
            return;
        }
        highlightSearchText(activeView, query);
    }

    function highlightSearchText(container, query) {
        removeHighlights(container);
        if (!query) return;

        const walk = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
        const nodesToReplace = [];

        let node;
        while (node = walk.nextNode()) {
            if (node.parentNode.nodeName !== 'SCRIPT' && 
                node.parentNode.nodeName !== 'STYLE' && 
                node.parentNode.nodeName !== 'MARK' &&
                node.parentNode.nodeName !== 'TEXTAREA' &&
                node.parentNode.nodeName !== 'INPUT') {
                if (node.nodeValue.toLowerCase().includes(query)) {
                    nodesToReplace.push(node);
                }
            }
        }

        nodesToReplace.forEach(node => {
            const span = document.createElement('span');
            const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
            span.innerHTML = node.nodeValue.replace(regex, '<mark>$1</mark>');
            node.parentNode.replaceChild(span, node);
        });
    }

    function removeHighlights(container) {
        const marks = container.querySelectorAll('mark');
        marks.forEach(mark => {
            const parent = mark.parentNode;
            parent.replaceChild(document.createTextNode(mark.textContent), mark);
            parent.normalize();
        });
    }

    // ----------------------------------------------------------------------
    // 15. Recent Notes & Local Storage Helpers
    // ----------------------------------------------------------------------
    function renderRecentNotes() {
        if (!elements.recentNotesGrid) return;

        if (state.recentNotes.length === 0) {
            elements.recentNotesGrid.innerHTML = `
                <div class="empty-notes-card">
                    <i class="fa-solid fa-file-circle-plus"></i>
                    <h4>No study notes analyzed yet</h4>
                    <p>Upload your lecture slides, textbook PDF, or paste notes to generate exam summaries and practice questions.</p>
                    <button class="btn-primary-sm" id="emptyAnalyzeBtn">
                        <i class="fa-solid fa-plus"></i> Analyze Your First Notes
                    </button>
                </div>
            `;
            const emptyBtn = document.getElementById('emptyAnalyzeBtn');
            if (emptyBtn) emptyBtn.addEventListener('click', () => switchView('analyzer'));
            return;
        }

        elements.recentNotesGrid.innerHTML = state.recentNotes.map(item => `
            <div class="note-card">
                <div class="note-card-header">
                    <span class="subject-tag">${escapeHTML(item.subject)}</span>
                    <span class="status-badge ready"><i class="fa-solid fa-circle-check"></i> ${escapeHTML(item.status)}</span>
                </div>
                <div class="note-card-body">
                    <h4>${escapeHTML(item.topic)}</h4>
                    <p>Analyzed study material ready for revision and practice questions.</p>
                </div>
                <div class="note-card-footer">
                    <span><i class="fa-regular fa-clock"></i> ${escapeHTML(item.date)}</span>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-secondary-sm view-recent-btn" data-id="${item.id}">View</button>
                        <button class="delete-note-btn" data-id="${item.id}" aria-label="Delete Note" style="background: transparent; border: none; color: var(--danger); font-size: 1.1rem; cursor: pointer; padding: 4px;"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                </div>
            </div>
        `).join('');

        // View button
        document.querySelectorAll('.view-recent-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                switchView('results');
                showToast('Loaded saved note analysis view.', 'info');
            });
        });

        // Delete button
        document.querySelectorAll('.delete-note-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idToDelete = btn.getAttribute('data-id');
                if (confirm('Delete this study topic?')) {
                    state.recentNotes = state.recentNotes.filter(n => n.id !== idToDelete);
                    localStorage.setItem('summora_recent_notes', JSON.stringify(state.recentNotes));
                    renderRecentNotes();
                    showToast('Topic deleted.', 'info');
                }
            });
        });
    }

    function saveNoteToHistory(subject, topicSnippet) {
        const newNote = {
            id: Date.now().toString(),
            subject: subject,
            topic: topicSnippet || 'Lecture Study Material',
            date: new Date().toISOString().split('T')[0],
            status: 'Ready'
        };
        state.recentNotes.unshift(newNote);
        if (state.recentNotes.length > 10) state.recentNotes.pop();
        localStorage.setItem('summora_recent_notes', JSON.stringify(state.recentNotes));
        renderRecentNotes();
    }

    // ----------------------------------------------------------------------
    // 16. Toast Notifications Engine
    // ----------------------------------------------------------------------
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const iconMap = {
            'success': 'fa-circle-check',
            'error': 'fa-circle-exclamation',
            'warning': 'fa-triangle-exclamation',
            'info': 'fa-circle-info'
        };

        toast.innerHTML = `
            <i class="fa-solid ${iconMap[type] || 'fa-circle-info'}"></i>
            <span>${escapeHTML(message)}</span>
        `;

        if (elements.toastContainer) {
            elements.toastContainer.appendChild(toast);

            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(100%)';
                toast.style.transition = 'all 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }, 3200);
        }
    }

    // ----------------------------------------------------------------------
    // 17. Helper Utilities
    // ----------------------------------------------------------------------
    function escapeHTML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function escapeRegExp(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function formatMarkdown(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }

    // ----------------------------------------------------------------------
    // 18. Event Listeners Setup
    // ----------------------------------------------------------------------
    function setupEventListeners() {
        // Theme Toggle
        if (elements.themeToggleBtn) elements.themeToggleBtn.addEventListener('click', toggleTheme);

        // Sidebar Navigation
        elements.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = link.getAttribute('data-view');
                if (view) switchView(view);
            });
        });

        // Mobile Sidebar Controls
        if (elements.menuToggleBtn) elements.menuToggleBtn.addEventListener('click', openMobileSidebar);
        if (elements.sidebarCloseBtn) elements.sidebarCloseBtn.addEventListener('click', closeMobileSidebar);
        if (elements.sidebarOverlay) elements.sidebarOverlay.addEventListener('click', closeMobileSidebar);

        // New Analysis Quick Trigger
        if (elements.newAnalysisBtn) {
            elements.newAnalysisBtn.addEventListener('click', resetDocumentState);
        }

        // Upload Another File Trigger (Requirement 6)
        if (elements.uploadAnotherBtn) {
            elements.uploadAnotherBtn.addEventListener('click', resetDocumentState);
        }

        // File Drag and Drop Events
        const dropzone = elements.uploadDropzone;
        if (dropzone) {
            dropzone.addEventListener('click', () => elements.fileInput.click());
            
            dropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropzone.classList.add('dragover');
            });
            
            dropzone.addEventListener('dragleave', () => {
                dropzone.classList.remove('dragover');
            });
            
            dropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropzone.classList.remove('dragover');
                if (e.dataTransfer.files.length > 0) {
                    handleFileSelect(e.dataTransfer.files[0]);
                }
            });
        }

        if (elements.fileInput) {
            elements.fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    handleFileSelect(e.target.files[0]);
                }
            });
        }

        if (elements.removeFileBtn) elements.removeFileBtn.addEventListener('click', removeFile);

        // Textarea Controls
        if (elements.notesTextarea) elements.notesTextarea.addEventListener('input', updateCharCounter);
        if (elements.clearNotesBtn) elements.clearNotesBtn.addEventListener('click', clearNotes);

        // Primary Action: Analyze Notes
        if (elements.analyzeBtn) elements.analyzeBtn.addEventListener('click', analyzeNotes);
        if (elements.reAnalyzeBtn) elements.reAnalyzeBtn.addEventListener('click', () => switchView('analyzer'));

        // Copy Summary
        if (elements.copySummaryBtn) {
            elements.copySummaryBtn.addEventListener('click', () => {
                const text = elements.summaryShortText.textContent;
                navigator.clipboard.writeText(text);
                showToast('Summary copied to clipboard!', 'success');
            });
        }

        // Regenerate Questions Button
        if (elements.moreQuestionsBtn) {
            elements.moreQuestionsBtn.addEventListener('click', handleRegenerateQuestions);
        }

        // Flashcards Navigation
        if (elements.flashcardElement) elements.flashcardElement.addEventListener('click', flipFlashcard);
        if (elements.fcFlipBtn) elements.fcFlipBtn.addEventListener('click', flipFlashcard);
        if (elements.fcNextBtn) elements.fcNextBtn.addEventListener('click', nextFlashcard);
        if (elements.fcPrevBtn) elements.fcPrevBtn.addEventListener('click', prevFlashcard);

        // Download Pack
        if (elements.downloadPackBtn) elements.downloadPackBtn.addEventListener('click', downloadStudyPack);

        // Global Search
        if (elements.searchInput) elements.searchInput.addEventListener('input', handleSearch);

        // Chatbot Controls
        if (elements.chatWidgetBtn) elements.chatWidgetBtn.addEventListener('click', toggleChatPanel);
        if (elements.chatCloseBtn) elements.chatCloseBtn.addEventListener('click', toggleChatPanel);
        if (elements.navChatTrigger) {
            elements.navChatTrigger.addEventListener('click', (e) => {
                e.preventDefault();
                if (!elements.chatPanel.classList.contains('active')) toggleChatPanel();
            });
        }

        if (elements.chatForm) {
            elements.chatForm.addEventListener('submit', (e) => {
                e.preventDefault();
                handleChatMessage(elements.chatInput.value);
            });
        }

        elements.presetChips.forEach(chip => {
            chip.addEventListener('click', () => {
                const prompt = chip.getAttribute('data-prompt');
                if (prompt) handleChatMessage(prompt);
            });
        });

        // Settings Actions
        if (elements.checkApiBtn) elements.checkApiBtn.addEventListener('click', () => checkApiStatus(true));
        if (elements.clearStorageBtn) {
            elements.clearStorageBtn.addEventListener('click', () => {
                localStorage.setItem('summora_recent_notes', '[]');
                state.recentNotes = [];
                renderRecentNotes();
                showToast('Storage cleared successfully', 'info');
            });
        }

        // Dismiss Demo Banner
        if (elements.dismissDemoBanner) {
            elements.dismissDemoBanner.addEventListener('click', () => {
                elements.demoBanner.style.display = 'none';
            });
        }
    }

    // Run Initialization
    init();
});
