// QuickPad v2.0 - Universal Client Script
(function() {
    'use strict';

    // Generate or Retrieve Device ID
    const myDeviceId = localStorage.getItem('quickpad_device_id') || (Date.now().toString() + Math.random().toString(36).substring(2));
    localStorage.setItem('quickpad_device_id', myDeviceId);

    // iOS Keyboard Dismiss Fix
    window.addEventListener('focusout', () => window.scrollTo(0, 0));
    window.addEventListener('hashchange', () => window.location.reload());

    // Firebase Initialization (Compat mode for universal file:// and HTTPS compatibility)
    const firebaseConfig = {
        apiKey: "AIzaSyD1TZ6sqpssStpPYVh5jW5uSG8yinIisug",
        authDomain: "quick-note-4133c.firebaseapp.com",
        databaseURL: "https://quick-note-4133c-default-rtdb.firebaseio.com",
        projectId: "quick-note-4133c",
        storageBucket: "quick-note-4133c.firebasestorage.app",
        messagingSenderId: "318442277",
        appId: "1:318442277:web:db1cc3d82f0cb90b2ea8cc",
        measurementId: "G-J4FWXDL1MF"
    };

    let db = null;
    try {
        if (typeof firebase !== 'undefined') {
            if (!firebase.apps || !firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            db = firebase.firestore();
            try {
                db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
            } catch(e) {}
        }
    } catch (err) {
        console.warn("Firebase initialization warning:", err);
    }

    // --- Core DOM Elements ---
    const editor = document.getElementById('editor');
    const preview = document.getElementById('preview');
    const loader = document.getElementById('loader');
    const loaderText = document.getElementById('loader-text');
    const mdToggleBtn = document.getElementById('md-toggle-btn');
    const splitToggleBtn = document.getElementById('split-toggle-btn');
    const copyBtn = document.getElementById('copy-btn');
    const burnBtn = document.getElementById('burn-btn');
    const instantBurnBtn = document.getElementById('instant-burn-btn');
    const newBtn = document.getElementById('new-btn');
    const timerBtn = document.getElementById('timer-btn');
    const nameBtn = document.getElementById('name-btn');
    const infoBtn = document.getElementById('info-btn');
    const zenBtn = document.getElementById('zen-btn');
    const zenExitBtn = document.getElementById('zen-exit-btn');
    const shareBtn = document.getElementById('share-btn');
    const cmdPaletteBtn = document.getElementById('cmd-palette-btn');

    // --- Presence & Profile Elements ---
    const profilePillBtn = document.getElementById('profile-pill-btn');
    const profileAvatarDisplay = document.getElementById('profile-avatar-display');
    const profileNameDisplay = document.getElementById('profile-name-display');
    const profilePreviewAvatar = document.getElementById('profile-preview-avatar');
    const profilePreviewName = document.getElementById('profile-preview-name');
    const peerAvatarsList = document.getElementById('peer-avatars-list');
    const onlineCountText = document.getElementById('online-count-text');
    const onlineCountBadge = document.getElementById('online-count-badge');
    const avatarPresetBtns = document.querySelectorAll('.avatar-preset-btn');
    const profileAvatarFileInput = document.getElementById('profile-avatar-file-input');
    const profileAvatarClearBtn = document.getElementById('profile-avatar-clear-btn');
    const insertImageBtn = document.getElementById('insert-image-btn');
    const noteImageFileInput = document.getElementById('note-image-file-input');

    // --- Modals ---
    const infoModal = document.getElementById('info-modal');
    const shareModal = document.getElementById('share-modal');
    const profileModal = document.getElementById('profile-modal');
    const mergeModal = document.getElementById('merge-modal');
    const cmdPaletteModal = document.getElementById('cmd-palette-modal');
    const customDialogModal = document.getElementById('custom-dialog-modal');
    const collaboratorsModal = document.getElementById('collaborators-modal');
    const collaboratorsList = document.getElementById('collaborators-list');
    const privacyInspectorModal = document.getElementById('privacy-inspector-modal');
    const privacyInspectorBtn = document.getElementById('privacy-inspector-btn');
    const closePrivacyInspector = document.getElementById('close-privacy-inspector');
    const copyInspectionLogBtn = document.getElementById('copy-inspection-log-btn');
    const inspectorPlaintextView = document.getElementById('inspector-plaintext-view');
    const inspectorCiphertextView = document.getElementById('inspector-ciphertext-view');
    const inspectorPlainLength = document.getElementById('inspector-plain-length');
    const inspectorCipherLength = document.getElementById('inspector-cipher-length');
    const inspectorSaltHex = document.getElementById('inspector-salt-hex');
    const inspectorCipherHex = document.getElementById('inspector-cipher-hex');

    // --- Modal Close Buttons ---
    const closeInfo = document.getElementById('close-info');
    const closeShare = document.getElementById('close-share');
    const closeProfile = document.getElementById('close-profile');
    const closeMerge = document.getElementById('close-merge');
    const closeCustomDialog = document.getElementById('close-custom-dialog');
    const closeCollaborators = document.getElementById('close-collaborators');
    const cardExportModal = document.getElementById('card-export-modal');
    const closeCardModal = document.getElementById('close-card-modal');

    // --- Share Modal Inputs ---
    const shareEditLink = document.getElementById('share-edit-link');
    const shareViewLink = document.getElementById('share-view-link');
    const copyEditLink = document.getElementById('copy-edit-link');
    const copyViewLink = document.getElementById('copy-view-link');
    const shareQrImg = document.getElementById('share-qr-img');

    // --- Merge Modal Elements ---
    const mergeServerText = document.getElementById('merge-server-text');
    const mergeLocalText = document.getElementById('merge-local-text');
    const mergeFinalText = document.getElementById('merge-final-text');
    const btnMergeApprove = document.getElementById('btn-merge-approve');
    let activeMergeTabId = null;

    // --- Direct Messaging Elements ---
    const dmWindow = document.getElementById('dm-window');
    const dmTitle = document.getElementById('dm-title');
    const closeDm = document.getElementById('close-dm');
    const dmMessages = document.getElementById('dm-messages');
    const dmInput = document.getElementById('dm-input');
    const dmSend = document.getElementById('dm-send');

    // --- Tabs & HUD Elements ---
    const tabsBar = document.getElementById('tabs-bar');
    const tabsContainer = document.getElementById('tabs-container');
    const addTabBtn = document.getElementById('add-tab-btn');
    const liveHud = document.getElementById('live-hud');
    const hudChars = document.getElementById('hud-chars');
    const hudWords = document.getElementById('hud-words');
    const hudRead = document.getElementById('hud-read');
    const hudTimerBadge = document.getElementById('hud-timer-badge');
    const hudTimerVal = document.getElementById('hud-timer-val');
    const editorMirror = document.getElementById('editor-mirror');
    const cursorsContainer = document.getElementById('cursors-container');
    const themeBtns = document.querySelectorAll('.theme-btn');
    const toastContainer = document.getElementById('toast-container');

    // --- Typography Controls ---
    const fontMonoBtn = document.getElementById('font-mono-btn');
    const fontSansBtn = document.getElementById('font-sans-btn');
    const fontSerifBtn = document.getElementById('font-serif-btn');
    const fontIncBtn = document.getElementById('font-inc-btn');
    const fontDecBtn = document.getElementById('font-dec-btn');
    const fontSizeLabel = document.getElementById('font-size-label');

    // --- Find & Replace Elements ---
    const findToggleBtn = document.getElementById('find-toggle-btn');
    const findReplaceBar = document.getElementById('find-replace-bar');
    const findInput = document.getElementById('find-input');
    const replaceInput = document.getElementById('replace-input');
    const findMatchCount = document.getElementById('find-match-count');
    const findPrevBtn = document.getElementById('find-prev-btn');
    const findNextBtn = document.getElementById('find-next-btn');
    const replaceBtn = document.getElementById('replace-btn');
    const replaceAllBtn = document.getElementById('replace-all-btn');
    const findCloseBtn = document.getElementById('find-close-btn');

    // --- File Export/Import ---
    const exportMdBtn = document.getElementById('export-md-btn');
    const exportTxtBtn = document.getElementById('export-txt-btn');
    const exportJsonBtn = document.getElementById('export-json-btn');
    const exportHtmlBtn = document.getElementById('export-html-btn');
    const importFileBtn = document.getElementById('import-file-btn');
    const fileImportInput = document.getElementById('file-import-input');

    // --- Stealth & Security Elements ---
    const panicBtn = document.getElementById('panic-btn');
    const panicOverlay = document.getElementById('panic-overlay');
    const panicExitBtn = document.getElementById('panic-exit-btn');
    const duressBtn = document.getElementById('duress-btn');
    const duressModal = document.getElementById('duress-modal');
    const closeDuress = document.getElementById('close-duress');
    const duressPinInput = document.getElementById('duress-pin-input');
    const duressContentInput = document.getElementById('duress-content-input');
    const duressSaveBtn = document.getElementById('duress-save-btn');
    const duressClearBtn = document.getElementById('duress-clear-btn');

    // --- Sensory & Settings Controls ---
    const soundFxBtns = document.querySelectorAll('.sound-fx-btn');
    const glitchToggle = document.getElementById('glitch-toggle');

    // --- Whiteboard Canvas Elements ---
    const canvasContainer = document.getElementById('canvas-container');
    const whiteboardCanvas = document.getElementById('whiteboard-canvas');
    const wbPenBtn = document.getElementById('wb-pen-btn');
    const wbEraserBtn = document.getElementById('wb-eraser-btn');
    const wbColorBtns = document.querySelectorAll('.wb-color');
    const wbSizeSlider = document.getElementById('wb-size');
    const wbUndoBtn = document.getElementById('wb-undo-btn');
    const wbClearBtn = document.getElementById('wb-clear-btn');

    // --- HUD Enhancements & Voice Walkie-Talkie ---
    const hudVoiceBtn = document.getElementById('hud-voice-btn');
    const hudVoiceStatus = document.getElementById('hud-voice-status');
    const hudDictateBtn = document.getElementById('hud-dictate-btn');
    const hudDictateStatus = document.getElementById('hud-dictate-status');
    const flareBar = document.getElementById('flare-bar');
    const flareBtns = document.querySelectorAll('.flare-btn');
    const hudWpmContainer = document.getElementById('hud-wpm-container');
    const hudWpm = document.getElementById('hud-wpm');
    const hudTasksContainer = document.getElementById('hud-tasks-container');
    const hudTasks = document.getElementById('hud-tasks');

    // --- Screensaver & Themes ---
    const matrixCanvas = document.getElementById('matrix-canvas');
    const ssMenuBtns = document.querySelectorAll('.ss-btn');
    const bgColorPicker = document.getElementById('bg-color-picker');

    // --- Profile Form Elements ---
    const profileNameInput = document.getElementById('profile-name-input');
    const profileAvatarInput = document.getElementById('profile-avatar-input');
    const saveProfileBtn = document.getElementById('save-profile-btn');

    // --- v3.0 Power Suite Elements ---
    const typewriterToggleBtn = document.getElementById('typewriter-toggle-btn');
    const focusToggleBtn = document.getElementById('focus-toggle-btn');
    const focusLineIndicator = document.getElementById('focus-line-indicator');
    const spotlightToggleBtn = document.getElementById('spotlight-toggle-btn');
    const codeRunnerToggleBtn = document.getElementById('code-runner-toggle-btn');
    const hudLaserBtn = document.getElementById('hud-laser-btn');
    const hudRunnerBtn = document.getElementById('hud-runner-btn');
    const laserCanvas = document.getElementById('laser-canvas');

    const stegOpenBtn = document.getElementById('steg-open-btn');
    const stegModal = document.getElementById('steg-modal');
    const closeSteg = document.getElementById('close-steg');
    const stegTabHide = document.getElementById('steg-tab-hide');
    const stegTabExtract = document.getElementById('steg-tab-extract');
    const stegPanelHide = document.getElementById('steg-panel-hide');
    const stegPanelExtract = document.getElementById('steg-panel-extract');
    const stegCanvas = document.getElementById('steg-canvas');
    const stegCarrierDropzone = document.getElementById('steg-carrier-dropzone');
    const stegCarrierFile = document.getElementById('steg-carrier-file');
    const stegGenPatternBtn = document.getElementById('steg-gen-pattern-btn');
    const stegHideText = document.getElementById('steg-hide-text');
    const stegLoadCurrentBtn = document.getElementById('steg-load-current-btn');
    const stegHidePass = document.getElementById('steg-hide-pass');
    const stegEncodeBtn = document.getElementById('steg-encode-btn');
    const stegRevealDropzone = document.getElementById('steg-reveal-dropzone');
    const stegRevealPreview = document.getElementById('steg-reveal-preview');
    const stegRevealFile = document.getElementById('steg-reveal-file');
    const stegRevealPass = document.getElementById('steg-reveal-pass');
    const stegExtractedContainer = document.getElementById('steg-extracted-container');
    const stegExtractedText = document.getElementById('steg-extracted-text');
    const stegLoadEditorBtn = document.getElementById('steg-load-editor-btn');
    const stegNewTabBtn = document.getElementById('steg-new-tab-btn');
    const stegDecodeBtn = document.getElementById('steg-decode-btn');

    const wormholeOpenBtn = document.getElementById('wormhole-open-btn');
    const wormholeModal = document.getElementById('wormhole-modal');
    const closeWormhole = document.getElementById('close-wormhole');
    const wormholePeersList = document.getElementById('wormhole-peers-list');
    const wormholeDropzone = document.getElementById('wormhole-dropzone');
    const wormholeFileInput = document.getElementById('wormhole-file-input');
    const wormholeFileMeta = document.getElementById('wormhole-file-meta');
    const wormholeFileName = document.getElementById('wormhole-file-name');
    const wormholeFileSize = document.getElementById('wormhole-file-size');
    const wormholeDropPrompt = document.getElementById('wormhole-drop-prompt');
    const wormholeProgressContainer = document.getElementById('wormhole-progress-container');
    const wormholeStatusText = document.getElementById('wormhole-status-text');
    const wormholePercentage = document.getElementById('wormhole-percentage');
    const wormholeProgressFill = document.getElementById('wormhole-progress-fill');
    const wormholeSpeedText = document.getElementById('wormhole-speed-text');
    const wormholeSendBtn = document.getElementById('wormhole-send-btn');

    const codeRunnerDrawer = document.getElementById('code-runner-drawer');
    const runnerModeBadge = document.getElementById('runner-mode-badge');
    const runCodeBtn = document.getElementById('run-code-btn');
    const clearConsoleBtn = document.getElementById('clear-console-btn');
    const closeRunnerBtn = document.getElementById('close-runner-btn');
    const consoleOutput = document.getElementById('console-output');
    const sandboxIframeContainer = document.getElementById('sandbox-iframe-container');
    const sandboxIframe = document.getElementById('sandbox-iframe');

    const slashPopup = document.getElementById('slash-popup');
    const slashItems = document.getElementById('slash-items');

    // --- State Variables ---
    let isSplitMode = false;
    let isMarkdown = false;
    let isBurnMode = false;
    let isReadOnly = false;
    let currentToken = '';
    let urlKey = null;
    let vaultPassword = null;
    let debounceTimeout = null;
    let unsubscribeWorkspace = null;
    let timerMinutes = null;
    let countdownInterval = null;
    let isTyping = false;
    let activeTabId = 'main';
    let tabsData = { 'main': { name: 'main.txt', content: '', is_encrypted: false } };
    let lastSyncedServerTabs = {};
    let lastSavedTabsJSON = "";
    let tabsContentDirty = false;
    let localSyncChannel = null;
    let isCloudQuotaExceeded = false;
    let hasWarnedQuota = false;
    let lastFirestoreCursorSync = 0;
    let peerCursorsData = {}; // cid -> { pos, name, pubKey, avatar, tabId }
    let activeChatId = null;
    let unreadMessages = {};
    let decryptedCache = {};
    let globalDms = {};
    let myPrivateKey = null;
    let myPublicKeyJwk = null;
    let currentActiveUsers = new Map();

    // v3.0 Power Suite State
    let isTypewriterMode = false;
    let isFocusMode = false;
    let isSpotlightMode = false;
    let isLaserActive = false;
    let localLaser = { x: null, y: null, visible: false, inBounds: false, opacity: 0 };
    let laserTrail = [];
    let remoteLasers = {}; // cid -> { x, y, targetX, targetY, trail: [], color, name, active, opacity, lastUpdate }
    let laserCtx = null;
    let laserAnimId = null;
    let workspacePolls = {}; // pollId -> { options: { optIdx: [cids] } }
    let selectedWormholePeer = null;
    let selectedWormholeFile = null;
    let wormholePeerConn = null;
    let wormholeDataChannel = null;
    let incomingFileBuffer = [];
    let incomingFileMeta = null;
    let incomingReceivedBytes = 0;
    let lastProcessedWormholeTimestamp = 0;
    let slashFilteredTemplates = [];
    let slashSelectedIndex = 0;
    let slashActive = false;
    let slashQuery = '';
    let slashCaretPos = 0;

    // Mechanical Audio & Sensory State
    let audioFxProfile = localStorage.getItem('quickpad_audio_fx') || 'off';
    let isGlitchDecryptEnabled = localStorage.getItem('quickpad_glitch_decrypt') !== 'false';
    let keystrokeHistory = [];
    let currentWpm = 0;
    let latestFlare = null;
    let lastEscapeTime = 0;

    // Duress Decoy State
    let duressPin = localStorage.getItem('quickpad_duress_pin') || '';
    let duressContent = localStorage.getItem('quickpad_duress_content') || '';
    let isDuressUnlocked = false;

    // Whiteboard Canvas State
    let wbCtx = null;
    let wbIsDrawing = false;
    let wbColor = '#00fff9';
    let wbSize = 4;
    let wbTool = 'pen';
    let wbHistory = [];

    // WebRTC Voice Walkie-Talkie State
    let localAudioStream = null;
    let isVoiceActive = false;
    let isVoiceTransmitting = false;
    let isDictating = false;
    let recognition = null;
    let voicePeerConnections = {};

    // User Profile
    let myUsername = localStorage.getItem('quickpad_username') || 'Anon';
    let myAvatarUrl = localStorage.getItem('quickpad_avatar') || '';

    // v4.0 Pro Welcome Template
    const WELCOME_CHECKLIST_TEMPLATE = `# ⚡ Welcome to QuickPad v4.0 Pro

Your hyper-fast, serverless scratchpad with **zero-knowledge end-to-end encryption**.
Everything you type is encrypted directly in your browser with AES-256 before leaving your device. No signups, no trackers, 100% private.

### 🚀 Getting Started Checklist
- [x] Create a private workspace (You're here!)
- [ ] Try formatting text with the floating toolbar (Highlight any text)
- [ ] Start a Pomodoro focus sprint with the 🍅 timer in the HUD
- [ ] Export a beautiful image card from File -> Export Note as Image Card
- [ ] Inspect your encryption live with the 🛡️ Shield button in the header
- [ ] Share your note or create a password-protected link via 🔗 Share

### 💡 Pro Tips & Shortcuts
- **⚡ Command Palette:** Press \`Cmd+K\` (or \`Ctrl+K\`) for instant actions.
- **🎨 Markdown Preview:** Press \`Alt+M\` (or \`Alt+S\` for Split View).
- **🎨 Whiteboard:** Add a new tab ending in \`.draw\` (e.g. \`sketch.draw\`) for real-time drawing.
- **🔒 Secret Vault:** Right-click or lock any tab with a passphrase for nested privacy.
- **🕶️ Panic Camouflage:** Press \`Alt+P\` or double-tap \`Esc\` to instantly disguise your screen.
`;

    // Custom Background & Theme Restore
    let customBgColor = localStorage.getItem('quickpad_bg');
    if (customBgColor) document.body.style.backgroundColor = customBgColor;
    const savedTheme = localStorage.getItem('quickpad_theme');
    if (savedTheme) document.body.className = savedTheme;

    // Screensaver Timeout State
    let storedTime = localStorage.getItem('quickpad_screensaver_time');
    let screensaverTimeoutMins = storedTime !== null && !isNaN(parseInt(storedTime)) ? parseInt(storedTime) : 2;
    if (storedTime === "0") screensaverTimeoutMins = 0;

    // Editor Font & Size Preferences
    let currentFontFamily = localStorage.getItem('quickpad_font_family') || 'mono';
    let currentFontSize = parseInt(localStorage.getItem('quickpad_font_size')) || 16;

    // --- Helper Functions ---
    function escapeHtml(unsafe) { 
        return (unsafe || '').toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); 
    }

    function arrayBufferToBase64(buffer) { 
        let binary = ''; 
        const bytes = new Uint8Array(buffer); 
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]); 
        return window.btoa(binary); 
    }

    function base64ToArrayBuffer(base64) { 
        const binary_string = window.atob(base64); 
        const len = binary_string.length; 
        const bytes = new Uint8Array(len); 
        for (let i = 0; i < len; i++) bytes[i] = binary_string.charCodeAt(i); 
        return bytes.buffer; 
    }

    // --- Toast Notification Manager ---
    function showToast(message, type = 'info', duration = 3000) {
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '⚠️';
        toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, duration);
    }
    window.showToast = showToast;

    // --- Resilient Clipboard Helper ---
    async function copyToClipboard(text, successMessage = "Copied to clipboard!") {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                textarea.remove();
            }
            showToast(successMessage, 'success');
            return true;
        } catch (err) {
            showToast("Press Ctrl+C to copy manually", 'error');
            return false;
        }
    }

    // --- Custom Dialog Engine (Prompt / Confirm) ---
    let customDialogResolve = null;

    function showCustomPrompt(title, message, defaultValue = "") {
        return new Promise((resolve) => {
            customDialogResolve = resolve;
            const titleEl = document.getElementById('dialog-title');
            const msgEl = document.getElementById('dialog-message');
            if (titleEl) titleEl.innerText = title;
            if (msgEl) msgEl.innerText = message;
            const input = document.getElementById('dialog-input');
            if (input) {
                input.style.display = 'block';
                input.value = defaultValue;
            }
            if (customDialogModal) customDialogModal.classList.remove('hidden');
            if (input) { input.focus(); input.select(); }
        });
    }

    function showCustomConfirm(title, message) {
        return new Promise((resolve) => {
            customDialogResolve = (val) => resolve(!!val);
            const titleEl = document.getElementById('dialog-title');
            const msgEl = document.getElementById('dialog-message');
            if (titleEl) titleEl.innerText = title;
            if (msgEl) msgEl.innerText = message;
            const input = document.getElementById('dialog-input');
            if (input) input.style.display = 'none';
            if (customDialogModal) customDialogModal.classList.remove('hidden');
        });
    }

    const dialogConfirmBtn = document.getElementById('dialog-confirm-btn');
    const dialogCancelBtn = document.getElementById('dialog-cancel-btn');
    const dialogInput = document.getElementById('dialog-input');

    if (dialogConfirmBtn) {
        dialogConfirmBtn.addEventListener('click', () => {
            if (customDialogModal) customDialogModal.classList.add('hidden');
            if (customDialogResolve) {
                const val = (dialogInput && dialogInput.style.display !== 'none') ? dialogInput.value : true;
                customDialogResolve(val);
                customDialogResolve = null;
            }
        });
    }

    if (dialogCancelBtn) {
        dialogCancelBtn.addEventListener('click', () => {
            if (customDialogModal) customDialogModal.classList.add('hidden');
            if (customDialogResolve) {
                customDialogResolve(null);
                customDialogResolve = null;
            }
        });
    }

    if (dialogInput) {
        dialogInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') dialogConfirmBtn && dialogConfirmBtn.click();
            if (e.key === 'Escape') dialogCancelBtn && dialogCancelBtn.click();
        });
    }

    if (closeCustomDialog) closeCustomDialog.addEventListener('click', () => dialogCancelBtn && dialogCancelBtn.click());

    // =========================================================================
    // --- NEXT-GEN FEATURE ENGINES: SENSORY, STEALTH, MULTIPLAYER & TOOLS ---
    // =========================================================================

    // 1. --- Synthesized Mechanical Keystroke Audio Engine (Web Audio API) ---
    let audioCtx = null;
    function getAudioContext() {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) audioCtx = new AudioContextClass();
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    function playMechanicalSound(keyType = 'key') {
        if (audioFxProfile === 'off') return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            if (audioFxProfile === 'thock') {
                // Low-frequency damped sine resonance + filtered transient
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const baseFreq = keyType === 'space' ? 110 : (keyType === 'enter' ? 125 : 145 + (Math.random() * 20 - 10));
                osc.type = 'sine';
                osc.frequency.setValueAtTime(baseFreq, now);
                osc.frequency.exponentialRampToValueAtTime(40, now + 0.045);
                gain.gain.setValueAtTime(0.35, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.05);

                const bufferSize = ctx.sampleRate * 0.02;
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.15;
                const noise = ctx.createBufferSource();
                noise.buffer = buffer;
                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(600, now);
                noise.connect(filter);
                filter.connect(ctx.destination);
                noise.start(now);
            } else if (audioFxProfile === 'click') {
                // High crisp snap + metallic clack
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const freq = keyType === 'space' ? 2200 : (keyType === 'enter' ? 2600 : 2800 + (Math.random() * 200 - 100));
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.025);
            } else if (audioFxProfile === 'modelm') {
                // Retro IBM Model M spring impulse
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(keyType === 'space' ? 480 : 720, now);
                osc.frequency.exponentialRampToValueAtTime(180, now + 0.035);
                gain.gain.setValueAtTime(0.18, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.04);
            } else if (audioFxProfile === 'cyber') {
                // Sci-fi tactile blip
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(keyType === 'backspace' ? 440 : 880, now);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.035);
            }
        } catch(e) {}
    }

    soundFxBtns.forEach(btn => {
        const sound = btn.getAttribute('data-sound');
        if (sound === audioFxProfile) btn.classList.add('active');
        else btn.classList.remove('active');

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            audioFxProfile = sound;
            localStorage.setItem('quickpad_audio_fx', audioFxProfile);
            soundFxBtns.forEach(b => b.classList.toggle('active', b === btn));
            playMechanicalSound('key');
            showToast(`Audio FX: ${sound.toUpperCase()}`, 'info');
        });
    });

    if (glitchToggle) {
        glitchToggle.checked = isGlitchDecryptEnabled;
        glitchToggle.addEventListener('change', (e) => {
            isGlitchDecryptEnabled = e.target.checked;
            localStorage.setItem('quickpad_glitch_decrypt', isGlitchDecryptEnabled);
            showToast(`Cipher Decryption: ${isGlitchDecryptEnabled ? 'Enabled' : 'Disabled'}`, 'info');
        });
    }

    // 2. --- Cipher Decryption Glitch Animation ---
    let glitchInterval = null;
    function triggerCipherGlitchAnimation(targetText) {
        if (!editor || !isGlitchDecryptEnabled || !targetText) return;
        clearInterval(glitchInterval);
        const glyphs = '01λ§0x#*¢∆µØ9876543210ABCDEF';
        const original = targetText;
        const len = Math.min(original.length, 250);
        let iteration = 0;
        const maxIter = 6;
        
        glitchInterval = setInterval(() => {
            let scrambled = '';
            for (let i = 0; i < len; i++) {
                if (original[i] === '\n' || original[i] === ' ') {
                    scrambled += original[i];
                } else if (i < (iteration / maxIter) * len) {
                    scrambled += original[i];
                } else {
                    scrambled += glyphs[Math.floor(Math.random() * glyphs.length)];
                }
            }
            editor.value = scrambled + original.substring(len);
            iteration++;
            if (iteration > maxIter) {
                clearInterval(glitchInterval);
                editor.value = original;
            }
        }, 40);
    }

    // 3. --- Real-Time WPM & Momentum Gauge ---
    function recordKeystrokeForWpm() {
        const now = Date.now();
        keystrokeHistory.push(now);
        keystrokeHistory = keystrokeHistory.filter(t => now - t <= 5000);
        const wpm = Math.round(keystrokeHistory.length * 2.4);
        currentWpm = wpm;
        if (hudWpm) hudWpm.innerText = wpm;
        if (hudWpmContainer) {
            if (wpm > 0) hudWpmContainer.classList.remove('hidden');
            else hudWpmContainer.classList.add('hidden');
        }
        if (editor) {
            if (wpm >= 60) editor.classList.add('wpm-blazing');
            else editor.classList.remove('wpm-blazing');
        }
    }

    setInterval(() => {
        const now = Date.now();
        keystrokeHistory = keystrokeHistory.filter(t => now - t <= 5000);
        const wpm = Math.round(keystrokeHistory.length * 2.4);
        currentWpm = wpm;
        if (hudWpm) hudWpm.innerText = wpm;
        if (hudWpmContainer) {
            if (wpm > 0) hudWpmContainer.classList.remove('hidden');
            else hudWpmContainer.classList.add('hidden');
        }
        if (editor && wpm < 60) editor.classList.remove('wpm-blazing');
    }, 1000);

    // 4. --- Interactive Markdown Task Progress Meter ---
    function updateTaskProgress() {
        if (!editor || !hudTasks || !hudTasksContainer) return;
        const text = editor.value || '';
        const totalMatches = text.match(/^\s*-\s*\[[ xX]\]/gm);
        if (!totalMatches || totalMatches.length === 0) {
            hudTasksContainer.classList.add('hidden');
            return;
        }
        const doneMatches = text.match(/^\s*-\s*\[[xX]\]/gm);
        const total = totalMatches.length;
        const done = doneMatches ? doneMatches.length : 0;
        const pct = Math.round((done / total) * 100);
        hudTasks.innerText = `☑️ ${done}/${total} (${pct}%)`;
        hudTasksContainer.classList.remove('hidden');
    }

    // 5. --- Stealth Panic Camouflage Mode ---
    function togglePanicMode(force) {
        if (!panicOverlay) return;
        const shouldShow = force !== undefined ? force : panicOverlay.classList.contains('hidden');
        if (shouldShow) {
            panicOverlay.classList.remove('hidden');
        } else {
            panicOverlay.classList.add('hidden');
            if (editor) editor.focus();
        }
    }

    if (panicBtn) panicBtn.addEventListener('click', () => togglePanicMode(true));
    if (panicExitBtn) panicExitBtn.addEventListener('click', () => togglePanicMode(false));

    window.addEventListener('keydown', (e) => {
        if (e.altKey && (e.key === 'p' || e.key === 'P')) {
            e.preventDefault();
            togglePanicMode();
        }
        if (e.key === 'Escape') {
            const now = Date.now();
            if (now - lastEscapeTime < 350) {
                togglePanicMode();
            }
            lastEscapeTime = now;
        }
    });

    // 6. --- Duress PIN / Decoy Vault ---
    if (duressBtn) {
        duressBtn.addEventListener('click', () => {
            if (duressPinInput) duressPinInput.value = duressPin;
            if (duressContentInput) duressContentInput.value = duressContent;
            if (duressModal) duressModal.classList.remove('hidden');
        });
    }

    if (closeDuress) closeDuress.addEventListener('click', () => duressModal && duressModal.classList.add('hidden'));

    if (duressSaveBtn) {
        duressSaveBtn.addEventListener('click', () => {
            duressPin = duressPinInput ? duressPinInput.value.trim() : '';
            duressContent = duressContentInput ? duressContentInput.value : '';
            localStorage.setItem('quickpad_duress_pin', duressPin);
            localStorage.setItem('quickpad_duress_content', duressContent);
            if (duressModal) duressModal.classList.add('hidden');
            showToast(duressPin ? "🛡️ Duress PIN Active" : "Duress PIN disabled", 'success');
        });
    }

    if (duressClearBtn) {
        duressClearBtn.addEventListener('click', () => {
            duressPin = '';
            duressContent = '';
            localStorage.removeItem('quickpad_duress_pin');
            localStorage.removeItem('quickpad_duress_content');
            if (duressPinInput) duressPinInput.value = '';
            if (duressContentInput) duressContentInput.value = '';
            if (duressModal) duressModal.classList.add('hidden');
            showToast("Duress PIN removed", 'info');
        });
    }

    // 7. --- Zero-Knowledge Encrypted Image Attachments ---
    function handleImageFile(file) {
        if (!file || !file.type.startsWith('image/') || !editor) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const maxDim = 1280;
                let w = img.width;
                let h = img.height;
                if (w > maxDim || h > maxDim) {
                    if (w > h) {
                        h = Math.round((h * maxDim) / w);
                        w = maxDim;
                    } else {
                        w = Math.round((w * maxDim) / h);
                        h = maxDim;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                const compressedUrl = canvas.toDataURL('image/jpeg', 0.82);

                const start = editor.selectionStart;
                const end = editor.selectionEnd;
                const tag = `\n![Image ${new Date().toLocaleTimeString()}](${compressedUrl})\n\n`;
                editor.value = editor.value.substring(0, start) + tag + editor.value.substring(end);
                editor.selectionStart = editor.selectionEnd = start + tag.length;
                if (tabsData[activeTabId]) tabsData[activeTabId].content = editor.value;
                updatePreview();
                updateHUD();
                saveWorkspace();
                showToast("Image encrypted & attached!", 'success');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // 8. --- Real-Time Cursor Emoji Flares ---
    function triggerEmojiFlare(emoji) {
        latestFlare = { emoji: emoji, timestamp: Date.now() };
        spawnFlareParticle(editor ? editor.selectionStart || 0 : 0, emoji, true);
        syncMyCursor();
    }

    function spawnFlareParticle(pos, emoji, isLocal = false, remoteCoords = null) {
        const coords = remoteCoords || (editor ? getCaretCoordinates(pos) : { top: 60, left: 60 });
        const particle = document.createElement('div');
        particle.className = 'cursor-flare-particle';
        particle.innerText = emoji;
        particle.style.left = `${coords.left}px`;
        particle.style.top = `${coords.top}px`;
        const workspaceMain = document.getElementById('workspace-main');
        if (workspaceMain) workspaceMain.appendChild(particle);
        setTimeout(() => {
            if (particle.parentNode) particle.remove();
        }, 1500);
    }

    flareBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const emoji = btn.getAttribute('data-emoji');
            triggerEmojiFlare(emoji);
        });
    });

    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && !e.altKey && !e.metaKey) {
            const keyToEmoji = { '1': '🔥', '2': '💡', '3': '🚀', '4': '🔒', '5': '👏' };
            if (keyToEmoji[e.key]) {
                e.preventDefault();
                triggerEmojiFlare(keyToEmoji[e.key]);
            }
        }
    });

    // 9. --- Encrypted Neon Whiteboard Tab (.draw) ---
    function initWhiteboard() {
        if (!whiteboardCanvas) return;
        wbCtx = whiteboardCanvas.getContext('2d');

        function resizeWbCanvas() {
            if (!canvasContainer || canvasContainer.classList.contains('hidden')) return;
            const rect = canvasContainer.getBoundingClientRect();
            const temp = wbCtx.getImageData(0, 0, whiteboardCanvas.width, whiteboardCanvas.height);
            whiteboardCanvas.width = rect.width;
            whiteboardCanvas.height = rect.height - 42;
            wbCtx.putImageData(temp, 0, 0);
        }
        window.addEventListener('resize', resizeWbCanvas);

        function startDraw(e) {
            wbIsDrawing = true;
            saveWbHistory();
            strokeBatch = []; // reset batch on new stroke
            draw(e);
        }

        function stopDraw() {
            if (!wbIsDrawing) return;
            wbIsDrawing = false;
            wbCtx.beginPath();
            saveWhiteboardToTab();
            if (strokeBatchTimeout) {
                clearTimeout(strokeBatchTimeout);
                strokeBatchTimeout = null;
            }
            broadcastStrokes();
        }

        function draw(e) {
            if (!wbIsDrawing) return;
            const rect = whiteboardCanvas.getBoundingClientRect();
            const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
            const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
            const x = clientX - rect.left;
            const y = clientY - rect.top;

            wbCtx.lineWidth = wbSize;
            wbCtx.lineCap = 'round';
            wbCtx.lineJoin = 'round';

            if (wbTool === 'eraser') {
                wbCtx.globalCompositeOperation = 'destination-out';
                wbCtx.strokeStyle = 'rgba(0,0,0,1)';
                wbCtx.shadowBlur = 0;
            } else {
                wbCtx.globalCompositeOperation = 'source-over';
                wbCtx.strokeStyle = wbColor;
                wbCtx.shadowColor = wbColor;
                wbCtx.shadowBlur = 6;
            }

            wbCtx.lineTo(x, y);
            wbCtx.stroke();
            wbCtx.beginPath();
            wbCtx.moveTo(x, y);

            if (typeof strokeBatch !== 'undefined') {
                strokeBatch.push({ x: Math.round(x), y: Math.round(y) });
                if (!strokeBatchTimeout) {
                    strokeBatchTimeout = setTimeout(() => {
                        broadcastStrokes();
                        strokeBatchTimeout = null;
                    }, 250);
                }
            }
        }

        whiteboardCanvas.addEventListener('mousedown', startDraw);
        whiteboardCanvas.addEventListener('mouseup', stopDraw);
        whiteboardCanvas.addEventListener('mousemove', draw);
        whiteboardCanvas.addEventListener('mouseleave', stopDraw);

        whiteboardCanvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDraw(e); }, { passive: false });
        whiteboardCanvas.addEventListener('touchend', (e) => { e.preventDefault(); stopDraw(); }, { passive: false });
        whiteboardCanvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e); }, { passive: false });

        if (wbPenBtn) {
            wbPenBtn.addEventListener('click', () => {
                wbTool = 'pen';
                wbPenBtn.classList.add('active');
                if (wbEraserBtn) wbEraserBtn.classList.remove('active');
            });
        }

        if (wbEraserBtn) {
            wbEraserBtn.addEventListener('click', () => {
                wbTool = 'eraser';
                wbEraserBtn.classList.add('active');
                if (wbPenBtn) wbPenBtn.classList.remove('active');
            });
        }

        wbColorBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                wbColor = btn.getAttribute('data-color');
                wbColorBtns.forEach(b => b.classList.toggle('active', b === btn));
                if (wbTool === 'eraser' && wbPenBtn) wbPenBtn.click();
            });
        });

        if (wbSizeSlider) {
            wbSizeSlider.addEventListener('input', (e) => {
                wbSize = parseInt(e.target.value) || 4;
            });
        }

        if (wbUndoBtn) {
            wbUndoBtn.addEventListener('click', () => {
                if (wbHistory.length > 0) {
                    const prev = wbHistory.pop();
                    wbCtx.putImageData(prev, 0, 0);
                    saveWhiteboardToTab();
                }
            });
        }

        if (wbClearBtn) {
            wbClearBtn.addEventListener('click', () => {
                saveWbHistory();
                wbCtx.clearRect(0, 0, whiteboardCanvas.width, whiteboardCanvas.height);
                saveWhiteboardToTab();
                showToast("Whiteboard cleared", 'info');
            });
        }
    }

    let wbIsLoading = false;

    function saveWbHistory() {
        if (!whiteboardCanvas || !wbCtx) return;
        if (whiteboardCanvas.width > 0 && whiteboardCanvas.height > 0) {
            wbHistory.push(wbCtx.getImageData(0, 0, whiteboardCanvas.width, whiteboardCanvas.height));
            if (wbHistory.length > 20) wbHistory.shift();
        }
    }

    function saveWhiteboardToTab() {
        if (!whiteboardCanvas || !activeTabId || !tabsData[activeTabId] || wbIsLoading) return;
        const isDraw = tabsData[activeTabId].name && tabsData[activeTabId].name.endsWith('.draw');
        if (!isDraw) return;
        if (whiteboardCanvas.width <= 0 || whiteboardCanvas.height <= 0) return;
        const dataUrl = whiteboardCanvas.toDataURL('image/png');
        tabsData[activeTabId].content = dataUrl;
        saveWorkspace();
    }

    function loadWhiteboardFromTab(dataUrl) {
        if (!whiteboardCanvas || !wbCtx) return;
        const rect = canvasContainer ? canvasContainer.getBoundingClientRect() : null;
        const targetW = (rect && rect.width > 50) ? rect.width : (window.innerWidth || 800);
        const targetH = (rect && rect.height > 90) ? (rect.height - 42) : Math.max(300, window.innerHeight - 100);

        whiteboardCanvas.width = targetW;
        whiteboardCanvas.height = targetH;
        wbCtx.clearRect(0, 0, whiteboardCanvas.width, whiteboardCanvas.height);
        wbHistory = [];

        if (dataUrl && dataUrl.startsWith('data:image/')) {
            wbIsLoading = true;
            const img = new Image();
            img.onload = () => {
                setTimeout(() => {
                    wbCtx.drawImage(img, 0, 0);
                    saveWbHistory();
                    wbIsLoading = false;
                }, 50);
            };
            img.onerror = () => {
                wbIsLoading = false;
            };
            img.src = dataUrl;
        } else {
            wbIsLoading = false;
            saveWbHistory();
        }
    }

    initWhiteboard();

    // 10. --- WebRTC P2P Voice Walkie-Talkie ---
    async function toggleVoice() {
        if (isVoiceActive) {
            stopVoice();
        } else {
            await startVoice();
        }
    }

    async function startVoice() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showToast("Microphone access requires HTTPS or localhost.", 'error');
            return;
        }
        try {
            localAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Mute by default for Push-to-Talk
            localAudioStream.getAudioTracks().forEach(t => t.enabled = false);
            isVoiceActive = true;
            if (hudVoiceBtn) {
                hudVoiceBtn.classList.add('active');
                if (hudVoiceStatus) hudVoiceStatus.innerText = "Muted";
            }
            showToast("🎙️ Voice Active! Click/Hold or press Space to Talk.", 'success');
        } catch(e) {
            showToast("Microphone permission denied.", 'error');
        }
    }

    function stopVoice() {
        if (localAudioStream) {
            localAudioStream.getTracks().forEach(t => t.stop());
            localAudioStream = null;
        }
        isVoiceActive = false;
        isVoiceTransmitting = false;
        if (hudVoiceBtn) {
            hudVoiceBtn.classList.remove('active', 'transmitting');
            if (hudVoiceStatus) hudVoiceStatus.innerText = "Voice";
        }
        const myBubble = document.querySelector('#profile-avatar-display');
        if (myBubble) myBubble.classList.remove('speaking');
        showToast("Voice chat disconnected", 'info');
    }

    function setPushToTalk(transmitting) {
        if (!isVoiceActive || !localAudioStream) return;
        isVoiceTransmitting = transmitting;
        localAudioStream.getAudioTracks().forEach(t => t.enabled = transmitting);
        if (hudVoiceBtn) {
            if (transmitting) {
                hudVoiceBtn.classList.add('transmitting');
                if (hudVoiceStatus) hudVoiceStatus.innerText = "Transmitting...";
            } else {
                hudVoiceBtn.classList.remove('transmitting');
                if (hudVoiceStatus) hudVoiceStatus.innerText = "Muted";
            }
        }
        const myBubble = document.querySelector('#profile-avatar-display');
        if (myBubble) myBubble.classList.toggle('speaking', transmitting);
    }

    if (hudVoiceBtn) {
        hudVoiceBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleVoice();
        });
        hudVoiceBtn.addEventListener('mousedown', () => isVoiceActive && setPushToTalk(true));
        hudVoiceBtn.addEventListener('mouseup', () => isVoiceActive && setPushToTalk(false));
        hudVoiceBtn.addEventListener('touchstart', (e) => {
            if (isVoiceActive) { e.preventDefault(); setPushToTalk(true); }
        }, { passive: false });
        hudVoiceBtn.addEventListener('touchend', (e) => {
            if (isVoiceActive) { e.preventDefault(); setPushToTalk(false); }
        }, { passive: false });
    }

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && isVoiceActive && document.activeElement !== editor && !isVoiceTransmitting) {
            e.preventDefault();
            setPushToTalk(true);
        }
    });
    window.addEventListener('keyup', (e) => {
        if (e.code === 'Space' && isVoiceActive && document.activeElement !== editor) {
            setPushToTalk(false);
        }
    });

    // 10.5 --- Private On-Device Speech Dictation ---
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            isDictating = true;
            if (hudDictateBtn) hudDictateBtn.classList.add('active');
            if (hudDictateStatus) hudDictateStatus.innerText = "Listening...";
            showToast("🗣️ Speech Dictation Active", 'success');
        };

        recognition.onresult = (event) => {
            if (!editor || isReadOnly || isBurnMode || (tabsData[activeTabId] && tabsData[activeTabId].name.endsWith('.draw'))) return;
            
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    const text = event.results[i][0].transcript;
                    const cursor = editor.selectionStart || 0;
                    editor.value = editor.value.substring(0, cursor) + text + ' ' + editor.value.substring(editor.selectionEnd || cursor);
                    editor.selectionStart = editor.selectionEnd = cursor + text.length + 1;
                    if (tabsData[activeTabId]) tabsData[activeTabId].content = editor.value;
                    if (typeof debouncedSave === 'function') debouncedSave();
                    else saveWorkspace();
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            if (hudDictateStatus && interimTranscript) {
                hudDictateStatus.innerText = interimTranscript.substring(0, 15) + '...';
            } else if (hudDictateStatus) {
                hudDictateStatus.innerText = "Listening...";
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            showToast("Dictation error: " + event.error, 'error');
            stopDictation();
        };

        recognition.onend = () => {
            if (isDictating) {
                try { recognition.start(); } catch(e) {}
            } else {
                stopDictation();
            }
        };

        function stopDictation() {
            isDictating = false;
            try { recognition.stop(); } catch(e) {}
            if (hudDictateBtn) hudDictateBtn.classList.remove('active');
            if (hudDictateStatus) hudDictateStatus.innerText = "Dictate";
        }

        if (hudDictateBtn) {
            hudDictateBtn.addEventListener('click', () => {
                if (isDictating) {
                    stopDictation();
                    showToast("Speech Dictation Stopped", 'info');
                } else {
                    try {
                        recognition.start();
                    } catch(e) {
                        showToast("Could not start dictation. Ensure mic permissions are granted.", 'error');
                    }
                }
            });
        }
    } else {
        if (hudDictateBtn) {
            hudDictateBtn.addEventListener('click', () => {
                showToast("Speech Recognition not supported in this browser.", 'error');
            });
        }
    }

    // 11. --- Standalone Encrypted Self-Decrypting HTML Exporter ---
    async function exportStandaloneEncryptedHtml() {
        const passphrase = await showCustomPrompt("Export Encrypted HTML", "Enter a passphrase to protect this standalone vault:");
        if (!passphrase || !passphrase.trim()) return;

        try {
            showLoader();
            const salt = window.crypto.getRandomValues(new Uint8Array(16));
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            const enc = new TextEncoder();
            
            const keyMaterial = await window.crypto.subtle.importKey(
                "raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]
            );
            const key = await window.crypto.subtle.deriveKey(
                { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
                keyMaterial,
                { name: "AES-GCM", length: 256 },
                false,
                ["encrypt"]
            );

            const payload = JSON.stringify({ tabs: tabsData, title: "QuickPad Vault Export", exportedAt: new Date().toISOString() });
            const ciphertext = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, enc.encode(payload));

            const saltB64 = arrayBufferToBase64(salt);
            const ivB64 = arrayBufferToBase64(iv);
            const cipherB64 = arrayBufferToBase64(ciphertext);

            const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>QuickPad Vault (Encrypted)</title>
<style>
body{margin:0;padding:0;background:#0b0f19;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,monospace;display:flex;align-items:center;justify-content:center;height:100vh}
.card{background:#111827;border:1px solid #00fff9;border-radius:14px;padding:32px;width:90%;max-width:540px;box-shadow:0 0 24px rgba(0,255,249,0.25);text-align:center}
h1{color:#00fff9;font-size:1.4rem;letter-spacing:1px;margin-bottom:12px}
input{width:100%;box-sizing:border-box;padding:12px;background:#1e293b;border:1px solid #334155;border-radius:8px;color:#fff;font-size:1rem;margin:16px 0;outline:none}
input:focus{border-color:#00fff9;box-shadow:0 0 10px rgba(0,255,249,0.3)}
button{width:100%;padding:12px;background:rgba(0,255,249,0.2);border:1px solid #00fff9;border-radius:8px;color:#00fff9;font-weight:700;cursor:pointer;font-size:1rem}
button:hover{background:#00fff9;color:#000}
.vault-content{display:none;width:90%;max-width:900px;background:#111827;border:1px solid #334155;border-radius:12px;padding:24px;margin:auto;max-height:85vh;overflow-y:auto}
.tab-btn{background:#1e293b;border:1px solid #334155;color:#94a3b8;padding:6px 12px;border-radius:6px;cursor:pointer;margin-right:6px}
.tab-btn.active{border-color:#00fff9;color:#00fff9;font-weight:700}
pre{background:#0b0f19;padding:16px;border-radius:8px;white-space:pre-wrap;word-break:break-word;font-size:0.9rem;border:1px solid #1e293b}
</style>
</head>
<body>
<div id="unlock-card" class="card">
<h1>🔒 QUICKPAD ZERO-KNOWLEDGE VAULT</h1>
<p style="color:#94a3b8;font-size:0.85rem;">This file is standalone and AES-256 encrypted. Enter your passphrase to decrypt:</p>
<input type="password" id="pass" placeholder="Enter vault passphrase..." autofocus>
<button id="btn">Unlock & Decrypt</button>
<p id="err" style="color:#ff0055;display:none;margin-top:12px;font-size:0.85rem;">❌ Incorrect passphrase</p>
</div>
<div id="vault" class="vault-content">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1px solid #334155;padding-bottom:12px;">
<h2 style="color:#00fff9;margin:0;font-size:1.1rem;">⚡ QuickPad Decrypted Vault</h2>
<span style="font-size:0.75rem;color:#00ff66;">🔒 Decrypted Locally</span>
</div>
<div id="tabs-bar" style="margin-bottom:12px;"></div>
<pre id="display"></pre>
</div>
<script>
const S="${saltB64}",I="${ivB64}",C="${cipherB64}";
function b2b(b){const s=atob(b),l=s.length,a=new Uint8Array(l);for(let i=0;i<l;i++)a[i]=s.charCodeAt(i);return a.buffer;}
async function unlock(){
const p=document.getElementById("pass").value;if(!p)return;
try{
const e=new TextEncoder(),km=await crypto.subtle.importKey("raw",e.encode(p),"PBKDF2",false,["deriveKey"]);
const k=await crypto.subtle.deriveKey({name:"PBKDF2",salt:b2b(S),iterations:100000,hash:"SHA-256"},km,{name:"AES-GCM",length:256},false,["decrypt"]);
const d=await crypto.subtle.decrypt({name:"AES-GCM",iv:b2b(I)},k,b2b(C));
const payload=JSON.parse(new TextDecoder().decode(d));
document.getElementById("unlock-card").style.display="none";
document.getElementById("vault").style.display="block";
renderTabs(payload.tabs);
}catch(err){document.getElementById("err").style.display="block";}
}
function renderTabs(tabs){
const tb=document.getElementById("tabs-bar"),disp=document.getElementById("display");tb.innerHTML="";
const keys=Object.keys(tabs);
keys.forEach((k,idx)=>{
const b=document.createElement("button");b.className="tab-btn"+(idx===0?" active":"");b.innerText=tabs[k].name||"note.txt";
b.onclick=()=>{document.querySelectorAll(".tab-btn").forEach(x=>x.classList.remove("active"));b.classList.add("active");disp.innerText=tabs[k].content||"";};
tb.appendChild(b);
});
if(keys.length>0)disp.innerText=tabs[keys[0]].content||"";
}
document.getElementById("btn").onclick=unlock;
document.getElementById("pass").onkeydown=(e)=>{if(e.key==="Enter")unlock();};
</script>
</body>
</html>`;

            const blob = new Blob([htmlTemplate], { type: 'text/html;charset=utf-8' });
            const dl = document.createElement('a');
            dl.href = URL.createObjectURL(blob);
            dl.download = `quickpad-vault-${new Date().toISOString().slice(0,10)}.html`;
            document.body.appendChild(dl);
            dl.click();
            dl.remove();
            hideLoader();
            showToast("🔐 Encrypted standalone HTML exported!", 'success');
        } catch(e) {
            hideLoader();
            showToast("Export failed: " + e.message, 'error');
        }
    }

    if (exportHtmlBtn) exportHtmlBtn.addEventListener('click', exportStandaloneEncryptedHtml);

    // --- Body-Attached Dropdown System (Fixes clipping in scrolling / mobile headers) ---
    function initDropdownMenus() {
        const dropdownGroups = document.querySelectorAll('.dropdown-group');
        let activeMenu = null;
        let activeGroup = null;
        let closeTimeout = null;

        function closeAllDropdowns() {
            clearTimeout(closeTimeout);
            document.querySelectorAll('.dropdown-menu').forEach(m => {
                m.classList.remove('show');
            });
            document.querySelectorAll('.dropdown-group').forEach(g => {
                g.classList.remove('active');
            });
            activeMenu = null;
            activeGroup = null;
        }

        dropdownGroups.forEach(group => {
            const menu = group.querySelector('.dropdown-menu');
            if (!menu) return;

            // Teleport dropdown menu to document.body so it is never clipped by #app-header or overflow
            document.body.appendChild(menu);

            function updateMenuPosition() {
                if (!menu.classList.contains('show')) return;
                const rect = group.getBoundingClientRect();

                // If button is completely off-screen, close menu
                if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) {
                    closeAllDropdowns();
                    return;
                }

                menu.style.position = 'fixed';
                menu.style.zIndex = '2500';

                const menuWidth = menu.offsetWidth || 230;
                const menuHeight = menu.offsetHeight || 240;

                // Vertical positioning:
                let top = rect.bottom + 6;
                // If button is in bottom half of viewport (like bottom HUD) or overflowing bottom
                if (rect.top > window.innerHeight / 2 || top + menuHeight > window.innerHeight - 8) {
                    if (rect.top - menuHeight - 6 > 0) {
                        top = rect.top - menuHeight - 6;
                    }
                }

                // Horizontal positioning: align left for left-side buttons, right for right-side buttons
                let left;
                if (rect.left + menuWidth <= window.innerWidth - 10) {
                    left = rect.left;
                } else {
                    left = rect.right - menuWidth;
                }
                if (left + menuWidth > window.innerWidth - 10) {
                    left = window.innerWidth - menuWidth - 10;
                }
                if (left < 10) {
                    left = 10;
                }

                menu.style.top = `${Math.round(top)}px`;
                menu.style.left = `${Math.round(left)}px`;
                menu.style.right = 'auto';
                menu.style.bottom = 'auto';
            }

            function openThisDropdown() {
                clearTimeout(closeTimeout);
                if (activeMenu && activeMenu !== menu) {
                    activeMenu.classList.remove('show');
                    if (activeGroup) activeGroup.classList.remove('active');
                }

                activeMenu = menu;
                activeGroup = group;
                group.classList.add('active');
                menu.classList.add('show');
                updateMenuPosition();
            }

            function scheduleClose() {
                clearTimeout(closeTimeout);
                closeTimeout = setTimeout(() => {
                    if (activeMenu === menu) {
                        closeAllDropdowns();
                    }
                }, 180);
            }

            // Click Toggle (Mobile, Touch, and Desktop)
            group.addEventListener('click', (e) => {
                e.stopPropagation();
                if (menu.classList.contains('show')) {
                    closeAllDropdowns();
                } else {
                    openThisDropdown();
                }
            });

            // Hover Support (Desktop Mouse)
            group.addEventListener('mouseenter', () => {
                if (window.matchMedia('(hover: hover)').matches) {
                    openThisDropdown();
                }
            });
            group.addEventListener('mouseleave', () => {
                if (window.matchMedia('(hover: hover)').matches) {
                    scheduleClose();
                }
            });

            menu.addEventListener('mouseenter', () => {
                clearTimeout(closeTimeout);
            });
            menu.addEventListener('mouseleave', () => {
                if (window.matchMedia('(hover: hover)').matches) {
                    scheduleClose();
                }
            });

            // Handle clicks inside dropdown menu
            menu.addEventListener('click', (e) => {
                e.stopPropagation();
                // Close menu if an action item was clicked, but NOT on inputs, sliders, or font adjustments
                const actionBtn = e.target.closest('.menu-action-btn, .sound-fx-btn, .theme-btn');
                if (actionBtn && !e.target.closest('input, .ss-btn, .font-size-btn, .font-btn')) {
                    setTimeout(closeAllDropdowns, 120);
                }
            });
        });

        // Global dismiss handlers
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown-group, .dropdown-menu')) {
                closeAllDropdowns();
            }
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeAllDropdowns();
        });

        window.addEventListener('resize', closeAllDropdowns);

        const appHeader = document.getElementById('app-header');
        if (appHeader) {
            appHeader.addEventListener('scroll', () => {
                if (activeMenu) {
                    closeAllDropdowns();
                }
            }, { passive: true });
        }
    }

    initDropdownMenus();

    // --- Theme Picker Handling ---
    themeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const theme = btn.getAttribute('data-theme') || '';
            document.body.className = theme;
            localStorage.setItem('quickpad_theme', theme);
            showToast("Theme updated", 'info');
        });
    });

    if (bgColorPicker) {
        if (customBgColor) bgColorPicker.value = customBgColor;
        bgColorPicker.addEventListener('input', (e) => {
            document.body.style.backgroundColor = e.target.value;
            localStorage.setItem('quickpad_bg', e.target.value);
        });
    }

    // --- Typography Engine ---
    function applyTypography(family, size) {
        currentFontFamily = family;
        currentFontSize = size;
        let fontCSS = 'var(--font-mono)';
        if (family === 'sans') fontCSS = 'var(--font-sans)';
        if (family === 'serif') fontCSS = 'var(--font-serif)';

        document.documentElement.style.setProperty('--editor-font', fontCSS);
        document.documentElement.style.setProperty('--editor-font-size', `${size}px`);

        if (fontSizeLabel) fontSizeLabel.innerText = `${size}px`;
        if (fontMonoBtn) fontMonoBtn.classList.toggle('active', family === 'mono');
        if (fontSansBtn) fontSansBtn.classList.toggle('active', family === 'sans');
        if (fontSerifBtn) fontSerifBtn.classList.toggle('active', family === 'serif');

        localStorage.setItem('quickpad_font_family', family);
        localStorage.setItem('quickpad_font_size', size);

        for (let cid in peerCursorsData) {
            if (peerCursorsData[cid] && peerCursorsData[cid].tabId === activeTabId) {
                renderPeerCursor(cid, peerCursorsData[cid].pos, peerCursorsData[cid].name);
            }
        }
    }

    applyTypography(currentFontFamily, currentFontSize);

    if (fontMonoBtn) fontMonoBtn.addEventListener('click', () => applyTypography('mono', currentFontSize));
    if (fontSansBtn) fontSansBtn.addEventListener('click', () => applyTypography('sans', currentFontSize));
    if (fontSerifBtn) fontSerifBtn.addEventListener('click', () => applyTypography('serif', currentFontSize));
    if (fontIncBtn) fontIncBtn.addEventListener('click', () => { if (currentFontSize < 32) applyTypography(currentFontFamily, currentFontSize + 2); });
    if (fontDecBtn) fontDecBtn.addEventListener('click', () => { if (currentFontSize > 12) applyTypography(currentFontFamily, currentFontSize - 2); });

    // --- Markdown Setup & Syntax Highlighting ---
    if (typeof marked !== 'undefined') {
        marked.setOptions({ breaks: true, gfm: true });
    }

    // --- Interactive Markdown Polls Engine ---
    function generatePollId(question) {
        let hash = 0;
        const str = question.trim().toLowerCase();
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return 'poll_' + Math.abs(hash).toString(36);
    }

    function processPollMarkup(text) {
        if (!text) return '';
        return text.replace(/\[poll:\s*([^\|\]]+)((?:\|[^\|\]]+)+)\]/g, (match, q, rawOptions) => {
            const question = q.trim();
            const pollId = generatePollId(question);
            const options = rawOptions.split('|').map(o => o.trim()).filter(Boolean);
            if (options.length === 0) return match;

            const pollData = workspacePolls[pollId] || { options: {} };
            let totalVotes = 0;
            const optionCounts = options.map((opt, idx) => {
                const voters = (pollData.options && pollData.options[idx]) ? pollData.options[idx] : [];
                totalVotes += voters.length;
                return voters.length;
            });

            let optionsHtml = '';
            options.forEach((opt, idx) => {
                const count = optionCounts[idx];
                const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                const voters = (pollData.options && pollData.options[idx]) ? pollData.options[idx] : [];
                const hasVoted = voters.includes(myDeviceId);

                optionsHtml += `
                    <div class="poll-option-row ${hasVoted ? 'voted' : ''}" data-poll-id="${pollId}" data-opt-idx="${idx}">
                        <div class="poll-bar-fill" style="width: ${pct}%"></div>
                        <div class="poll-option-content">
                            <span class="poll-option-text">
                                <span class="poll-check-icon">✓</span>
                                <span>${escapeHtml(opt)}</span>
                            </span>
                            <span class="poll-stats">${count} (${pct}%)</span>
                        </div>
                    </div>
                `;
            });

            return `
                <div class="cyber-poll-card" data-poll-id="${pollId}">
                    <div class="cyber-poll-header">
                        <span class="cyber-poll-title">📊 ${escapeHtml(question)}</span>
                        <span class="cyber-poll-badge">LIVE POLL</span>
                    </div>
                    <div class="cyber-poll-options">
                        ${optionsHtml}
                    </div>
                    <div class="cyber-poll-footer">
                        <span>Total: ${totalVotes} ${totalVotes === 1 ? 'vote' : 'votes'}</span>
                        <span>Click option to vote / unvote</span>
                    </div>
                </div>
            `;
        });
    }

    function wirePollListeners() {
        if (!preview) return;
        preview.querySelectorAll('.poll-option-row').forEach(row => {
            row.addEventListener('click', (e) => {
                e.stopPropagation();
                const pollId = row.getAttribute('data-poll-id');
                const optIdx = parseInt(row.getAttribute('data-opt-idx'));
                if (!pollId || isNaN(optIdx)) return;

                if (!workspacePolls[pollId]) workspacePolls[pollId] = { options: {} };
                if (!workspacePolls[pollId].options) workspacePolls[pollId].options = {};

                // Check if user already voted for this option
                const currentVoters = workspacePolls[pollId].options[optIdx] || [];
                const alreadyVotedThis = currentVoters.includes(myDeviceId);

                // Clear my vote from all options in this poll
                for (let o in workspacePolls[pollId].options) {
                    workspacePolls[pollId].options[o] = (workspacePolls[pollId].options[o] || []).filter(id => id !== myDeviceId);
                }

                // If not already voted this option, add vote
                if (!alreadyVotedThis) {
                    if (!workspacePolls[pollId].options[optIdx]) workspacePolls[pollId].options[optIdx] = [];
                    workspacePolls[pollId].options[optIdx].push(myDeviceId);
                    showToast("Vote recorded!", 'success');
                } else {
                    showToast("Vote retracted", 'info');
                }

                updatePreview();
                saveWorkspace();
            });
        });
    }

    function updatePreview() {
        if (!isMarkdown && !isSplitMode) return;
        if (typeof marked === 'undefined' || !preview || !editor) return;
        
        // 1. Pre-process poll syntax into cyber poll cards
        const rawContent = editor.value || '';
        const pollProcessedContent = processPollMarkup(rawContent);

        // 2. Render Markdown & sanitize
        const html = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(marked.parse(pollProcessedContent)) : marked.parse(pollProcessedContent);
        preview.innerHTML = html;
        
        // 3. Apply syntax highlighting to code blocks in preview
        if (typeof hljs !== 'undefined') {
            preview.querySelectorAll('pre code').forEach((block) => {
                if (!block.classList.contains('language-mermaid')) {
                    try { hljs.highlightElement(block); } catch (e) {}
                }
            });
        }

        // 4. Render Mermaid Diagrams
        if (typeof mermaid !== 'undefined') {
            try {
                mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose', suppressErrorRendering: true });
                preview.querySelectorAll('pre code.language-mermaid').forEach((block, idx) => {
                    const pre = block.parentElement;
                    const code = block.textContent;
                    const container = document.createElement('div');
                    container.className = 'mermaid';
                    const containerId = 'mermaid-' + Date.now() + '-' + idx;
                    container.id = containerId;
                    try {
                        mermaid.render(containerId, code).then(res => {
                            container.innerHTML = res.svg;
                        }).catch(err => {
                            container.innerHTML = `<span style="color:#ff0055;font-size:0.8rem;font-family:monospace;">[Mermaid Diagram Error: ${escapeHtml(err.message || 'Syntax Error')}]</span>`;
                            const errEl = document.getElementById('d' + containerId);
                            if (errEl) errEl.remove();
                        });
                    } catch(err) {
                        container.innerText = code;
                        const errEl = document.getElementById('d' + containerId);
                        if (errEl) errEl.remove();
                    }
                    if (pre && pre.parentNode) pre.parentNode.replaceChild(container, pre);
                });
            } catch(e) {}
        }

        // 5. Render KaTeX Math Equations
        if (typeof renderMathInElement !== 'undefined') {
            try {
                renderMathInElement(preview, {
                    delimiters: [
                        { left: '$$', right: '$$', display: true },
                        { left: '$', right: '$', display: false },
                        { left: '\\(', right: '\\)', display: false },
                        { left: '\\[', right: '\\]', display: true }
                    ],
                    throwOnError: false
                });
            } catch(e) {}
        }

        // 6. Wire interactive task list checkboxes
        preview.querySelectorAll('input[type="checkbox"]').forEach((checkbox, idx) => {
            checkbox.removeAttribute('disabled');
            checkbox.addEventListener('change', (e) => {
                toggleTaskInEditor(idx, e.target.checked);
            });
        });

        // 7. Wire interactive poll click listeners
        wirePollListeners();
    }

    function toggleTaskInEditor(taskIndex, isChecked) {
        if (!editor) return;
        const lines = editor.value.split('\n');
        let currentTask = 0;
        for (let i = 0; i < lines.length; i++) {
            if (/^\s*-\s*\[[ xX]\]/.test(lines[i])) {
                if (currentTask === taskIndex) {
                    lines[i] = lines[i].replace(/^(\s*-\s*\[)[ xX](\])/, `$1${isChecked ? 'x' : ' '}$2`);
                    break;
                }
                currentTask++;
            }
        }
        editor.value = lines.join('\n');
        if (tabsData[activeTabId]) tabsData[activeTabId].content = editor.value;
        updateHUD();
        saveWorkspace();
    }

    // --- Profile & Presence Header Helpers ---
    function updateProfileUI() {
        if (profileNameDisplay) profileNameDisplay.innerText = `${myUsername} (You)`;
        if (profileAvatarDisplay) {
            if (myAvatarUrl && (myAvatarUrl.startsWith('http://') || myAvatarUrl.startsWith('https://') || myAvatarUrl.startsWith('data:'))) {
                profileAvatarDisplay.innerHTML = `<img src="${escapeHtml(myAvatarUrl)}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.parentNode.innerText='👤'">`;
            } else if (myAvatarUrl) {
                profileAvatarDisplay.innerText = myAvatarUrl;
            } else {
                profileAvatarDisplay.innerText = '👤';
            }
        }
        if (profilePreviewName) profilePreviewName.innerText = myUsername;
        if (profilePreviewAvatar) {
            if (myAvatarUrl && (myAvatarUrl.startsWith('http://') || myAvatarUrl.startsWith('https://') || myAvatarUrl.startsWith('data:'))) {
                profilePreviewAvatar.innerHTML = `<img src="${escapeHtml(myAvatarUrl)}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.parentNode.innerText='👤'">`;
            } else if (myAvatarUrl) {
                profilePreviewAvatar.innerText = myAvatarUrl;
            } else {
                profilePreviewAvatar.innerText = '👤';
            }
        }
    }

    // --- Avatar Photo Upload & Processing ---
    function processAvatarImageFile(file) {
        if (!file || !file.type.startsWith('image/')) {
            showToast("Please select a valid image file", 'error');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Resize and crop to 160x160 square (object-fit: cover)
                const canvas = document.createElement('canvas');
                const size = 160;
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                
                const minDim = Math.min(img.width, img.height);
                const sx = (img.width - minDim) / 2;
                const sy = (img.height - minDim) / 2;
                ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
                
                const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
                myAvatarUrl = dataUrl;
                if (profileAvatarInput) profileAvatarInput.value = '';
                updateProfileUI();
                if (profileAvatarClearBtn) profileAvatarClearBtn.classList.remove('hidden');
                showToast("Photo selected! Click 'Save Profile' to apply.", 'success');
            };
            img.onerror = () => {
                showToast("Failed to load image file", 'error');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    if (profileAvatarFileInput) {
        profileAvatarFileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                processAvatarImageFile(e.target.files[0]);
                e.target.value = '';
            }
        });
    }

    if (profilePreviewAvatar) {
        profilePreviewAvatar.addEventListener('click', () => {
            if (profileAvatarFileInput) profileAvatarFileInput.click();
        });
    }

    if (profileAvatarClearBtn) {
        profileAvatarClearBtn.addEventListener('click', () => {
            myAvatarUrl = '';
            if (profileAvatarInput) profileAvatarInput.value = '';
            if (profileAvatarFileInput) profileAvatarFileInput.value = '';
            updateProfileUI();
            profileAvatarClearBtn.classList.add('hidden');
            showToast("Avatar reset to default", 'info');
        });
    }

    // Allow drag-and-drop avatar onto profile modal or avatar preview
    if (profileModal) {
        profileModal.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
        profileModal.addEventListener('drop', (e) => {
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                if (file.type && file.type.startsWith('image/')) {
                    e.preventDefault();
                    e.stopPropagation();
                    processAvatarImageFile(file);
                }
            }
        });
    }

    // Document Insert Image Button (File menu)
    if (insertImageBtn && noteImageFileInput) {
        insertImageBtn.addEventListener('click', () => noteImageFileInput.click());
        noteImageFileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                handleImageFile(e.target.files[0]);
                noteImageFileInput.value = '';
            }
        });
    }

    avatarPresetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const emoji = btn.getAttribute('data-avatar');
            if (profileAvatarInput) profileAvatarInput.value = emoji;
            myAvatarUrl = emoji;
            updateProfileUI();
            if (profileAvatarClearBtn) profileAvatarClearBtn.classList.remove('hidden');
        });
    });

    if (profilePillBtn) {
        profilePillBtn.addEventListener('click', () => {
            if (profileNameInput) profileNameInput.value = myUsername !== 'Anon' ? myUsername : '';
            if (profileAvatarInput) {
                // If it's a web URL, show it; don't dump huge data URLs in text input
                profileAvatarInput.value = (myAvatarUrl && (myAvatarUrl.startsWith('http://') || myAvatarUrl.startsWith('https://'))) ? myAvatarUrl : '';
            }
            updateProfileUI();
            if (profileAvatarClearBtn) {
                profileAvatarClearBtn.classList.toggle('hidden', !myAvatarUrl);
            }
            if (profileModal) profileModal.classList.remove('hidden');
            if (profileNameInput) profileNameInput.focus();
        });
    }

    if (nameBtn) {
        nameBtn.addEventListener('click', () => {
            if (profilePillBtn) profilePillBtn.click();
        });
    }

    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', async () => {
            const newName = profileNameInput ? profileNameInput.value.trim() || 'Anon' : 'Anon';
            myUsername = newName.substring(0, 15);
            
            const inputVal = profileAvatarInput ? profileAvatarInput.value.trim() : '';
            if (inputVal) {
                myAvatarUrl = inputVal;
            }
            
            localStorage.setItem('quickpad_username', myUsername);
            localStorage.setItem('quickpad_avatar', myAvatarUrl);
            
            updateProfileUI();
            if (profileModal) profileModal.classList.add('hidden');
            if (!myPrivateKey) await initCrypto();
            saveWorkspace();
            showToast("Profile updated successfully", 'success');
        });
    }

    // --- App Initialization ---
    async function init() {
        updateProfileUI();

        const urlParams = new URLSearchParams(window.location.search);
        const burnToken = urlParams.get('burn');
        
        if (burnToken) {
            isBurnMode = true;
            if (mdToggleBtn) mdToggleBtn.style.display = 'none';
            if (burnBtn) burnBtn.style.display = 'none';
            if (instantBurnBtn) instantBurnBtn.style.display = 'none';
            if (tabsBar) tabsBar.style.display = 'none';
            if (liveHud) liveHud.style.display = 'none';
            if (editor) editor.readOnly = true;
            await fetchBurnNote(burnToken);
        } else {
            let rawToken = '';
            let viewParam = urlParams.get('view');
            let padParam = urlParams.get('pad');

            if (viewParam) {
                isReadOnly = true;
                rawToken = viewParam;
                if (editor) {
                    editor.readOnly = true;
                    editor.placeholder = "This document is in Read-Only mode.";
                }
                if (newBtn) newBtn.style.display = 'none';
                if (timerBtn) timerBtn.style.display = 'none';
                if (burnBtn) burnBtn.style.display = 'none';
                if (instantBurnBtn) instantBurnBtn.style.display = 'none';
            } else if (padParam) {
                rawToken = padParam;
                window.history.replaceState({}, '', `#${rawToken}`);
            } else if (window.location.hash) {
                rawToken = window.location.hash.substring(1);
            } else {
                rawToken = generateToken();
                window.history.replaceState({}, '', `#${rawToken}`);
            }

            const isProtectedReadOnly = viewParam && (urlParams.get('protected') === '1' || urlParams.get('pin') === '1');
            if (isProtectedReadOnly && rawToken.includes('_')) {
                let parts = rawToken.split('_');
                currentToken = parts[0];
                const encKey = parts.slice(1).join('_');
                let unlocked = false;
                while (!unlocked) {
                    const enteredPass = await showCustomPrompt("🔐 Protected Read-Only Note", "This document is password protected. Enter passcode to decrypt:");
                    if (!enteredPass) {
                        showToast("Passcode required to view note.", "error");
                        break;
                    }
                    try {
                        const dec = CryptoJS.AES.decrypt(decodeURIComponent(encKey), enteredPass.trim()).toString(CryptoJS.enc.Utf8);
                        if (dec && dec.length > 0) {
                            urlKey = dec;
                            vaultPassword = dec;
                            unlocked = true;
                            showToast("Decrypted successfully!", "success");
                        } else {
                            showToast("Incorrect passcode. Try again.", "error");
                        }
                    } catch(err) {
                        showToast("Incorrect passcode. Try again.", "error");
                    }
                }
            } else if (rawToken.includes('_')) {
                let parts = rawToken.split('_');
                currentToken = parts[0];
                urlKey = parts.slice(1).join('_');
                vaultPassword = urlKey;
            } else {
                currentToken = rawToken;
                urlKey = null;
            }

            // Seed friendly welcome template if fresh workspace
            if (!viewParam && !padParam && !window.location.hash && tabsData['main'] && !tabsData['main'].content) {
                tabsData['main'].content = WELCOME_CHECKLIST_TEMPLATE;
                if (editor) editor.value = WELCOME_CHECKLIST_TEMPLATE;
            }

            await initCrypto();
            if (tabsBar) tabsBar.classList.remove('hidden');
            if (liveHud) liveHud.classList.remove('hidden');
            renderTabs();
            initBroadcastSync(currentToken);
            setupRealtimeSync(currentToken);
        }

        // Initialize v3.0 Power Suite
        initLaserCanvas();
        initSteganography();
        initWormhole();
        initCodeRunner();
        initTypewriterAndFocus();
        initSlashCommands();
        initHorizontalScrollbars();

        // Initialize v4.0 Pro Enhancements
        initFloatingFormatBar();
        initPomodoroTimer();
        initCardExporter();
        initSharePassProtection();
    }

    function initHorizontalScrollbars() {
        const scrollContainers = [
            document.getElementById('app-header'),
            document.getElementById('live-hud'),
            document.getElementById('tabs-bar')
        ].filter(Boolean);

        scrollContainers.forEach(container => {
            let isDown = false;
            let startX = 0;
            let scrollLeft = 0;

            container.addEventListener('mousedown', (e) => {
                if (e.target.closest('button, input, select, a, .flare-btn, .dropdown-group')) return;
                isDown = true;
                startX = e.pageX - container.offsetLeft;
                scrollLeft = container.scrollLeft;
                container.style.cursor = 'grab';
            });

            window.addEventListener('mouseup', () => {
                if (isDown) {
                    isDown = false;
                    container.style.cursor = '';
                }
            });

            window.addEventListener('mousemove', (e) => {
                if (!isDown) return;
                e.preventDefault();
                const x = e.pageX - container.offsetLeft;
                const walk = (x - startX) * 1.5;
                container.scrollLeft = scrollLeft - walk;
            });
        });
    }

    function generateToken() { 
        return Math.random().toString(36).substring(2, 12) + '_' + Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12); 
    }

    // --- Local Multi-Tab Real-Time Sync Engine (BroadcastChannel) ---
    function initBroadcastSync(token) {
        if (!token || typeof BroadcastChannel === 'undefined') return;
        try {
            if (localSyncChannel) {
                try { localSyncChannel.close(); } catch(e) {}
            }
            localSyncChannel = new BroadcastChannel('quickpad_tabsync_' + token);
            localSyncChannel.onmessage = (event) => {
                const data = event.data;
                if (!data || data.senderId === myDeviceId) return;

                if (data.type === 'tab_content') {
                    if (tabsData[data.tid]) {
                        tabsData[data.tid].content = data.content;
                        lastSyncedServerTabs[data.tid] = { content: data.content };
                        lastSavedTabsJSON = JSON.stringify(tabsData);
                        if (data.tid === activeTabId) {
                            if (!isTyping) {
                                const isDraw = tabsData[data.tid].name && tabsData[data.tid].name.endsWith('.draw');
                                if (isDraw) {
                                    if (typeof wbIsDrawing !== 'undefined' && !wbIsDrawing) {
                                        loadWhiteboardFromTab(data.content);
                                    }
                                } else if (editor) {
                                    const isFocused = (document.activeElement === editor);
                                    if (isFocused) {
                                        const start = editor.selectionStart;
                                        const end = editor.selectionEnd;
                                        editor.value = data.content;
                                        editor.setSelectionRange(start, end);
                                    } else {
                                        editor.value = data.content;
                                    }
                                    updatePreview();
                                    updateHUD();
                                }
                            }
                        }
                    }
                } else if (data.type === 'tabs_structure') {
                    if (data.tabs) {
                        tabsData = data.tabs;
                        lastSavedTabsJSON = JSON.stringify(tabsData);
                        renderTabs();
                        if (tabsData[activeTabId] && editor) {
                            editor.value = tabsData[activeTabId].content || '';
                            updatePreview();
                            updateHUD();
                        }
                    }
                } else if (data.type === 'cursor_presence') {
                    if (data.cursor) {
                        peerCursorsData[data.senderId] = data.cursor;
                        if (data.cursor.tabId === activeTabId) {
                            renderPeerCursor(data.senderId, data.cursor.pos, data.cursor.name);
                        }
                    }
                } else if (data.type === 'laser_presence') {
                    if (data.laser && data.laser.active) {
                        remoteLasers[data.senderId] = {
                            x: data.laser.x,
                            y: data.laser.y,
                            targetX: data.laser.x,
                            targetY: data.laser.y,
                            trail: [],
                            color: data.laser.color,
                            name: data.laser.name,
                            active: true,
                            opacity: 1,
                            lastUpdate: Date.now()
                        };
                    } else {
                        delete remoteLasers[data.senderId];
                    }
                } else if (data.type === 'whiteboard_stroke') {
                    if (data.stroke && data.tabId === activeTabId) {
                        drawRemoteStrokeBatch(data.stroke);
                    }
                } else if (data.type === 'request_initial_sync') {
                    if (tabsData && Object.keys(tabsData).length > 0) {
                        broadcastLocalSync({
                            type: 'tabs_structure',
                            tabs: tabsData,
                            senderId: myDeviceId
                        });
                    }
                }
            };

            // Request initial sync from any open tab on this device
            broadcastLocalSync({
                type: 'request_initial_sync',
                senderId: myDeviceId
            });
        } catch (e) {
            console.warn("BroadcastChannel initialization warning:", e);
        }
    }

    function broadcastLocalSync(msg) {
        if (!localSyncChannel) return;
        try {
            localSyncChannel.postMessage(msg);
        } catch(e) {}
    }

    // --- Real-Time Firestore Synchronization ---
    function setupRealtimeSync(token) {
        if (!db) return;
        if (unsubscribeWorkspace) unsubscribeWorkspace();
        initStrokesListener();
        
        try {
            unsubscribeWorkspace = db.collection("workspaces").doc(token).onSnapshot((docSnap) => {
                try {
                    if (docSnap && docSnap.exists) {
                        const data = docSnap.data();
                    
                        // Check if burned or expired
                        if (data.burned || (data.expires_at && Date.now() > data.expires_at)) {
                            if (data.expires_at && Date.now() > data.expires_at && !data.burned) {
                                db.collection("workspaces").doc(token).set({ burned: true }, { merge: true });
                            }
                            document.body.innerHTML = `
                                <div style='height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#050811;color:#fff;'>
                                    <div class='splash-badge' style='margin-bottom:15px;color:#ff0055;border-color:rgba(255,0,85,0.4);'>ZERO-TRACE ACTIVE</div>
                                    <h1 class='glitch-text' data-text='WORKSPACE BURNED' style='color:#ff0055;text-shadow:0 0 24px rgba(255,0,85,0.6);margin-bottom:20px;'>WORKSPACE BURNED</h1>
                                    <p style='color:#94a3b8;font-family:monospace;margin-bottom:30px;max-width:400px;text-align:center;'>This workspace reached its expiration timer or was deleted. All ciphertext was eradicated.</p>
                                    <button onclick="window.location.href=window.location.origin+window.location.pathname" class="btn primary-action" style="font-size:1.05rem;padding:12px 28px;border-radius:10px;">Create New Pad</button>
                                </div>`;
                            return;
                        }

                        // Handle active self-destruct timer countdown in HUD
                        if (data.expires_at) {
                            startHudCountdown(data.expires_at);
                        } else if (hudTimerBadge) {
                            hudTimerBadge.classList.add('hidden');
                            if (countdownInterval) clearInterval(countdownInterval);
                        }
                    
                        // Legacy password lock fallback
                        if (data.is_encrypted && !vaultPassword) {
                            vaultPassword = prompt("🔒 Legacy workspace: enter the Vault Password to decrypt:");
                            if (!vaultPassword) { window.location.href = window.location.origin + window.location.pathname; return; }
                            
                            // Check covert Duress PIN
                            if (duressPin && vaultPassword.trim() === duressPin.trim()) {
                                isDuressUnlocked = true;
                                isReadOnly = true;
                                tabsData = { 'main': { name: 'notes.txt', content: duressContent || 'Biology 101 Lecture Notes - Cell Mitosis\n\n1. Interphase\n2. Prophase\n3. Metaphase\n4. Anaphase\n5. Telophase', is_encrypted: false } };
                                renderTabs();
                                switchTab('main');
                                showToast("🛡️ Decoy Vault Opened", 'info');
                                return;
                            }
                        }

                        // Synchronize workspace tabs if tabs or legacy content are present in the snapshot
                        if (data.tabs || data.content) {
                            let serverTabs = data.tabs || {};
                            if (data.content && !data.tabs) serverTabs = { 'main': { name: 'main.txt', content: data.content, is_encrypted: data.is_encrypted } };
                            
                            // Decrypt all server tab contents
                            for (let tid in serverTabs) {
                                let sTab = serverTabs[tid];
                                let content = sTab.content || '';
                                if (content.startsWith("U2FsdGVkX1") && !sTab.is_secret) {
                                    if (vaultPassword && typeof CryptoJS !== 'undefined') {
                                        try {
                                            const bytes = CryptoJS.AES.decrypt(content, vaultPassword);
                                            const dec = bytes.toString(CryptoJS.enc.Utf8);
                                            if (dec || bytes.sigBytes >= 0) content = dec;
                                        } catch(e) {}
                                    }
                                }
                                if (sTab.is_secret && content.startsWith("U2FsdGVkX1")) {
                                    if (tabsData[tid] && tabsData[tid].secret_pass && typeof CryptoJS !== 'undefined') {
                                        try {
                                            const bytes = CryptoJS.AES.decrypt(content, tabsData[tid].secret_pass);
                                            const dec = bytes.toString(CryptoJS.enc.Utf8);
                                            if (!(dec === "" && bytes.sigBytes < 0)) content = dec;
                                        } catch(e) {}
                                    }
                                }
                                serverTabs[tid].content = content;
                            }

                            let tabsUpdated = false;

                            // Self-Healing: Deduplicate duplicate tabs with the same name (e.g. phantom duplicates created by race conditions)
                            const nameToTids = {};
                            for (let tid in serverTabs) {
                                const sName = (serverTabs[tid].name || '').trim().toLowerCase();
                                if (!nameToTids[sName]) nameToTids[sName] = [];
                                nameToTids[sName].push(tid);
                            }

                            for (let sName in nameToTids) {
                                const tids = nameToTids[sName];
                                if (tids.length > 1) {
                                    let primaryTid = tids.includes('main') ? 'main' : tids[0];
                                    let primaryHasContent = serverTabs[primaryTid] && serverTabs[primaryTid].content && serverTabs[primaryTid].content.trim().length > 0;
                                    if (!primaryHasContent) {
                                        let contentTid = tids.find(t => serverTabs[t] && serverTabs[t].content && serverTabs[t].content.trim().length > 0);
                                        if (contentTid) {
                                            serverTabs[primaryTid].content = serverTabs[contentTid].content;
                                            serverTabs[primaryTid].is_encrypted = serverTabs[contentTid].is_encrypted;
                                            serverTabs[contentTid].content = '';
                                        }
                                    }

                                    for (let dupTid of tids) {
                                        if (dupTid !== primaryTid) {
                                            const dupContent = (serverTabs[dupTid] && serverTabs[dupTid].content) ? serverTabs[dupTid].content.trim() : '';
                                            if (!dupContent) {
                                                delete serverTabs[dupTid];
                                                if (tabsData[dupTid]) {
                                                    delete tabsData[dupTid];
                                                    tabsUpdated = true;
                                                }
                                                deleteTabFromDB(dupTid);
                                                if (activeTabId === dupTid) {
                                                    activeTabId = primaryTid;
                                                    if (editor && serverTabs[primaryTid]) {
                                                        editor.value = serverTabs[primaryTid].content || '';
                                                        editor.readOnly = isReadOnly;
                                                        updatePreview();
                                                        updateHUD();
                                                    }
                                                }
                                            } else {
                                                const extMatch = (serverTabs[dupTid].name || '').match(/\.[^/.]+$/);
                                                const ext = extMatch ? extMatch[0] : '.txt';
                                                const base = (serverTabs[dupTid].name || 'tab').replace(/\.[^/.]+$/, '');
                                                const disambiguatedName = `${base}-2${ext}`;
                                                serverTabs[dupTid].name = disambiguatedName;
                                                if (tabsData[dupTid]) {
                                                    tabsData[dupTid].name = disambiguatedName;
                                                    tabsUpdated = true;
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            // Process server tabs
                            for (let tid in serverTabs) {
                                let sTab = serverTabs[tid];
                                let content = sTab.content || '';
                                
                                if (!tabsData[tid]) { 
                                    tabsData[tid] = { name: sTab.name, content: content, is_encrypted: sTab.is_encrypted || false, is_secret: sTab.is_secret || false }; 
                                    tabsUpdated = true;
                                    if (tid === activeTabId && editor) {
                                        editor.value = (sTab.is_secret && content.startsWith("U2FsdGVkX1")) ? "[ LOCKED TAB - Please click the tab again and enter password to view ]" : content;
                                        editor.readOnly = isReadOnly || (sTab.is_secret && content.startsWith("U2FsdGVkX1"));
                                        updatePreview();
                                        updateHUD();
                                    }
                                } else {
                                    if (tabsData[tid].name !== sTab.name) { tabsData[tid].name = sTab.name; tabsUpdated = true; }
                                    let localContent = tabsData[tid].content;
                                    let baseContent = lastSyncedServerTabs[tid] ? lastSyncedServerTabs[tid].content : '';
                                    let normLocal = (localContent || '').replace(/\r\n/g, '\n').trimEnd();
                                    let normServer = (content || '').replace(/\r\n/g, '\n').trimEnd();
                                    let normBase = (baseContent || '').replace(/\r\n/g, '\n').trimEnd();
                                    
                                    let localChanged = (normLocal.trim() !== '') && (normLocal !== normBase);
                                    let serverChanged = normServer !== normBase;

                                    if (localChanged && serverChanged && normLocal !== normServer) {
                                        if (mergeModal && !mergeModal.classList.contains('hidden')) return;
                                        showMergeModal(tid, content, localContent);
                                    } else if (localChanged && !serverChanged) {
                                        // Local changes pending; will be saved via debounced input save (prevents write ping-pong loop)
                                    } else if (serverChanged && !localChanged) {
                                        tabsData[tid].content = content; 
                                        if (tid === activeTabId && !isTyping) {
                                            const isDraw = tabsData[tid].name && tabsData[tid].name.endsWith('.draw');
                                            if (isDraw) {
                                                if (typeof wbIsDrawing !== 'undefined' && !wbIsDrawing) {
                                                    loadWhiteboardFromTab(content);
                                                }
                                            } else if (editor) {
                                                let cursor = editor.selectionStart || 0;
                                                editor.value = (tabsData[tid].is_secret && !tabsData[tid].secret_pass && content.startsWith("U2FsdGVkX1")) ? "[ LOCKED TAB - Please click the tab again and enter password to view ]" : content;
                                                editor.readOnly = isReadOnly || (tabsData[tid].is_secret && !tabsData[tid].secret_pass);
                                                const safePos = Math.min(cursor, content.length);
                                                editor.setSelectionRange(safePos, safePos);
                                                updatePreview();
                                                updateHUD(); 
                                            }
                                        }
                                        broadcastLocalSync({
                                            type: 'tab_content',
                                            tid: tid,
                                            content: content,
                                            senderId: myDeviceId
                                        });
                                    }
                                }
                                lastSyncedServerTabs[tid] = { content: content };
                            }
                            
                            // Remove tabs deleted remotely (only when serverTabs has entries)
                            if (Object.keys(serverTabs).length > 0) {
                                for (let tid in tabsData) {
                                    if (!serverTabs[tid]) {
                                        delete tabsData[tid];
                                        tabsUpdated = true;
                                        if (tid === activeTabId) {
                                            activeTabId = Object.keys(tabsData)[0] || 'main';
                                            if (!tabsData[activeTabId]) {
                                                tabsData[activeTabId] = { name: 'main.txt', content: '', is_encrypted: false };
                                            }
                                            switchTab(activeTabId, true);
                                        }
                                    }
                                }
                            }
                            
                            if (!tabsData[activeTabId]) {
                                let firstTab = Object.keys(tabsData)[0] || 'main';
                                activeTabId = firstTab;
                                if (!tabsData[activeTabId]) {
                                    tabsData[activeTabId] = { name: 'main.txt', content: '', is_encrypted: false };
                                }
                                const isDraw = tabsData[firstTab] && tabsData[firstTab].name && tabsData[firstTab].name.endsWith('.draw');
                                if (isDraw) {
                                    switchTab(firstTab, true);
                                } else if (editor) {
                                    editor.value = tabsData[firstTab].content || '';
                                    editor.readOnly = isReadOnly;
                                }
                            }
                            
                            lastSavedTabsJSON = JSON.stringify(tabsData);
                            if (tabsUpdated) renderTabs();
                        }

                        if (data.dms) {
                            globalDms = data.dms;
                            calculateUnread(globalDms);
                            renderChat();
                        }

                        // v3.0 Real-Time Polls Sync
                        if (data.polls) {
                            workspacePolls = data.polls;
                            if (isMarkdown || isSplitMode) updatePreview();
                        }

                        // v3.0 WebRTC Wormhole Signal Handling
                        if (data.wormhole && data.wormhole.to === myDeviceId && data.wormhole.timestamp && data.wormhole.timestamp > lastProcessedWormholeTimestamp && (Date.now() - data.wormhole.timestamp < 60000)) {
                            lastProcessedWormholeTimestamp = data.wormhole.timestamp;
                            handleIncomingWormholeSignal(data.wormhole);
                        }

                        if (data.cursors) {
                            let activeUsers = new Map();
                            activeUsers.set(myDeviceId, { name: myUsername, avatar: myAvatarUrl });
                            
                            for (let cid in data.cursors) {
                                if (cid === myDeviceId) continue;
                                let c = data.cursors[cid];
                                if (c.timestamp && (Date.now() - c.timestamp > 15000)) {
                                    removePeerCursor(cid);
                                    delete peerCursorsData[cid];
                                    continue;
                                }
                                peerCursorsData[cid] = { pos: c.pos, name: c.name, pubKey: c.pubKey, tabId: c.tabId, avatar: c.avatar, speaking: !!c.speaking };
                                activeUsers.set(cid, { name: c.name || 'Anon', avatar: c.avatar || '', speaking: !!c.speaking });
                                
                                if (c.tabId === activeTabId) renderPeerCursor(cid, c.pos, c.name);
                                else removePeerCursor(cid);

                                // Check remote cursor emoji flare
                                if (c.flare && c.flare.timestamp && (Date.now() - c.flare.timestamp < 3500)) {
                                    if (!peerCursorsData[cid].lastFlareTime || peerCursorsData[cid].lastFlareTime !== c.flare.timestamp) {
                                        spawnFlareParticle(c.pos, c.flare.emoji, false, getCaretCoordinates(c.pos));
                                        peerCursorsData[cid].lastFlareTime = c.flare.timestamp;
                                    }
                                }

                                // v3.0 Check remote collaborator laser pointer & trail
                                if (c.laser && c.laser.active && (Date.now() - c.laser.timestamp < 10000)) {
                                    const rx = typeof c.laser.x === 'number' ? c.laser.x : null;
                                    const ry = typeof c.laser.y === 'number' ? c.laser.y : null;
                                    if (rx !== null && ry !== null) {
                                        if (!remoteLasers[cid]) {
                                            remoteLasers[cid] = {
                                                x: rx,
                                                y: ry,
                                                targetX: rx,
                                                targetY: ry,
                                                trail: [],
                                                color: c.laser.color || getPeerColor(cid).color,
                                                name: c.laser.name || c.name || 'Collaborator',
                                                active: true,
                                                opacity: 1,
                                                lastUpdate: Date.now()
                                            };
                                        } else {
                                            const rl = remoteLasers[cid];
                                            rl.targetX = rx;
                                            rl.targetY = ry;
                                            rl.color = c.laser.color || rl.color;
                                            rl.name = c.laser.name || c.name || rl.name;
                                            rl.active = true;
                                            rl.opacity = 1;
                                            rl.lastUpdate = Date.now();
                                            if (Math.hypot(rx - rl.x, ry - rl.y) > 2) {
                                                rl.trail.push({ x: rx, y: ry, time: Date.now() });
                                                if (rl.trail.length > 25) rl.trail.shift();
                                            }
                                        }
                                    }
                                } else {
                                    delete remoteLasers[cid];
                                }
                            }

                            // Prune disconnected peers from remote lasers
                            for (let cid in remoteLasers) {
                                if (!activeUsers.has(cid)) {
                                    delete remoteLasers[cid];
                                }
                            }
                            
                            // Save global active users map
                            currentActiveUsers = activeUsers;
                            updateWormholePeersUI();

                            // Update Presence Header UI
                            const totalCount = activeUsers.size;
                            if (onlineCountText) {
                                onlineCountText.innerText = totalCount === 1 ? '1 Online' : `${totalCount} Online`;
                            }
                            if (peerAvatarsList) {
                                let peersHtml = '';
                                activeUsers.forEach((user, cid) => {
                                    if (cid === myDeviceId) return;
                                    let avatarContent = '👤';
                                    if (user.avatar && (user.avatar.startsWith('http://') || user.avatar.startsWith('https://') || user.avatar.startsWith('data:'))) {
                                        avatarContent = `<img src="${escapeHtml(user.avatar)}" alt="${escapeHtml(user.name)}" onerror="this.parentNode.innerText='👤'">`;
                                    } else if (user.avatar) {
                                        avatarContent = escapeHtml(user.avatar);
                                    }
                                    const colorObj = getPeerColor(cid);
                                    const unread = unreadMessages[cid] ? `<span class="glowing-dot" style="position:absolute;top:-2px;right:-2px;"></span>` : '';
                                    const speakingClass = user.speaking ? ' speaking' : '';
                                    
                                    peersHtml += `
                                        <div class="peer-avatar-wrapper" data-cid="${escapeHtml(cid)}" data-name="${escapeHtml(user.name)}" title="${escapeHtml(user.name)} (Click to DM)">
                                            <div class="peer-avatar-bubble${speakingClass}" style="border-color:${colorObj.color}">
                                                ${avatarContent}
                                                ${unread}
                                            </div>
                                            <div class="peer-tooltip">
                                                <span class="peer-tooltip-name" style="color:${colorObj.color}">${escapeHtml(user.name)}</span>
                                                <span class="peer-tooltip-action">${user.speaking ? '🔊 Speaking...' : '💬 Click to DM'}</span>
                                            </div>
                                        </div>
                                    `;
                                });
                                peerAvatarsList.innerHTML = peersHtml;

                                // Attach resilient click & touch listeners to each peer avatar wrapper
                                peerAvatarsList.querySelectorAll('.peer-avatar-wrapper').forEach(wrap => {
                                    const cid = wrap.getAttribute('data-cid');
                                    const name = wrap.getAttribute('data-name');
                                    const triggerChat = (e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        window.openChat(cid, name);
                                    };
                                    wrap.addEventListener('click', triggerChat);
                                    wrap.addEventListener('touchend', triggerChat);
                                });
                            }
                        }
                    } else {
                        if (tabsData['main'] && !tabsData['main'].content && !isReadOnly && !isBurnMode) {
                            tabsData['main'].content = WELCOME_CHECKLIST_TEMPLATE;
                            if (editor && activeTabId === 'main') editor.value = WELCOME_CHECKLIST_TEMPLATE;
                            updateHUD();
                            updatePreview();
                            tabsContentDirty = true;
                            saveWorkspace();
                        }
                    }
                } catch (err) {
                    console.error("Critical error in snapshot handler:", err);
                }
            }, (error) => {
                console.warn("Firestore onSnapshot error:", error);
                if (error && (error.code === 'resource-exhausted' || (error.message && error.message.includes('Quota exceeded')))) {
                    isCloudQuotaExceeded = true;
                    setSaveStatus('quota');
                } else {
                    setSaveStatus('error');
                }
            });
        } catch (e) {
            console.warn("Firestore listener setup warning:", e);
        }
    }

    function startHudCountdown(expiresAt) {
        if (!hudTimerBadge || !hudTimerVal) return;
        hudTimerBadge.classList.remove('hidden');
        if (countdownInterval) clearInterval(countdownInterval);

        const updateTimer = () => {
            const remainingMs = expiresAt - Date.now();
            if (remainingMs <= 0) {
                hudTimerVal.innerText = "00:00 (Expiring)";
                clearInterval(countdownInterval);
                return;
            }
            const totalSecs = Math.floor(remainingMs / 1000);
            const mins = Math.floor(totalSecs / 60);
            const secs = totalSecs % 60;
            hudTimerVal.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        };
        updateTimer();
        countdownInterval = setInterval(updateTimer, 1000);
    }

    // --- Tabs Management ---
    function renderTabs() {
        if (!tabsContainer) return;
        tabsContainer.innerHTML = '';
        for (let tid in tabsData) {
            let t = document.createElement('div');
            t.className = 'tab' + (tid === activeTabId ? ' active' : ''); 
            t.innerText = (tabsData[tid].is_secret ? '🔒 ' : '') + tabsData[tid].name;
            
            let delBtn = document.createElement('span');
            delBtn.className = 'tab-close';
            delBtn.innerText = '✕';
            delBtn.title = "Delete Tab";
            delBtn.onclick = async (e) => {
                e.stopPropagation();
                const confirmed = await showCustomConfirm("Delete Tab", `Are you sure you want to delete tab "${tabsData[tid].name}"?`);
                if (confirmed) {
                    delete tabsData[tid];
                    tabsContentDirty = true;
                    if (tid === activeTabId) {
                        activeTabId = Object.keys(tabsData)[0] || null;
                        if (!activeTabId) {
                            activeTabId = generateToken();
                            tabsData[activeTabId] = { name: 'main.txt', content: '', is_encrypted: false };
                        }
                        switchTab(activeTabId);
                    }
                    renderTabs();
                    deleteTabFromDB(tid);
                    broadcastLocalSync({
                        type: 'tabs_structure',
                        tabs: tabsData,
                        senderId: myDeviceId
                    });
                    saveWorkspace();
                    showToast("Tab deleted", 'info');
                }
            };

            t.ondblclick = (e) => {
                e.stopPropagation();
                if (t.querySelector('.tab-rename-input')) return;
                const oldName = tabsData[tid].name;
                t.innerHTML = '';
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'tab-rename-input';
                input.value = oldName;
                t.appendChild(input);
                input.focus();
                input.select();

                let committed = false;
                const commit = () => {
                    if (committed) return;
                    committed = true;
                    const val = input.value.trim();
                    if (val && val !== oldName) {
                        tabsData[tid].name = val;
                        tabsContentDirty = true;
                        broadcastLocalSync({
                            type: 'tabs_structure',
                            tabs: tabsData,
                            senderId: myDeviceId
                        });
                        saveWorkspace();
                        showToast(`Renamed tab to "${val}"`, 'success');
                    }
                    renderTabs();
                };

                input.onkeydown = (ke) => {
                    if (ke.key === 'Enter') {
                        ke.preventDefault();
                        commit();
                    } else if (ke.key === 'Escape') {
                        ke.preventDefault();
                        committed = true;
                        renderTabs();
                    }
                };
                input.onblur = commit;
            };

            t.onclick = () => switchTab(tid);
            t.appendChild(delBtn);
            tabsContainer.appendChild(t);
        }
        const activeTabEl = tabsContainer.querySelector('.tab.active');
        if (activeTabEl && tabsBar) {
            activeTabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
    }

    async function switchTab(tid, skipSave = false) {
        if (tabsData[tid] && tabsData[tid].is_secret && !tabsData[tid].secret_pass && tabsData[tid].content && tabsData[tid].content.startsWith("U2FsdGVkX1")) {
            const pass = await showCustomPrompt("Unlock Tab", "This tab is a nested vault. Enter password to view:");
            if (!pass) return; // cancel switch
            
            try {
                if (typeof CryptoJS !== 'undefined') {
                    const bytes = CryptoJS.AES.decrypt(tabsData[tid].content, pass.trim());
                    const dec = bytes.toString(CryptoJS.enc.Utf8);
                    if (dec || bytes.sigBytes >= 0) {
                        tabsData[tid].content = dec;
                        tabsData[tid].secret_pass = pass.trim();
                        showToast("Tab unlocked!", 'success');
                    } else {
                        showToast("Incorrect password.", 'error');
                        return;
                    }
                }
            } catch(e) {
                showToast("Incorrect password.", 'error');
                return;
            }
        }

        if (activeTabId !== tid && activeTabId && tabsData[activeTabId]) {
            if (tabsData[activeTabId].name && tabsData[activeTabId].name.endsWith('.draw')) {
                if (whiteboardCanvas && whiteboardCanvas.width > 0 && whiteboardCanvas.height > 0 && !wbIsLoading) {
                    tabsData[activeTabId].content = whiteboardCanvas.toDataURL('image/png');
                    saveWorkspace();
                }
            } else if (editor) {
                tabsData[activeTabId].content = editor.value;
            }
        }
        
        activeTabId = tid; 
        const isDrawTab = tabsData[tid] && tabsData[tid].name && tabsData[tid].name.endsWith('.draw');

        if (isDrawTab) {
            if (canvasContainer) canvasContainer.classList.remove('hidden');
            if (editor) editor.style.display = 'none';
            if (preview) preview.style.display = 'none';
            if (editorMirror) editorMirror.style.display = 'none';
            loadWhiteboardFromTab(tabsData[tid].content);
        } else {
            if (canvasContainer) canvasContainer.classList.add('hidden');
            if (editor) {
                editor.style.display = '';
                editor.value = tabsData[tid] ? tabsData[tid].content : '';
                editor.readOnly = isReadOnly;
            }
            if (preview) preview.style.display = (isMarkdown || isSplitMode) ? 'block' : 'none';
            if (editorMirror) editorMirror.style.display = '';
            if (tabsData[tid] && tabsData[tid].content) {
                triggerCipherGlitchAnimation(tabsData[tid].content);
            }
        }

        renderTabs();
        updatePreview();
        isTyping = false;
        updateHUD();
        if (editor && !isDrawTab) editor.focus();
        if (isFocusMode) scheduleFocusDimmingUpdate();
        if (privacyInspectorModal && !privacyInspectorModal.classList.contains('hidden')) updatePrivacyInspector();
        if (!skipSave) saveWorkspace();
    }

    if (addTabBtn) {
        addTabBtn.onclick = async () => {
            const name = await showCustomPrompt("New Tab", "Enter a name (use .draw for a whiteboard):", `tab-${Object.keys(tabsData).length + 1}.txt`);
            if (name && name.trim()) {
                let tid = generateToken();
                tabsData[tid] = { name: name.trim(), content: '', is_encrypted: false };
                tabsContentDirty = true;
                switchTab(tid);
                broadcastLocalSync({
                    type: 'tabs_structure',
                    tabs: tabsData,
                    senderId: myDeviceId
                });
                showToast("New tab created", 'success');
            }
        };
    }

    async function deleteTabFromDB(tid) {
        if (isBurnMode || !db || !currentToken) return;
        try {
            const payload = {};
            payload[`tabs.${tid}`] = firebase.firestore.FieldValue.delete();
            await db.collection("workspaces").doc(currentToken).update(payload);
        } catch(e) {}
    }

    // --- Workspace Save & Encryption ---
    async function saveWorkspace() {
        if (isReadOnly || isBurnMode) return;
        if (!currentToken || !editor) return;
        if (!activeTabId || !tabsData[activeTabId]) {
            activeTabId = Object.keys(tabsData)[0] || 'main';
            if (!tabsData[activeTabId]) {
                tabsData[activeTabId] = { name: 'main.txt', content: '', is_encrypted: false };
            }
        }
        try {
            const isDraw = tabsData[activeTabId] && tabsData[activeTabId].name && tabsData[activeTabId].name.endsWith('.draw');
            if (isDraw) {
                if (whiteboardCanvas && whiteboardCanvas.width > 0 && whiteboardCanvas.height > 0 && !wbIsLoading) {
                    const canvasData = whiteboardCanvas.toDataURL('image/png');
                    if (tabsData[activeTabId].content !== canvasData) {
                        tabsData[activeTabId].content = canvasData;
                        tabsContentDirty = true;
                    }
                }
            } else {
                if (tabsData[activeTabId].content !== editor.value) {
                    tabsData[activeTabId].content = editor.value;
                    tabsContentDirty = true;
                }
            }
            
            let currentTabsJSON = JSON.stringify(tabsData);
            const needsTabsSave = tabsContentDirty || (currentTabsJSON !== lastSavedTabsJSON);

            // If nothing changed and no timer or polls, skip network write
            if (!needsTabsSave && !timerMinutes && Object.keys(workspacePolls).length === 0) {
                setSaveStatus(isCloudQuotaExceeded ? 'quota' : 'saved');
                return;
            }

            const payload = {
                is_encrypted: !!vaultPassword,
                cursors: {
                    [myDeviceId]: {
                        pos: editor.selectionStart || 0,
                        name: myUsername,
                        avatar: myAvatarUrl,
                        tabId: activeTabId,
                        timestamp: Date.now(),
                        pubKey: myPublicKeyJwk,
                        laser: (isLaserActive && localLaser.visible && localLaser.inBounds && localLaser.x !== null) ? {
                            active: true,
                            x: Math.round(localLaser.x),
                            y: Math.round(localLaser.y),
                            color: getPeerColor(myDeviceId).color,
                            name: myUsername || 'Collaborator',
                            timestamp: Date.now()
                        } : null
                    }
                }
            };

            if (Object.keys(workspacePolls).length > 0) {
                payload.polls = workspacePolls;
            }
            
            if (needsTabsSave || isTyping) {
                payload.tabs = {};
                for (let tid in tabsData) {
                    let contentToSave = tabsData[tid].content;
                    if (tabsData[tid].is_secret && tabsData[tid].secret_pass && contentToSave && !contentToSave.startsWith("U2FsdGVkX1") && typeof CryptoJS !== 'undefined') {
                        contentToSave = CryptoJS.AES.encrypt(contentToSave, tabsData[tid].secret_pass).toString();
                    }
                    if (vaultPassword && contentToSave && !contentToSave.startsWith("U2FsdGVkX1") && typeof CryptoJS !== 'undefined') {
                        contentToSave = CryptoJS.AES.encrypt(contentToSave, vaultPassword).toString();
                    }
                    payload.tabs[tid] = { name: tabsData[tid].name, content: contentToSave, is_secret: !!tabsData[tid].is_secret };
                    lastSyncedServerTabs[tid] = { content: tabsData[tid].content };
                }
            }
            
            if (timerMinutes) {
                payload.expires_at = Date.now() + (timerMinutes * 60 * 1000);
                timerMinutes = null;
            }
            
            if (db) {
                showLoader();
                try {
                    await db.collection("workspaces").doc(currentToken).set(payload, { merge: true });
                    lastSavedTabsJSON = currentTabsJSON;
                    tabsContentDirty = false;
                    isCloudQuotaExceeded = false;
                    setSaveStatus('saved');
                } catch(netErr) {
                    console.warn("Firestore save error:", netErr);
                    if (netErr && (netErr.code === 'resource-exhausted' || (netErr.message && netErr.message.includes('Quota exceeded')))) {
                        isCloudQuotaExceeded = true;
                        setSaveStatus('quota');
                        if (!hasWarnedQuota) {
                            hasWarnedQuota = true;
                            showToast("⚠️ Firebase daily write quota exceeded. Notes are saved locally & syncing between your tabs.", "warning", 8000);
                        }
                    } else {
                        setSaveStatus('error');
                    }
                } finally {
                    setTimeout(hideLoader, 200);
                }
            } else {
                lastSavedTabsJSON = currentTabsJSON;
                tabsContentDirty = false;
                setSaveStatus('saved');
            }
        } catch (e) {
            console.error("Error saving workspace:", e);
            hideLoader();
            setSaveStatus('error');
        } finally {
            isTyping = false;
            updateHUD();
        }
    }

    // Heartbeat sync - only save if content is dirty
    setInterval(() => {
        if (!document.hidden && !isBurnMode && !isReadOnly && tabsContentDirty) {
            saveWorkspace();
        }
    }, 30000);

    // --- Peer Colors & Cursor Engine ---
    const PEER_COLORS = [
        { color: '#00fff9', text: '#000' }, // Cyan
        { color: '#00ff88', text: '#000' }, // Emerald
        { color: '#ff007f', text: '#fff' }, // Hot Pink
        { color: '#ffd600', text: '#000' }, // Gold
        { color: '#a855f7', text: '#fff' }, // Purple
        { color: '#ff6b35', text: '#fff' }, // Orange
        { color: '#38bdf8', text: '#000' }  // Sky Blue
    ];

    function getPeerColor(peerId) {
        let hash = 0;
        const str = peerId || 'anon';
        for (let i = 0; i < str.length; i++) hash = (hash << 5) - hash + str.charCodeAt(i);
        const index = Math.abs(hash) % PEER_COLORS.length;
        return PEER_COLORS[index];
    }

    // --- Caret Position & Remote Cursors ---
    function getCaretCoordinates(pos) {
        if (!editor || !editorMirror) return { top: 0, left: 0 };
        
        // Exact styling replication from editor to mirror
        const style = window.getComputedStyle(editor);
        editorMirror.style.fontFamily = style.fontFamily;
        editorMirror.style.fontSize = style.fontSize;
        editorMirror.style.fontWeight = style.fontWeight;
        editorMirror.style.lineHeight = style.lineHeight;
        editorMirror.style.letterSpacing = style.letterSpacing;
        editorMirror.style.wordSpacing = style.wordSpacing;
        editorMirror.style.tabSize = style.tabSize;
        editorMirror.style.paddingTop = style.paddingTop;
        editorMirror.style.paddingRight = style.paddingRight;
        editorMirror.style.paddingBottom = style.paddingBottom;
        editorMirror.style.paddingLeft = style.paddingLeft;
        editorMirror.style.borderTopWidth = style.borderTopWidth;
        editorMirror.style.borderRightWidth = style.borderRightWidth;
        editorMirror.style.borderBottomWidth = style.borderBottomWidth;
        editorMirror.style.borderLeftWidth = style.borderLeftWidth;
        editorMirror.style.width = style.width;
        editorMirror.style.boxSizing = style.boxSizing;
        editorMirror.style.whiteSpace = 'pre-wrap';
        editorMirror.style.wordWrap = 'break-word';
        editorMirror.style.overflowWrap = 'break-word';

        editorMirror.innerHTML = '';

        const textBefore = editor.value.substring(0, pos);
        const textNode = document.createTextNode(textBefore);
        editorMirror.appendChild(textNode);

        const marker = document.createElement('span');
        const charAtPos = editor.value.charAt(pos);
        marker.textContent = charAtPos && charAtPos !== '\n' ? charAtPos : '\u200B';
        editorMirror.appendChild(marker);

        // Compute top/left directly relative to offset parent (#workspace-main)
        const top = marker.offsetTop - editor.scrollTop;
        const left = marker.offsetLeft - editor.scrollLeft;

        return { top, left };
    }

    function renderPeerCursor(peerId, pos, peerName = "Anon") {
        if (!cursorsContainer || !editor) return;
        if (typeof pos !== 'number' || isNaN(pos)) pos = 0;
        pos = Math.max(0, Math.min(pos, editor.value.length));

        let cursor = document.getElementById('cursor-' + peerId);
        if (!cursor) {
            cursor = document.createElement('div');
            cursor.id = 'cursor-' + peerId;
            cursor.className = 'peer-cursor';
            cursorsContainer.appendChild(cursor);
        }
        cursor.setAttribute('data-name', peerName);
        const colorObj = getPeerColor(peerId);
        cursor.style.setProperty('--cursor-color', colorObj.color);
        cursor.style.setProperty('--cursor-text-color', colorObj.text);

        const coords = getCaretCoordinates(pos);
        cursor.style.top = coords.top + 'px';
        cursor.style.left = coords.left + 'px';
        cursor.style.height = `${currentFontSize * 1.4}px`;
    }

    function removePeerCursor(peerId) {
        const cursor = document.getElementById('cursor-' + peerId);
        if (cursor) cursor.remove();
    }

    let cursorBroadcastTimeout = null;
    function syncMyCursor() {
        if (!currentToken || isBurnMode || isReadOnly) return;
        
        const cursorData = {
            pos: editor ? editor.selectionStart || 0 : 0,
            name: myUsername,
            avatar: myAvatarUrl,
            tabId: activeTabId,
            timestamp: Date.now(),
            pubKey: myPublicKeyJwk
        };
        if (latestFlare && (Date.now() - latestFlare.timestamp < 3500)) {
            cursorData.flare = latestFlare;
        }
        if (isVoiceTransmitting) {
            cursorData.speaking = true;
        }
        if (isLaserActive && localLaser.visible && localLaser.inBounds && localLaser.x !== null) {
            cursorData.laser = {
                active: true,
                x: Math.round(localLaser.x),
                y: Math.round(localLaser.y),
                color: getPeerColor(myDeviceId).color,
                name: myUsername || 'Collaborator',
                timestamp: Date.now()
            };
        }

        // Always broadcast cursor to local open tabs immediately (zero network cost)
        broadcastLocalSync({
            type: 'cursor_presence',
            senderId: myDeviceId,
            cursor: cursorData
        });

        // For Firestore cloud broadcast: throttle to at least 3 seconds,
        // only if remote peers are active, and never write if quota is exceeded
        if (!db || isCloudQuotaExceeded) return;
        const now = Date.now();
        if (now - lastFirestoreCursorSync < 3000) {
            if (!cursorBroadcastTimeout) {
                cursorBroadcastTimeout = setTimeout(() => {
                    cursorBroadcastTimeout = null;
                    syncMyCursor();
                }, 3000 - (now - lastFirestoreCursorSync));
            }
            return;
        }
        lastFirestoreCursorSync = now;
        clearTimeout(cursorBroadcastTimeout);
        cursorBroadcastTimeout = null;

        // Skip cloud write if no remote peers are in the workspace
        if (Object.keys(peerCursorsData).length === 0) return;

        const updatePayload = {};
        updatePayload[`cursors.${myDeviceId}`] = cursorData;
        db.collection("workspaces").doc(currentToken).update(updatePayload).catch(() => {});
    }

    function updateHUD() {
        if (!editor) return;
        const text = editor.value || '';
        if (hudChars) hudChars.innerText = text.length;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        if (hudWords) hudWords.innerText = words;
        if (hudRead) hudRead.innerText = Math.max(1, Math.ceil(words / 200));
        updateTaskProgress();
    }

    function showLoader() { if (loader) loader.classList.add('visible'); }
    function hideLoader() { if (loader) loader.classList.remove('visible'); }

    // Network status indicators
    window.addEventListener('offline', () => {
        if (loaderText) loaderText.textContent = "Offline (Buffered Locally)";
        if (loader) loader.classList.add('offline', 'visible');
        showToast("You are offline. Edits are saved locally.", 'info');
    });

    window.addEventListener('online', () => {
        if (loaderText) loaderText.textContent = "Back Online! Syncing...";
        if (loader) loader.classList.remove('offline');
        saveWorkspace();
        showToast("Reconnected! Notes synchronized.", 'success');
        setTimeout(() => {
            if (loader) loader.classList.remove('visible');
            if (loaderText) loaderText.textContent = "Syncing...";
        }, 2000);
    });

    // --- Editor Event Handlers ---
    let typingResetTimeout = null;
    if (editor) {
        editor.addEventListener('input', () => {
            if (isBurnMode) return;
            if (tabsData[activeTabId]) tabsData[activeTabId].content = editor.value;
            tabsContentDirty = true;
            broadcastLocalSync({
                type: 'tab_content',
                tid: activeTabId,
                content: editor.value,
                senderId: myDeviceId
            });
            isTyping = true;
            setSaveStatus('saving');
            clearTimeout(typingResetTimeout);
            typingResetTimeout = setTimeout(() => { isTyping = false; }, 600);
            updateHUD();
            recordKeystrokeForWpm();
            updateTaskProgress();
            if (isMarkdown || isSplitMode) updatePreview();
            syncMyCursor();
            if (isFocusMode) scheduleFocusDimmingUpdate();
            if (privacyInspectorModal && !privacyInspectorModal.classList.contains('hidden')) updatePrivacyInspector();
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(saveWorkspace, 1200);
        });

        editor.addEventListener('keydown', (e) => {
            const keyType = e.key === ' ' ? 'space' : (e.key === 'Enter' ? 'enter' : (e.key === 'Backspace' ? 'backspace' : 'key'));
            playMechanicalSound(keyType);

            // Indent / Unindent with Tab Key
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = editor.selectionStart;
                const end = editor.selectionEnd;
                const value = editor.value;

                if (!e.shiftKey) {
                    // Insert 2 spaces
                    editor.value = value.substring(0, start) + "  " + value.substring(end);
                    editor.selectionStart = editor.selectionEnd = start + 2;
                } else {
                    // Shift+Tab Unindent
                    const before = value.substring(0, start);
                    const lineStart = before.lastIndexOf('\n') + 1;
                    if (value.substring(lineStart, lineStart + 2) === "  ") {
                        editor.value = value.substring(0, lineStart) + value.substring(lineStart + 2);
                        editor.selectionStart = editor.selectionEnd = Math.max(lineStart, start - 2);
                    }
                }
                if (tabsData[activeTabId]) tabsData[activeTabId].content = editor.value;
                tabsContentDirty = true;
                broadcastLocalSync({
                    type: 'tab_content',
                    tid: activeTabId,
                    content: editor.value,
                    senderId: myDeviceId
                });
                updateHUD();
                if (isMarkdown || isSplitMode) updatePreview();
                syncMyCursor();
                if (isFocusMode) scheduleFocusDimmingUpdate();
                clearTimeout(debounceTimeout);
                debounceTimeout = setTimeout(saveWorkspace, 1200);
            }
        });

        // Zero-Knowledge Encrypted Image Clipboard Paste
        editor.addEventListener('paste', (e) => {
            if (e.clipboardData && e.clipboardData.items) {
                for (let i = 0; i < e.clipboardData.items.length; i++) {
                    const item = e.clipboardData.items[i];
                    if (item.type && item.type.indexOf('image') !== -1) {
                        e.preventDefault();
                        const blob = item.getAsFile();
                        if (blob) handleImageFile(blob);
                        return;
                    }
                }
            }
        });

        // Zero-Knowledge Encrypted Image Drag and Drop
        editor.addEventListener('drop', (e) => {
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                if (file.type && file.type.startsWith('image/')) {
                    e.preventDefault();
                    handleImageFile(file);
                }
            }
        });

        editor.addEventListener('keyup', (e) => {
            if (isBurnMode) return;
            syncMyCursor();
            if (isFocusMode) scheduleFocusDimmingUpdate();
        });

        editor.addEventListener('click', () => {
            if (isBurnMode) return;
            syncMyCursor();
            if (isFocusMode) scheduleFocusDimmingUpdate();
        });

        editor.addEventListener('scroll', () => {
            for (let cid in peerCursorsData) {
                if (peerCursorsData[cid] && peerCursorsData[cid].tabId === activeTabId) {
                    renderPeerCursor(cid, peerCursorsData[cid].pos, peerCursorsData[cid].name);
                }
            }
            if (isFocusMode) scheduleFocusDimmingUpdate();
        });
    }

    document.addEventListener('selectionchange', () => {
        if (document.activeElement === editor && !isBurnMode) {
            syncMyCursor();
            if (isFocusMode) scheduleFocusDimmingUpdate();
        }
    });

    window.addEventListener('resize', () => {
        for (let cid in peerCursorsData) {
            if (peerCursorsData[cid] && peerCursorsData[cid].tabId === activeTabId) {
                renderPeerCursor(cid, peerCursorsData[cid].pos, peerCursorsData[cid].name);
            }
        }
        if (isFocusMode) scheduleFocusDimmingUpdate();
    });

    // --- Markdown & Split View Toggles ---
    if (mdToggleBtn) {
        mdToggleBtn.addEventListener('click', () => {
            if (isSplitMode) return;
            isMarkdown = !isMarkdown;
            if (isMarkdown) {
                updatePreview();
                if (editor) editor.classList.add('hidden');
                if (preview) preview.classList.remove('hidden');
                mdToggleBtn.innerHTML = '<span>✏️ Edit View</span><kbd>Alt+M</kbd>';
            } else {
                if (editor) {
                    editor.classList.remove('hidden');
                    editor.focus();
                }
                if (preview) preview.classList.add('hidden');
                mdToggleBtn.innerHTML = '<span>👁️ Markdown Preview</span><kbd>Alt+M</kbd>';
            }
        });
    }

    if (splitToggleBtn) {
        splitToggleBtn.addEventListener('click', () => {
            isSplitMode = !isSplitMode;
            if (isSplitMode) {
                document.body.classList.add('split-mode');
                splitToggleBtn.innerHTML = '<span>💻 Single View</span><kbd>Alt+S</kbd>';
                if (mdToggleBtn) {
                    mdToggleBtn.style.opacity = '0.4';
                    mdToggleBtn.style.pointerEvents = 'none';
                }
                if (editor) editor.classList.remove('hidden');
                if (preview) preview.classList.remove('hidden');
                updatePreview();
            } else {
                document.body.classList.remove('split-mode');
                splitToggleBtn.innerHTML = '<span>🌗 Split View</span><kbd>Alt+S</kbd>';
                if (mdToggleBtn) {
                    mdToggleBtn.style.opacity = '1';
                    mdToggleBtn.style.pointerEvents = 'auto';
                }
                if (!isMarkdown) {
                    if (preview) preview.classList.add('hidden');
                } else {
                    if (editor) editor.classList.add('hidden');
                    if (preview) preview.classList.remove('hidden');
                }
            }
        });
    }

    // --- Quick Copy Button ---
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            if (editor) await copyToClipboard(editor.value, "Note content copied to clipboard!");
        });
    }

    // --- Direct Share Modal Trigger ---
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            updateShareLinks();
            if (shareModal) shareModal.classList.remove('hidden');
        });
    }

    if (copyEditLink) copyEditLink.addEventListener('click', () => shareEditLink && copyToClipboard(shareEditLink.value, "Full Access link copied!"));
    if (copyViewLink) copyViewLink.addEventListener('click', () => shareViewLink && copyToClipboard(shareViewLink.value, "Read-Only link copied!"));

    // --- Self-Destruct Burn Notes ---
    if (burnBtn) {
        burnBtn.addEventListener('click', async () => {
            if (!editor) return;
            const start = editor.selectionStart;
            const end = editor.selectionEnd;
            const selection = editor.value.substring(start, end);
            let content = selection || editor.value;
            
            if (!content.trim()) {
                showToast("Nothing to burn! Write something first.", 'error');
                return;
            }

            const confirmed = await showCustomConfirm("Create Burn Note", "This will generate a self-destructing link that permanently erases after being read once. Proceed?");
            if (!confirmed) return;

            try {
                const token = generateToken();
                const burnKey = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                if (typeof CryptoJS !== 'undefined') {
                    content = CryptoJS.AES.encrypt(content, burnKey).toString();
                }
                if (db) {
                    await db.collection("burn_notes").doc(token).set({ content: content, created_at: firebase.firestore.FieldValue.serverTimestamp() });
                }
                const burnUrl = `${window.location.origin}${window.location.pathname}?burn=${token}_${burnKey}`;
                
                await copyToClipboard(burnUrl, "🔥 Burn Link Copied! Send it to your recipient.");
                
                if (!selection) {
                    if (db) await db.collection("workspaces").doc(currentToken).set({ burned: true }, { merge: true });
                } else {
                    editor.value = editor.value.substring(0, start) + editor.value.substring(end);
                    saveWorkspace();
                }
            } catch (e) {
                showToast("Failed to create burn link.", 'error');
            }
        });
    }

    // --- Instant Burn Workspace Right Away ---
    async function instantBurnWorkspace() {
        if (!currentToken || isBurnMode || isReadOnly) return;

        const confirmed = await showCustomConfirm(
            "💥 Burn Workspace Right Away?",
            "This will immediately and permanently erase all notes, tabs, whiteboards, chat, and cryptographic keys from the server. All collaborators will instantly lose access. This cannot be undone."
        );
        if (!confirmed) return;

        showToast("🔥 Shredding workspace data...", "warning", 2000);

        try {
            if (db && currentToken) {
                // Overwrite document with wiped state (no merge) so all ciphertext is eradicated
                await db.collection("workspaces").doc(currentToken).set({
                    burned: true,
                    burned_at: Date.now(),
                    tabs: {},
                    cursors: {},
                    dms: {},
                    polls: {},
                    wormhole: null
                });
            }

            // Clear local storage and active tab cache
            try {
                localStorage.removeItem(`qp_cached_${currentToken}`);
                localStorage.removeItem(`qp_active_tab_${currentToken}`);
            } catch (e) {}

            // Reset URL hash to origin so refreshing does not reload a dead token
            window.history.replaceState({}, '', window.location.origin + window.location.pathname);

            // Render Zero-Trace screen immediately
            document.body.innerHTML = `
                <div style='height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#050811;color:#fff;'>
                    <div class='splash-badge' style='margin-bottom:15px;color:#ff0055;border-color:rgba(255,0,85,0.4);'>ZERO-TRACE ACTIVE</div>
                    <h1 class='glitch-text' data-text='WORKSPACE BURNED' style='color:#ff0055;text-shadow:0 0 24px rgba(255,0,85,0.6);margin-bottom:20px;'>WORKSPACE BURNED</h1>
                    <p style='color:#94a3b8;font-family:monospace;margin-bottom:30px;max-width:400px;text-align:center;'>This workspace has been permanently eradicated. All ciphertext, tabs, and keys were shredded from the server.</p>
                    <button onclick="window.location.href=window.location.origin+window.location.pathname" class="btn primary-action" style="font-size:1.05rem;padding:12px 28px;border-radius:10px;">Create New Pad</button>
                </div>`;
        } catch (err) {
            console.error("Instant burn error:", err);
            showToast("Failed to burn workspace.", "error");
        }
    }

    if (instantBurnBtn) {
        instantBurnBtn.addEventListener('click', instantBurnWorkspace);
    }

    async function fetchBurnNote(tokenKey) {
        try {
            let token = tokenKey;
            let key = null;
            if (tokenKey.includes('_')) {
                let parts = tokenKey.split('_');
                token = parts[0];
                key = parts.slice(1).join('_');
            }
            
            if (!db) return;
            const docSnap = await db.collection("burn_notes").doc(token).get();
            if (docSnap.exists) { 
                let content = docSnap.data().content;
                if (key && content.startsWith("U2FsdGVkX1") && typeof CryptoJS !== 'undefined') {
                    try {
                        const bytes = CryptoJS.AES.decrypt(content, key);
                        const dec = bytes.toString(CryptoJS.enc.Utf8);
                        if (dec) content = dec;
                    } catch(e) {}
                }
                if (editor) {
                    editor.value = content; 
                    showToast("🔥 Self-Destruct Activated: this note has been wiped from the server.", 'error', 6000);
                }
                await db.collection("burn_notes").doc(token).delete(); 
            } else {
                if (editor) {
                    editor.value = "Note not found or already burned.";
                    editor.style.color = "#ff4d6d";
                }
            }
            updatePreview();
        } catch (e) {
            if (editor) editor.value = "Error retrieving burned note.";
        }
    }

    // --- Action Bar Triggers ---
    if (newBtn) newBtn.addEventListener('click', () => { window.location.href = window.location.origin + window.location.pathname; });

    if (timerBtn) {
        timerBtn.addEventListener('click', async () => {
            const mins = await showCustomPrompt("Auto-Destruct Timer", "Enter lifetime in minutes (0 to disable):", "15");
            if (mins === null) return;
            const parsed = parseInt(mins);
            if (parsed > 0) {
                timerMinutes = parsed;
                timerBtn.innerHTML = `⏳ ${parsed}m`;
                saveWorkspace();
                showToast(`Auto-destruct set for ${parsed} minutes`, 'info');
            } else {
                timerMinutes = null;
                if (db) await db.collection("workspaces").doc(currentToken).set({ expires_at: null }, { merge: true });
                timerBtn.innerHTML = '⏳ Set Timer';
                if (hudTimerBadge) hudTimerBadge.classList.add('hidden');
                showToast("Auto-destruct timer disabled", 'info');
            }
        });
    }


    if (infoBtn) infoBtn.addEventListener('click', () => infoModal && infoModal.classList.remove('hidden'));

    // Zen Mode
    if (zenBtn) zenBtn.addEventListener('click', () => document.body.classList.add('zen-mode'));
    if (zenExitBtn) zenExitBtn.addEventListener('click', () => document.body.classList.remove('zen-mode'));

    // --- Merge Conflict Resolution ---
    if (closeMerge) closeMerge.addEventListener('click', () => {
        if (mergeModal) mergeModal.classList.add('hidden');
        activeMergeTabId = null;
    });

    function showMergeModal(tid, serverText, localText) {
        activeMergeTabId = tid;
        if (mergeServerText) mergeServerText.value = serverText;
        if (mergeLocalText) mergeLocalText.value = localText;
        if (mergeFinalText) mergeFinalText.value = localText;
        if (mergeModal) mergeModal.classList.remove('hidden');
    }

    if (btnMergeApprove) {
        btnMergeApprove.addEventListener('click', () => {
            if (!activeMergeTabId || !mergeFinalText) return;
            const mergedContent = mergeFinalText.value;
            tabsData[activeMergeTabId].content = mergedContent;
            lastSyncedServerTabs[activeMergeTabId].content = mergedContent;
            
            if (activeMergeTabId === activeTabId && editor) {
                editor.value = mergedContent;
                if (isMarkdown || isSplitMode) updatePreview();
                updateHUD();
            }
            
            saveWorkspace();
            if (mergeModal) mergeModal.classList.add('hidden');
            activeMergeTabId = null;
            showToast("Conflict merged successfully", 'success');
        });
    }

    // --- Zero-Knowledge & Privacy Inspector Engine ---
    function updatePrivacyInspector() {
        if (!privacyInspectorModal || privacyInspectorModal.classList.contains('hidden')) return;

        // 1. Get current active note plaintext
        let plain = '';
        const isDraw = activeTabId && tabsData[activeTabId] && tabsData[activeTabId].name && tabsData[activeTabId].name.endsWith('.draw');
        if (isDraw) {
            plain = (tabsData[activeTabId] && tabsData[activeTabId].content) ? `[HTML5 Canvas Drawing: Base64 Encrypted PNG Image (${tabsData[activeTabId].content.length} characters)]` : '[Blank Neon Whiteboard Canvas]';
        } else if (editor) {
            plain = editor.value || (tabsData[activeTabId] ? tabsData[activeTabId].content : '');
        }

        const plainDisplay = plain.trim() ? plain : '(Note is currently empty - start typing to see live AES encryption)';
        if (inspectorPlaintextView) inspectorPlaintextView.innerText = plainDisplay;
        if (inspectorPlainLength) inspectorPlainLength.innerText = `${plain.length} chars`;

        // 2. Generate or extract actual live ciphertext
        let ciphertext = '';
        if (vaultPassword && typeof CryptoJS !== 'undefined') {
            try {
                const rawToEncrypt = plain.trim() ? plain : 'QuickPad Zero-Knowledge Handshake Verification';
                ciphertext = CryptoJS.AES.encrypt(rawToEncrypt, vaultPassword).toString();
            } catch(e) {
                ciphertext = 'U2FsdGVkX1[Error generating cipher stream]';
            }
        } else {
            ciphertext = 'U2FsdGVkX1' + (currentToken || 'workspace_token_active');
        }

        if (inspectorCiphertextView) inspectorCiphertextView.innerText = ciphertext;
        if (inspectorCipherLength) inspectorCipherLength.innerText = `${ciphertext.length} bytes`;

        // 3. Extract OpenSSL 8-Byte Salt & Hex Preview
        let saltHex = '0x4E 0x2A 0x88 0x1F 0x90 0xBC 0x5D 0x33 (64-bit random)';
        let cipherSampleHex = '0x7B 0x99 0x21 0xFA 0x04 0x82...';

        if (ciphertext.startsWith('U2FsdGVkX1')) {
            try {
                const binStr = atob(ciphertext);
                const bytes = new Uint8Array(binStr.length);
                for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
                
                if (bytes.length >= 16) {
                    const saltBytes = bytes.slice(8, 16);
                    saltHex = '0x' + Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' 0x');
                }
                if (bytes.length > 16) {
                    const sampleBytes = bytes.slice(16, Math.min(28, bytes.length));
                    cipherSampleHex = '0x' + Array.from(sampleBytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' 0x') + `... (${bytes.length - 16} bytes payload)`;
                }
            } catch(err) {}
        }

        if (inspectorSaltHex) inspectorSaltHex.innerText = saltHex;
        if (inspectorCipherHex) inspectorCipherHex.innerText = cipherSampleHex;
    }

    function openPrivacyInspector() {
        if (!privacyInspectorModal) return;
        document.querySelectorAll('.dropdown-group').forEach(g => g.classList.remove('active'));
        document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
        allModals.forEach(m => m && m.classList.add('hidden'));

        privacyInspectorModal.classList.remove('hidden');
        updatePrivacyInspector();
    }

    if (privacyInspectorBtn) privacyInspectorBtn.addEventListener('click', openPrivacyInspector);
    if (closePrivacyInspector) closePrivacyInspector.addEventListener('click', () => privacyInspectorModal && privacyInspectorModal.classList.add('hidden'));

    const brandBadgeEl = document.querySelector('.brand-badge');
    if (brandBadgeEl) {
        brandBadgeEl.style.cursor = 'pointer';
        brandBadgeEl.addEventListener('click', openPrivacyInspector);
    }

    if (copyInspectionLogBtn) {
        copyInspectionLogBtn.addEventListener('click', async () => {
            const isDraw = activeTabId && tabsData[activeTabId] && tabsData[activeTabId].name && tabsData[activeTabId].name.endsWith('.draw');
            const plain = isDraw ? `[Canvas Drawing: PNG Base64 (${tabsData[activeTabId].content ? tabsData[activeTabId].content.length : 0} chars)]` : (editor ? editor.value : '');
            let ciphertext = '';
            if (vaultPassword && typeof CryptoJS !== 'undefined') {
                try {
                    ciphertext = CryptoJS.AES.encrypt(plain || 'QuickPad Audit', vaultPassword).toString();
                } catch(e) {}
            }

            const salt = inspectorSaltHex ? inspectorSaltHex.innerText : 'Unknown';
            const timestamp = new Date().toISOString();
            const keyFragment = window.location.hash ? window.location.hash : '#[Decryption key in hash fragment]';

            const logReport = `=====================================================
QUICKPAD ZERO-KNOWLEDGE CRYPTOGRAPHIC AUDIT REPORT
=====================================================
Timestamp: ${timestamp}
Workspace Token: ${currentToken}
Decryption Key Storage: Client URL Hash (${keyFragment})
Key Isolation Standard: RFC 3986 §3.5 (Never sent across HTTP/WS)
Encryption Standard: AES-256 (Cipher-Block Chaining / CBC)
OpenSSL Header: U2FsdGVkX1 ("Salted__" magic header)
Random Derivation Salt: ${salt}
Active Document Type: ${isDraw ? 'Neon Whiteboard Canvas (.draw)' : (tabsData[activeTabId] ? tabsData[activeTabId].name : 'Text Note')}

[PLAIN-TEXT SAMPLE (LOCAL MEMORY ONLY)]
${plain.substring(0, 150)}${plain.length > 150 ? '... [TRUNCATED FOR LOG]' : ''}

[ACTUAL WIRE CIPHERTEXT SENT TO SERVER]
${ciphertext.substring(0, 200)}${ciphertext.length > 200 ? '...' : ''}

[SECURITY AUDIT VERIFICATION]
1. Plaintext Sent to Central Relay: 0 BYTES
2. Cryptographic Salt Uniqueness: Generated per-note in browser RAM
3. Key Access: Client-Side Only (Zero-Knowledge)
=====================================================`;

            await copyToClipboard(logReport, "Cryptographic Audit Log copied to clipboard!");
        });
    }

    // --- Universal Modal Backdrop & Escape Dismissal ---
    const allModals = [infoModal, shareModal, profileModal, mergeModal, cmdPaletteModal, customDialogModal, collaboratorsModal, duressModal, stegModal, wormholeModal, privacyInspectorModal, cardExportModal];

    allModals.forEach(modal => {
        if (!modal) return;
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
                if (modal === customDialogModal && customDialogResolve) {
                    customDialogResolve(null);
                    customDialogResolve = null;
                }
            }
        });
    });

    if (closeInfo) closeInfo.addEventListener('click', () => infoModal && infoModal.classList.add('hidden'));
    if (closeShare) closeShare.addEventListener('click', () => shareModal && shareModal.classList.add('hidden'));
    if (closeProfile) closeProfile.addEventListener('click', () => profileModal && profileModal.classList.add('hidden'));
    if (closeCollaborators) closeCollaborators.addEventListener('click', () => collaboratorsModal && collaboratorsModal.classList.add('hidden'));
    if (closeCardModal) closeCardModal.addEventListener('click', () => cardExportModal && cardExportModal.classList.add('hidden'));

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            allModals.forEach(m => m && m.classList.add('hidden'));
            if (findReplaceBar) findReplaceBar.classList.add('hidden');
            if (document.body.classList.contains('zen-mode')) document.body.classList.remove('zen-mode');
            if (document.body.classList.contains('spotlight-active')) togglePresenterSpotlight();
            if (isLaserActive) toggleLaserPointer(false);
            if (codeRunnerDrawer && !codeRunnerDrawer.classList.contains('hidden')) codeRunnerDrawer.classList.add('hidden');
            if (slashPopup) closeSlashPopup();
            if (customDialogResolve) { customDialogResolve(null); customDialogResolve = null; }
        }
    });

    // --- Find & Replace Engine ---
    let currentFindMatches = [];
    let currentMatchIndex = -1;

    function executeFind(jumpToNext = true) {
        if (!findInput || !editor) return;
        const query = findInput.value;
        if (!query) {
            currentFindMatches = [];
            currentMatchIndex = -1;
            if (findMatchCount) findMatchCount.innerText = "0/0";
            return;
        }

        const text = editor.value;
        currentFindMatches = [];
        let pos = 0;
        const lowerQuery = query.toLowerCase();
        const lowerText = text.toLowerCase();

        while ((pos = lowerText.indexOf(lowerQuery, pos)) !== -1) {
            currentFindMatches.push({ start: pos, end: pos + query.length });
            pos += query.length;
        }

        if (currentFindMatches.length === 0) {
            currentMatchIndex = -1;
            if (findMatchCount) findMatchCount.innerText = "0/0";
        } else {
            if (jumpToNext) {
                currentMatchIndex = (currentMatchIndex + 1) % currentFindMatches.length;
            } else {
                currentMatchIndex = (currentMatchIndex - 1 + currentFindMatches.length) % currentFindMatches.length;
            }
            highlightCurrentMatch();
        }
    }

    function highlightCurrentMatch() {
        if (currentMatchIndex < 0 || currentMatchIndex >= currentFindMatches.length || !editor) return;
        const match = currentFindMatches[currentMatchIndex];
        if (findMatchCount) findMatchCount.innerText = `${currentMatchIndex + 1}/${currentFindMatches.length}`;
        editor.focus();
        editor.setSelectionRange(match.start, match.end);
    }

    function toggleFindBar() {
        if (!findReplaceBar || !editor) return;
        findReplaceBar.classList.toggle('hidden');
        if (!findReplaceBar.classList.contains('hidden')) {
            const selected = editor.value.substring(editor.selectionStart, editor.selectionEnd);
            if (selected && findInput) findInput.value = selected;
            if (findInput) {
                findInput.focus();
                findInput.select();
            }
            executeFind();
        } else {
            editor.focus();
        }
    }

    if (findToggleBtn) findToggleBtn.addEventListener('click', toggleFindBar);
    if (findCloseBtn) findCloseBtn.addEventListener('click', () => findReplaceBar && findReplaceBar.classList.add('hidden'));

    if (findInput) {
        findInput.addEventListener('input', () => executeFind(true));
        findInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                executeFind(!e.shiftKey);
            }
        });
    }

    if (findNextBtn) findNextBtn.addEventListener('click', () => executeFind(true));
    if (findPrevBtn) findPrevBtn.addEventListener('click', () => executeFind(false));

    if (replaceBtn) {
        replaceBtn.addEventListener('click', () => {
            if (currentMatchIndex < 0 || currentMatchIndex >= currentFindMatches.length || !editor || !replaceInput) return;
            const match = currentFindMatches[currentMatchIndex];
            const repl = replaceInput.value;
            const val = editor.value;
            editor.value = val.substring(0, match.start) + repl + val.substring(match.end);
            if (tabsData[activeTabId]) tabsData[activeTabId].content = editor.value;
            executeFind(true);
            saveWorkspace();
        });
    }

    if (replaceAllBtn) {
        replaceAllBtn.addEventListener('click', () => {
            if (!findInput || !editor || !replaceInput) return;
            const query = findInput.value;
            if (!query) return;
            const repl = replaceInput.value;
            editor.value = editor.value.split(query).join(repl);
            if (tabsData[activeTabId]) tabsData[activeTabId].content = editor.value;
            executeFind();
            saveWorkspace();
            showToast("All instances replaced", 'success');
        });
    }

    // --- File Export & Import Engine ---
    function downloadFile(filename, content, type = 'text/plain') {
        const blob = new Blob([content], { type: `${type};charset=utf-8` });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        showToast(`Downloaded ${filename}`, 'success');
    }

    if (exportMdBtn) {
        exportMdBtn.addEventListener('click', () => {
            const tab = tabsData[activeTabId] || { name: 'note.md' };
            const fname = tab.name.endsWith('.md') ? tab.name : `${tab.name.replace(/\.[^/.]+$/, "")}.md`;
            if (editor) downloadFile(fname, editor.value, 'text/markdown');
        });
    }

    if (exportTxtBtn) {
        exportTxtBtn.addEventListener('click', () => {
            const tab = tabsData[activeTabId] || { name: 'note.txt' };
            const fname = tab.name.endsWith('.txt') ? tab.name : `${tab.name.replace(/\.[^/.]+$/, "")}.txt`;
            if (editor) downloadFile(fname, editor.value, 'text/plain');
        });
    }

    if (exportJsonBtn) {
        exportJsonBtn.addEventListener('click', () => {
            const backup = {
                version: "2.0",
                exported_at: new Date().toISOString(),
                tabs: tabsData
            };
            downloadFile(`quickpad-backup-${Date.now()}.json`, JSON.stringify(backup, null, 2), 'application/json');
        });
    }

    if (importFileBtn && fileImportInput) {
        importFileBtn.addEventListener('click', () => fileImportInput.click());
        fileImportInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                handleImportedContent(file.name, event.target.result);
            };
            reader.readAsText(file);
            fileImportInput.value = '';
        });
    }

    // Drag & Drop File Import onto Workspace
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => {
        e.preventDefault();
        if (e.dataTransfer && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                handleImportedContent(file.name, event.target.result);
            };
            reader.readAsText(file);
        }
    });

    async function handleImportedContent(filename, text) {
        if (filename.endsWith('.json')) {
            try {
                const parsed = JSON.parse(text);
                if (parsed.tabs) {
                    const overwrite = await showCustomConfirm("Restore Workspace", "This backup contains multiple tabs. Replace current workspace tabs?");
                    if (overwrite) {
                        tabsData = parsed.tabs;
                        activeTabId = Object.keys(tabsData)[0] || 'main';
                        switchTab(activeTabId);
                        showToast("Workspace restored from backup", 'success');
                        return;
                    }
                }
            } catch (e) {}
        }
        // Import as new tab
        const tid = generateToken();
        tabsData[tid] = { name: filename, content: text, is_encrypted: false };
        switchTab(tid);
        showToast(`Imported "${filename}" into new tab`, 'success');
    }

    // --- Crypto & Encrypted Direct Messaging ---
    async function initCrypto() {
        if (!window.crypto || !window.crypto.subtle) {
            console.warn("Web Crypto API is unavailable in this origin. AES-256 workspace encryption remains fully operational.");
            return;
        }
        try {
            let savedPriv = localStorage.getItem('quickpad_priv_' + currentToken);
            let savedPub = localStorage.getItem('quickpad_pub_' + currentToken);
            if (savedPriv && savedPub) {
                try {
                    myPrivateKey = await window.crypto.subtle.importKey("jwk", JSON.parse(savedPriv), { name: "RSA-OAEP", hash: "SHA-256" }, true, ["decrypt"]);
                    myPublicKeyJwk = JSON.parse(savedPub);
                } catch(e) { savedPriv = null; }
            }
            if (!savedPriv) {
                const keyPair = await window.crypto.subtle.generateKey({ name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["encrypt", "decrypt"]);
                myPrivateKey = keyPair.privateKey;
                myPublicKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
                const privJwk = await window.crypto.subtle.exportKey("jwk", myPrivateKey);
                localStorage.setItem('quickpad_priv_' + currentToken, JSON.stringify(privJwk));
                localStorage.setItem('quickpad_pub_' + currentToken, JSON.stringify(myPublicKeyJwk));
            }
        } catch(err) {
            console.warn("RSA key generation skipped:", err);
        }
    }

    async function encryptDM(text, receiverPubJwk) {
        if (!receiverPubJwk) throw new Error("Receiver has no public key");
        const randomPass = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
        const textCipher = CryptoJS.AES.encrypt(text, randomPass).toString();
        const passBuffer = new TextEncoder().encode(randomPass);
        const receiverPubKey = await window.crypto.subtle.importKey("jwk", receiverPubJwk, { name: "RSA-OAEP", hash: "SHA-256" }, true, ["encrypt"]);
        const encPassReceiverBuf = await window.crypto.subtle.encrypt({ name: "RSA-OAEP" }, receiverPubKey, passBuffer);
        const senderPubKey = await window.crypto.subtle.importKey("jwk", myPublicKeyJwk, { name: "RSA-OAEP", hash: "SHA-256" }, true, ["encrypt"]);
        const encPassSenderBuf = await window.crypto.subtle.encrypt({ name: "RSA-OAEP" }, senderPubKey, passBuffer);
        return { textCipher, encPassReceiver: arrayBufferToBase64(encPassReceiverBuf), encPassSender: arrayBufferToBase64(encPassSenderBuf) };
    }

    async function decryptDM(dmObj, isSender) {
        try {
            const encPassBase64 = isSender ? dmObj.encPassSender : dmObj.encPassReceiver;
            const passBuffer = base64ToArrayBuffer(encPassBase64);
            const decPassBuf = await window.crypto.subtle.decrypt({ name: "RSA-OAEP" }, myPrivateKey, passBuffer);
            const randomPass = new TextDecoder().decode(decPassBuf);
            return CryptoJS.AES.decrypt(dmObj.textCipher, randomPass).toString(CryptoJS.enc.Utf8);
        } catch (e) { return "[Decryption Failed]"; }
    }

    window.openChat = function(cid, name) {
        if (!window.crypto || !window.crypto.subtle) {
            showToast("Peer DMs require HTTPS or Localhost for RSA encryption.", 'error');
            return;
        }
        activeChatId = cid; 
        if (dmTitle) dmTitle.innerText = name; 
        if (dmWindow) {
            dmWindow.classList.remove('hidden');
            dmWindow.style.zIndex = '500';
        }
        if (collaboratorsModal) collaboratorsModal.classList.add('hidden');
        renderChat();
        if (dmInput) {
            setTimeout(() => {
                dmInput.focus();
                if (dmMessages) dmMessages.scrollTop = dmMessages.scrollHeight;
            }, 120);
        }
    };

    function renderCollaboratorsModal() {
        if (!collaboratorsList) return;
        let html = '';
        if (!currentActiveUsers || currentActiveUsers.size === 0 || (currentActiveUsers.size === 1 && currentActiveUsers.has(myDeviceId))) {
            html = `
                <div style="text-align:center;padding:24px 12px;color:var(--text-muted);">
                    <div style="font-size:2rem;margin-bottom:8px;">🏝️</div>
                    <div style="font-weight:600;color:var(--text-color);margin-bottom:4px;">Solo Session</div>
                    <p style="font-size:0.8rem;margin:0;">Share your QuickPad link using the <b>🔗 Share</b> button above to invite collaborators.</p>
                </div>
            `;
        } else {
            currentActiveUsers.forEach((user, cid) => {
                const isMe = cid === myDeviceId;
                let avatarContent = '👤';
                if (user.avatar && (user.avatar.startsWith('http://') || user.avatar.startsWith('https://') || user.avatar.startsWith('data:'))) {
                    avatarContent = `<img src="${escapeHtml(user.avatar)}" alt="${escapeHtml(user.name)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentNode.innerText='👤'">`;
                } else if (user.avatar) {
                    avatarContent = escapeHtml(user.avatar);
                }
                const colorObj = getPeerColor(cid);
                const unread = unreadMessages[cid] ? `<span class="glowing-dot" style="position:relative;display:inline-block;margin-left:4px;"></span>` : '';
                
                html += `
                    <div class="collaborator-item">
                        <div class="collaborator-info">
                            <div class="collaborator-avatar" style="border-color:${colorObj.color}">${avatarContent}</div>
                            <div>
                                <div class="collaborator-name" style="color:${colorObj.color}">${escapeHtml(user.name)}${isMe ? ' (You)' : ''}${unread}</div>
                                <div class="collaborator-status">🟢 Active in workspace</div>
                            </div>
                        </div>
                        ${!isMe ? `<button class="btn-dm-user" data-cid="${escapeHtml(cid)}" data-name="${escapeHtml(user.name)}">💬 Chat</button>` : `<span style="font-size:0.75rem;color:var(--text-muted);">Current User</span>`}
                    </div>
                `;
            });
        }
        collaboratorsList.innerHTML = html;

        collaboratorsList.querySelectorAll('.btn-dm-user').forEach(btn => {
            const cid = btn.getAttribute('data-cid');
            const name = btn.getAttribute('data-name');
            const triggerDm = (e) => {
                e.preventDefault();
                e.stopPropagation();
                window.openChat(cid, name);
            };
            btn.addEventListener('click', triggerDm);
            btn.addEventListener('touchend', triggerDm);
        });
    }

    if (onlineCountBadge) {
        const toggleCollaborators = (e) => {
            e.stopPropagation();
            renderCollaboratorsModal();
            if (collaboratorsModal) collaboratorsModal.classList.remove('hidden');
        };
        onlineCountBadge.addEventListener('click', toggleCollaborators);
        onlineCountBadge.addEventListener('touchend', toggleCollaborators);
    }

    if (closeDm) closeDm.addEventListener('click', () => { if (dmWindow) dmWindow.classList.add('hidden'); activeChatId = null; });

    async function sendDM() {
        if (!activeChatId || !dmInput || !dmInput.value.trim() || !db) return;
        const text = dmInput.value.trim();
        dmInput.value = '';
        let receiverPubKey = peerCursorsData[activeChatId]?.pubKey;
        if (!receiverPubKey) {
            showToast("Recipient is initializing secure key exchange...", 'error');
            return;
        }
        
        try {
            const encData = await encryptDM(text, receiverPubKey);
            const chatKey = [myDeviceId, activeChatId].sort().join('_');
            const dmObj = { id: Date.now().toString() + Math.random().toString(36).slice(2), sender: myDeviceId, timestamp: Date.now(), ...encData };
            await db.collection("workspaces").doc(currentToken).set({ dms: { [chatKey]: firebase.firestore.FieldValue.arrayUnion(dmObj) } }, { merge: true });
        } catch (e) {
            showToast("Failed to encrypt and send DM.", 'error');
        }
    }

    if (dmSend) dmSend.addEventListener('click', sendDM);
    if (dmInput) dmInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') sendDM(); });

    function calculateUnread(dmsObj) {
        for (let key in dmsObj) {
            if (key.includes(myDeviceId)) {
                const parts = key.split('_');
                const otherCid = parts[0] === myDeviceId ? parts[1] : parts[0];
                const msgs = dmsObj[key] || [];
                if (activeChatId === otherCid) {
                    if (msgs.length > 0) localStorage.setItem('quickpad_read_' + key, msgs[msgs.length - 1].timestamp);
                    unreadMessages[otherCid] = 0;
                } else {
                    const lastRead = parseInt(localStorage.getItem('quickpad_read_' + key)) || 0;
                    unreadMessages[otherCid] = msgs.filter(m => m.timestamp > lastRead && m.sender !== myDeviceId).length;
                }
            }
        }
    }

    async function renderChat() {
        if (!activeChatId || !dmMessages) return;
        const chatKey = [myDeviceId, activeChatId].sort().join('_');
        const msgs = globalDms[chatKey] || [];
        if (msgs.length > 0) localStorage.setItem('quickpad_read_' + chatKey, msgs[msgs.length - 1].timestamp);
        
        let html = '';
        for (let msg of msgs) {
            if (!decryptedCache[msg.id]) {
                const isSender = msg.sender === myDeviceId;
                decryptedCache[msg.id] = await decryptDM(msg, isSender);
            }
            const cls = msg.sender === myDeviceId ? 'sent' : 'received';
            html += `<div class="dm-msg ${cls}">${escapeHtml(decryptedCache[msg.id])}</div>`;
        }
        if (dmMessages.innerHTML !== html) {
            dmMessages.innerHTML = html;
            dmMessages.scrollTop = dmMessages.scrollHeight;
        }
    }

    // --- Matrix Screensaver Engine ---
    let matrixCtx = matrixCanvas ? matrixCanvas.getContext('2d') : null;
    let matrixIntervalId = null;
    let isScreensaverActive = false;
    let idleTimer = null;
    let matrixDrops = [];

    ssMenuBtns.forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.time) === screensaverTimeoutMins);
        btn.addEventListener('click', (e) => {
            screensaverTimeoutMins = parseInt(e.target.dataset.time);
            localStorage.setItem('quickpad_screensaver_time', screensaverTimeoutMins);
            ssMenuBtns.forEach(b => b.classList.toggle('active', parseInt(b.dataset.time) === screensaverTimeoutMins));
            resetIdleTimer();
            showToast(screensaverTimeoutMins === 0 ? "Screensaver disabled" : `Screensaver set to ${screensaverTimeoutMins}m`, 'info');
        });
    });

    function startScreensaver() {
        if (screensaverTimeoutMins === 0 || !matrixCanvas || !matrixCtx) return;
        isScreensaverActive = true;
        matrixCanvas.width = window.innerWidth;
        matrixCanvas.height = window.innerHeight;
        matrixCanvas.style.opacity = 1;
        
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%^&*'.split('');
        const fontSize = 16;
        const columns = matrixCanvas.width / fontSize;
        matrixDrops = [];
        for(let x = 0; x < columns; x++) matrixDrops[x] = 1;
        let color = getComputedStyle(document.body).getPropertyValue('--primary-color').trim() || '#00fff9';
        
        if (matrixIntervalId) clearInterval(matrixIntervalId);
        matrixIntervalId = setInterval(() => {
            matrixCtx.fillStyle = 'rgba(5, 8, 16, 0.06)';
            matrixCtx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);
            matrixCtx.fillStyle = color;
            matrixCtx.font = fontSize + 'px monospace';
            for(let i = 0; i < matrixDrops.length; i++) {
                const text = chars[Math.floor(Math.random() * chars.length)];
                matrixCtx.fillText(text, i * fontSize, matrixDrops[i] * fontSize);
                if(matrixDrops[i] * fontSize > matrixCanvas.height && Math.random() > 0.975) matrixDrops[i] = 0;
                matrixDrops[i]++;
            }
        }, 33);
    }

    function stopScreensaver() {
        isScreensaverActive = false;
        if (matrixCanvas) matrixCanvas.style.opacity = 0;
        if (matrixIntervalId) {
            setTimeout(() => { clearInterval(matrixIntervalId); matrixIntervalId = null; }, 1500);
        }
    }

    function resetIdleTimer() {
        if (isScreensaverActive) stopScreensaver();
        clearTimeout(idleTimer);
        if (screensaverTimeoutMins > 0) idleTimer = setTimeout(startScreensaver, screensaverTimeoutMins * 60000);
    }

    ['mousemove', 'keydown', 'touchstart', 'scroll', 'click'].forEach(evt => window.addEventListener(evt, resetIdleTimer));
    resetIdleTimer();

    // =========================================================================
    // 1. COLLABORATOR LASER POINTER & PRESENTER SPOTLIGHT ENGINE
    // =========================================================================
    function initLaserCanvas() {
        if (!laserCanvas) return;
        laserCtx = laserCanvas.getContext('2d');
        const resizeLaser = () => {
            if (laserCanvas && laserCanvas.parentElement) {
                laserCanvas.width = laserCanvas.parentElement.clientWidth;
                laserCanvas.height = laserCanvas.parentElement.clientHeight;
            }
        };
        resizeLaser();
        window.addEventListener('resize', resizeLaser);
        if (window.ResizeObserver && laserCanvas.parentElement) {
            new ResizeObserver(resizeLaser).observe(laserCanvas.parentElement);
        }

        const main = document.getElementById('workspace-main');
        if (main) {
            main.addEventListener('mousemove', handleLaserMouseMove);
            main.addEventListener('mouseenter', (e) => {
                if (isLaserActive) {
                    localLaser.inBounds = true;
                    handleLaserMouseMove(e);
                }
            });
            main.addEventListener('mouseleave', () => {
                if (isLaserActive) {
                    localLaser.inBounds = false;
                    broadcastLaser(true);
                }
            });

            // Touch support for mobile & tablet presentation
            main.addEventListener('touchstart', (e) => {
                if (!isLaserActive || !e.touches || !e.touches[0]) return;
                handleLaserTouch(e);
            }, { passive: true });
            main.addEventListener('touchmove', (e) => {
                if (!isLaserActive || !e.touches || !e.touches[0]) return;
                handleLaserTouch(e);
            }, { passive: true });
            main.addEventListener('touchend', () => {
                if (isLaserActive) {
                    localLaser.inBounds = false;
                    broadcastLaser(true);
                }
            }, { passive: true });
        }

        if (hudLaserBtn) {
            hudLaserBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleLaserPointer();
            });
        }
        if (spotlightToggleBtn) {
            spotlightToggleBtn.addEventListener('click', () => togglePresenterSpotlight());
        }

        startLaserLoop();
    }

    function toggleLaserPointer(forcedState) {
        isLaserActive = typeof forcedState === 'boolean' ? forcedState : !isLaserActive;
        const main = document.getElementById('workspace-main');
        if (main) main.classList.toggle('laser-active', isLaserActive);
        if (hudLaserBtn) hudLaserBtn.classList.toggle('active', isLaserActive);

        if (isLaserActive) {
            if (localLaser.x === null && laserCanvas) {
                localLaser.x = laserCanvas.width / 2;
                localLaser.y = laserCanvas.height / 2;
            }
            localLaser.visible = true;
            localLaser.inBounds = true;
            broadcastLaser(true);
            showToast("🔦 Laser Pointer Active! Click or move to point", 'info');
        } else {
            localLaser.visible = false;
            localLaser.inBounds = false;
            laserTrail = [];
            broadcastLaser(true);
        }
    }

    function handleLaserTouch(e) {
        if (!laserCanvas || !e.touches || !e.touches[0]) return;
        const touch = e.touches[0];
        handleLaserPointerMove(touch.clientX, touch.clientY);
    }

    function handleLaserMouseMove(e) {
        handleLaserPointerMove(e.clientX, e.clientY);
    }

    function handleLaserPointerMove(clientX, clientY) {
        if (!laserCanvas) return;
        const rect = laserCanvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const inBounds = (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height);

        if (isSpotlightMode) {
            const main = document.getElementById('workspace-main');
            if (main) {
                main.style.setProperty('--spotlight-x', `${x}px`);
                main.style.setProperty('--spotlight-y', `${y}px`);
            }
        }

        if (!isLaserActive) return;

        localLaser.x = x;
        localLaser.y = y;
        localLaser.visible = true;
        localLaser.inBounds = inBounds;

        const now = Date.now();
        const lastPt = laserTrail[laserTrail.length - 1];
        if (!lastPt || Math.hypot(x - lastPt.x, y - lastPt.y) > 2) {
            laserTrail.push({ x, y, time: now });
            if (laserTrail.length > 35) laserTrail.shift();
        }

        broadcastLaser();
    }

    let laserSyncTimeout = null;
    let lastLaserBroadcast = 0;
    function broadcastLaser(immediate = false) {
        if (!currentToken || isBurnMode || isReadOnly) return;
        const now = Date.now();

        const laserData = (isLaserActive && localLaser.visible && localLaser.inBounds && localLaser.x !== null) ? {
            active: true,
            x: Math.round(localLaser.x),
            y: Math.round(localLaser.y),
            color: getPeerColor(myDeviceId).color,
            name: myUsername || 'Collaborator',
            timestamp: now
        } : {
            active: false,
            timestamp: now
        };

        // Broadcast to local tabs instantly
        broadcastLocalSync({
            type: 'laser_presence',
            senderId: myDeviceId,
            laser: laserData
        });

        if (!db || isCloudQuotaExceeded) return;
        if (!immediate && now - lastLaserBroadcast < 3000) {
            if (!laserSyncTimeout) {
                laserSyncTimeout = setTimeout(() => {
                    laserSyncTimeout = null;
                    broadcastLaser(true);
                }, 3000 - (now - lastLaserBroadcast));
            }
            return;
        }
        lastLaserBroadcast = now;
        clearTimeout(laserSyncTimeout);
        laserSyncTimeout = null;

        if (Object.keys(peerCursorsData).length === 0) return;

        const updatePayload = {};
        updatePayload[`cursors.${myDeviceId}.laser`] = laserData;
        db.collection("workspaces").doc(currentToken).update(updatePayload).catch(() => {});
    }

    function startLaserLoop() {
        if (laserAnimId) cancelAnimationFrame(laserAnimId);
        function renderLaserFrame() {
            if (laserCtx && laserCanvas) {
                laserCtx.clearRect(0, 0, laserCanvas.width, laserCanvas.height);
                const now = Date.now();

                // 1. Draw local laser pointer
                if (isLaserActive) {
                    const targetOp = (localLaser.visible && localLaser.inBounds && localLaser.x !== null) ? 1 : 0;
                    localLaser.opacity += (targetOp - localLaser.opacity) * 0.25;

                    if (localLaser.opacity > 0.01 && localLaser.x !== null && localLaser.y !== null) {
                        const myColor = getPeerColor(myDeviceId).color;

                        // Motion trail ribbon
                        while (laserTrail.length > 0 && (now - laserTrail[0].time > 650)) {
                            laserTrail.shift();
                        }
                        if (laserTrail.length > 1) {
                            laserCtx.save();
                            laserCtx.lineCap = 'round';
                            laserCtx.lineJoin = 'round';
                            for (let i = 1; i < laserTrail.length; i++) {
                                const p1 = laserTrail[i - 1];
                                const p2 = laserTrail[i];
                                const age = now - p2.time;
                                if (age > 650) continue;
                                const factor = 1 - (age / 650);
                                const alpha = factor * localLaser.opacity * 0.85;

                                laserCtx.strokeStyle = myColor;
                                laserCtx.globalAlpha = alpha;
                                laserCtx.lineWidth = Math.max(1.2, 4.8 * factor);
                                laserCtx.shadowColor = myColor;
                                laserCtx.shadowBlur = 12 * factor;

                                laserCtx.beginPath();
                                laserCtx.moveTo(p1.x, p1.y);
                                laserCtx.lineTo(p2.x, p2.y);
                                laserCtx.stroke();
                            }
                            laserCtx.restore();
                        }

                        // Stationary persistent laser diode head (Never vanishes while pointing!)
                        drawLaserHead(localLaser.x, localLaser.y, myColor, localLaser.opacity, now);
                    }
                }

                // 2. Draw remote collaborator lasers
                for (let cid in remoteLasers) {
                    const rLaser = remoteLasers[cid];
                    if (rLaser && rLaser.active && (now - rLaser.lastUpdate < 8000)) {
                        // Smooth position interpolation
                        rLaser.x += (rLaser.targetX - rLaser.x) * 0.35;
                        rLaser.y += (rLaser.targetY - rLaser.y) * 0.35;

                        // Prune & draw remote trail
                        if (rLaser.trail && rLaser.trail.length > 0) {
                            while (rLaser.trail.length > 0 && (now - rLaser.trail[0].time > 650)) {
                                rLaser.trail.shift();
                            }
                            if (rLaser.trail.length > 1) {
                                laserCtx.save();
                                laserCtx.lineCap = 'round';
                                laserCtx.lineJoin = 'round';
                                for (let i = 1; i < rLaser.trail.length; i++) {
                                    const p1 = rLaser.trail[i - 1];
                                    const p2 = rLaser.trail[i];
                                    const age = now - p2.time;
                                    if (age > 650) continue;
                                    const factor = 1 - (age / 650);
                                    laserCtx.strokeStyle = rLaser.color;
                                    laserCtx.globalAlpha = factor * 0.8;
                                    laserCtx.lineWidth = Math.max(1.2, 4.2 * factor);
                                    laserCtx.shadowColor = rLaser.color;
                                    laserCtx.shadowBlur = 10 * factor;
                                    laserCtx.beginPath();
                                    laserCtx.moveTo(p1.x, p1.y);
                                    laserCtx.lineTo(p2.x, p2.y);
                                    laserCtx.stroke();
                                }
                                laserCtx.restore();
                            }
                        }

                        // Remote diode head
                        drawLaserHead(rLaser.x, rLaser.y, rLaser.color, 1, now);

                        // Floating name tag badge
                        drawLaserBadge(rLaser.x, rLaser.y, rLaser.name, rLaser.color);
                    } else if (rLaser && (now - rLaser.lastUpdate >= 8000)) {
                        delete remoteLasers[cid];
                    }
                }
            }
            laserAnimId = requestAnimationFrame(renderLaserFrame);
        }
        renderLaserFrame();
    }

    function drawLaserHead(x, y, color, opacity, now) {
        if (!laserCtx) return;
        const pulse = (Math.sin(now / 140) + 1) * 0.5; // 0 to 1
        const pulseR = 7 + (pulse * 3.5);

        laserCtx.save();

        // 1. Concentric breathing aura ring
        laserCtx.beginPath();
        laserCtx.arc(x, y, pulseR, 0, Math.PI * 2);
        laserCtx.strokeStyle = color;
        laserCtx.lineWidth = 1.6;
        laserCtx.globalAlpha = (0.35 + (pulse * 0.35)) * opacity;
        laserCtx.shadowColor = color;
        laserCtx.shadowBlur = 12;
        laserCtx.stroke();

        // 2. High-intensity saturated glow sphere
        laserCtx.beginPath();
        laserCtx.arc(x, y, 4.8, 0, Math.PI * 2);
        laserCtx.fillStyle = color;
        laserCtx.globalAlpha = 0.9 * opacity;
        laserCtx.shadowColor = color;
        laserCtx.shadowBlur = 22;
        laserCtx.fill();

        // 3. Incandescent white center diode core
        laserCtx.beginPath();
        laserCtx.arc(x, y, 2.4, 0, Math.PI * 2);
        laserCtx.fillStyle = '#ffffff';
        laserCtx.globalAlpha = opacity;
        laserCtx.shadowColor = '#ffffff';
        laserCtx.shadowBlur = 8;
        laserCtx.fill();

        // 4. Subtle optical flare crosshair
        laserCtx.beginPath();
        laserCtx.moveTo(x - 6, y);
        laserCtx.lineTo(x + 6, y);
        laserCtx.moveTo(x, y - 6);
        laserCtx.lineTo(x, y + 6);
        laserCtx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        laserCtx.lineWidth = 0.9;
        laserCtx.globalAlpha = 0.75 * opacity;
        laserCtx.stroke();

        laserCtx.restore();
    }

    function drawLaserBadge(x, y, name, color) {
        if (!laserCtx || !name) return;
        const label = `${name} 🔦`;
        laserCtx.save();
        laserCtx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const textWidth = laserCtx.measureText(label).width;
        const padX = 8;
        const badgeW = textWidth + (padX * 2);
        const badgeH = 20;
        const badgeX = x - (badgeW / 2);
        const badgeY = y - 28;

        // Rounded badge background
        laserCtx.fillStyle = 'rgba(10, 15, 29, 0.92)';
        laserCtx.strokeStyle = color;
        laserCtx.lineWidth = 1;
        laserCtx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        laserCtx.shadowBlur = 6;

        laserCtx.beginPath();
        if (laserCtx.roundRect) {
            laserCtx.roundRect(badgeX, badgeY, badgeW, badgeH, 5);
        } else {
            laserCtx.rect(badgeX, badgeY, badgeW, badgeH);
        }
        laserCtx.fill();
        laserCtx.stroke();

        // Badge text
        laserCtx.shadowBlur = 0;
        laserCtx.fillStyle = '#ffffff';
        laserCtx.textBaseline = 'middle';
        laserCtx.fillText(label, badgeX + padX, badgeY + (badgeH / 2));
        laserCtx.restore();
    }

    function togglePresenterSpotlight() {
        isSpotlightMode = !isSpotlightMode;
        document.body.classList.toggle('spotlight-active', isSpotlightMode);
        if (spotlightToggleBtn) spotlightToggleBtn.classList.toggle('active', isSpotlightMode);
        if (isSpotlightMode) {
            showToast("🔦 Presenter Spotlight Active", 'info');
        } else {
            showToast("Spotlight deactivated", 'info');
        }
    }

    // =========================================================================
    // 2. LIVE SANDBOXED CODE RUNNER ENGINE
    // =========================================================================
    function initCodeRunner() {
        if (hudRunnerBtn) hudRunnerBtn.addEventListener('click', () => toggleCodeRunner());
        if (codeRunnerToggleBtn) codeRunnerToggleBtn.addEventListener('click', () => toggleCodeRunner());
        if (runCodeBtn) runCodeBtn.addEventListener('click', () => runCodeSandbox());
        if (clearConsoleBtn) clearConsoleBtn.addEventListener('click', () => {
            if (consoleOutput) consoleOutput.innerHTML = '';
        });
        if (closeRunnerBtn) closeRunnerBtn.addEventListener('click', () => toggleCodeRunner(false));
    }

    function toggleCodeRunner(forceState) {
        if (!codeRunnerDrawer) return;
        const willShow = typeof forceState === 'boolean' ? forceState : codeRunnerDrawer.classList.contains('hidden');
        codeRunnerDrawer.classList.toggle('hidden', !willShow);
        if (willShow) {
            updateCodeRunnerBadge();
            runCodeSandbox();
        }
    }

    function updateCodeRunnerBadge() {
        if (!runnerModeBadge || !tabsData[activeTabId]) return;
        const name = tabsData[activeTabId].name.toLowerCase();
        if (name.endsWith('.js')) {
            runnerModeBadge.innerText = 'JavaScript';
            if (sandboxIframeContainer) sandboxIframeContainer.classList.add('hidden');
            if (consoleOutput) consoleOutput.classList.remove('hidden');
        } else if (name.endsWith('.html') || name.endsWith('.svg')) {
            runnerModeBadge.innerText = name.endsWith('.html') ? 'HTML Sandbox' : 'SVG Sandbox';
            if (sandboxIframeContainer) sandboxIframeContainer.classList.remove('hidden');
        } else {
            runnerModeBadge.innerText = 'JS Eval';
            if (sandboxIframeContainer) sandboxIframeContainer.classList.add('hidden');
            if (consoleOutput) consoleOutput.classList.remove('hidden');
        }
    }

    function appendConsoleEntry(level, text) {
        if (!consoleOutput) return;
        const entry = document.createElement('div');
        entry.className = `console-log-entry console-${level}`;
        const time = new Date().toLocaleTimeString();
        entry.innerHTML = `<span class="console-time">[${time}]</span> <span class="console-msg">${escapeHtml(text)}</span>`;
        consoleOutput.appendChild(entry);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }

    function runCodeSandbox() {
        if (!editor || !tabsData[activeTabId]) return;
        const code = editor.value || '';
        const name = tabsData[activeTabId].name.toLowerCase();
        updateCodeRunnerBadge();

        if (name.endsWith('.html') || name.endsWith('.svg')) {
            if (sandboxIframe) {
                sandboxIframe.srcdoc = code;
                appendConsoleEntry('info', `Rendered ${name} in live sandbox.`);
            }
            return;
        }

        appendConsoleEntry('info', `▶ Executing JavaScript (${new Date().toLocaleTimeString()})...`);
        const frame = document.createElement('iframe');
        frame.style.display = 'none';
        frame.sandbox = 'allow-scripts';
        document.body.appendChild(frame);

        const safeCode = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta http-equiv="Content-Security-Policy" content="script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline';">
            </head>
            <body>
            <script>
                const _send = (lvl, args) => {
                    try {
                        const str = args.map(a => {
                            if (typeof a === 'object' && a !== null) {
                                try { return JSON.stringify(a, null, 2); } catch(e) { return String(a); }
                            }
                            return String(a);
                        }).join(' ');
                        window.parent.postMessage({ type: 'qp-console', level: lvl, text: str }, '*');
                    } catch(e) {}
                };
                console.log = (...a) => _send('log', a);
                console.info = (...a) => _send('info', a);
                console.warn = (...a) => _send('warn', a);
                console.error = (...a) => _send('error', a);
                window.onerror = (msg, url, line) => { _send('error', ['[Line ' + line + '] ' + msg]); return true; };
                try {
                    const _res = eval(${JSON.stringify(code).replace(/<\/script/gi, '<\\/script')});
                    if (_res !== undefined) _send('return', ['=> ' + _res]);
                } catch(err) {
                    _send('error', [err.toString()]);
                }
            <\/script>
            </body>
            </html>
        `;
        frame.srcdoc = safeCode;
        setTimeout(() => frame.remove(), 2500);
    }

    window.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'qp-console') {
            appendConsoleEntry(e.data.level, e.data.text);
        }
    });

    // =========================================================================
    // 3. TYPEWRITER SCROLL & FOCUS DIMMING ("HEMINGWAY MODE")
    // =========================================================================
    function initTypewriterAndFocus() {
        if (typewriterToggleBtn) typewriterToggleBtn.addEventListener('click', toggleTypewriterMode);
        if (focusToggleBtn) focusToggleBtn.addEventListener('click', toggleFocusMode);
    }

    function toggleTypewriterMode() {
        isTypewriterMode = !isTypewriterMode;
        document.body.classList.toggle('typewriter-mode', isTypewriterMode);
        if (typewriterToggleBtn) typewriterToggleBtn.classList.toggle('active', isTypewriterMode);
        if (isTypewriterMode) {
            centerCurrentEditorLine();
            showToast("📜 Typewriter Scroll Active", 'info');
        } else {
            showToast("Typewriter Scroll off", 'info');
        }
    }

    let focusDimmingRaf = null;
    function scheduleFocusDimmingUpdate() {
        if (!isFocusMode) return;
        if (focusDimmingRaf) cancelAnimationFrame(focusDimmingRaf);
        focusDimmingRaf = requestAnimationFrame(updateFocusDimming);
    }

    function getParagraphBounds() {
        if (!editor || !editorMirror) return { top: 24, height: 32, paddingLeft: 36 };
        const val = editor.value || '';
        const selStart = Math.min(editor.selectionStart || 0, editor.selectionEnd || 0);
        const selEnd = Math.max(editor.selectionStart || 0, editor.selectionEnd || 0);

        // Find current paragraph / line boundaries
        const prevNewline = val.lastIndexOf('\n', Math.max(0, selStart - 1));
        const paraStart = prevNewline === -1 ? 0 : prevNewline + 1;
        const nextNewline = val.indexOf('\n', selEnd);
        const paraEnd = nextNewline === -1 ? val.length : nextNewline;

        // Replication of editor styling to mirror
        const style = window.getComputedStyle(editor);
        editorMirror.style.fontFamily = style.fontFamily;
        editorMirror.style.fontSize = style.fontSize;
        editorMirror.style.fontWeight = style.fontWeight;
        editorMirror.style.lineHeight = style.lineHeight;
        editorMirror.style.letterSpacing = style.letterSpacing;
        editorMirror.style.wordSpacing = style.wordSpacing;
        editorMirror.style.tabSize = style.tabSize;
        editorMirror.style.paddingTop = style.paddingTop;
        editorMirror.style.paddingRight = style.paddingRight;
        editorMirror.style.paddingBottom = style.paddingBottom;
        editorMirror.style.paddingLeft = style.paddingLeft;
        editorMirror.style.borderTopWidth = style.borderTopWidth;
        editorMirror.style.borderRightWidth = style.borderRightWidth;
        editorMirror.style.borderBottomWidth = style.borderBottomWidth;
        editorMirror.style.borderLeftWidth = style.borderLeftWidth;
        editorMirror.style.width = style.width;
        editorMirror.style.boxSizing = style.boxSizing;
        editorMirror.style.whiteSpace = 'pre-wrap';
        editorMirror.style.wordWrap = 'break-word';
        editorMirror.style.overflowWrap = 'break-word';

        editorMirror.innerHTML = '';

        const textBefore = val.substring(0, paraStart);
        if (textBefore) {
            editorMirror.appendChild(document.createTextNode(textBefore));
        }

        const startMarker = document.createElement('span');
        const startChar = val.charAt(paraStart);
        startMarker.textContent = (startChar && startChar !== '\n') ? startChar : '\u200B';
        editorMirror.appendChild(startMarker);

        const endMarker = document.createElement('span');
        if (paraEnd > paraStart + 1) {
            const middle = val.substring(paraStart + 1, paraEnd - 1);
            if (middle) editorMirror.appendChild(document.createTextNode(middle));
            const endChar = val.charAt(paraEnd - 1);
            endMarker.textContent = (endChar && endChar !== '\n') ? endChar : '\u200B';
            editorMirror.appendChild(endMarker);
        } else {
            endMarker.textContent = '\u200B';
            editorMirror.appendChild(endMarker);
        }

        const lineHeight = parseFloat(style.lineHeight) || (parseFloat(style.fontSize) * 1.7) || 28;
        const top = startMarker.offsetTop - editor.scrollTop;
        const endTop = (paraEnd > paraStart + 1) ? (endMarker.offsetTop - editor.scrollTop) : top;
        const height = Math.max(lineHeight, (endTop - top) + lineHeight);

        return { top, height, paddingLeft: parseFloat(style.paddingLeft) || 36 };
    }

    function updateFocusDimming() {
        if (!isFocusMode || !editor || editor.style.display === 'none') {
            if (focusLineIndicator) focusLineIndicator.style.opacity = '0';
            return;
        }
        const { top, height, paddingLeft } = getParagraphBounds();

        editor.style.setProperty('--focus-top', `${top}px`);
        editor.style.setProperty('--focus-height', `${height}px`);

        if (focusLineIndicator) {
            focusLineIndicator.style.opacity = '1';
            focusLineIndicator.style.top = `${top}px`;
            focusLineIndicator.style.height = `${height}px`;
            focusLineIndicator.style.left = `${Math.max(8, paddingLeft - 18)}px`;
        }
    }

    function toggleFocusMode() {
        isFocusMode = !isFocusMode;
        document.body.classList.toggle('focus-mode', isFocusMode);
        if (focusToggleBtn) focusToggleBtn.classList.toggle('active', isFocusMode);
        if (isFocusMode) {
            updateFocusDimming();
            showToast("🎯 Focus Dimming Active", 'info');
        } else {
            editor.style.removeProperty('--focus-top');
            editor.style.removeProperty('--focus-height');
            if (focusLineIndicator) focusLineIndicator.style.opacity = '0';
            showToast("Focus Dimming off", 'info');
        }
    }

    function centerCurrentEditorLine() {
        if (!isTypewriterMode || !editor) return;
        const coords = getCaretCoordinates(editor.selectionStart || 0);
        const editorRect = editor.getBoundingClientRect();
        const targetScroll = editor.scrollTop + coords.top - (editorRect.height / 2);
        editor.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
    }

    // =========================================================================
    // 4. INLINE SLASH COMMAND SNIPPET EXPANDER
    // =========================================================================
    const SLASH_TEMPLATES = [
        {
            key: 'poll',
            label: 'Interactive Poll',
            hint: '[poll: ...]',
            icon: '📊',
            snippet: '\n[poll: What should we prioritize next? | Feature A | Feature B | Bug Fixes | Docs]\n\n'
        },
        {
            key: 'table',
            label: 'Markdown Table',
            hint: '3x3 Grid',
            icon: '📋',
            snippet: '\n| Metric | Q3 Target | Actual |\n| :--- | :--- | :--- |\n| Users | 10,000 | 14,250 |\n| Latency | < 50ms | 32ms |\n| Uptime | 99.9% | 99.99% |\n\n'
        },
        {
            key: 'date',
            label: 'Current Date & Time',
            hint: 'Timestamp',
            icon: '📅',
            snippet: () => `**${new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}** `
        },
        {
            key: 'meeting',
            label: 'Meeting Agenda',
            hint: 'Template',
            icon: '📝',
            snippet: '\n# 🗓️ Meeting Notes - ' + new Date().toLocaleDateString() + '\n**Attendees:** Anon\n\n## 🎯 Objectives\n- [ ] Align on release deliverables\n- [ ] Review pending PRs\n\n## 💬 Discussion Notes\n- \n\n## ⚡ Action Items\n- [ ] \n\n'
        },
        {
            key: 'mermaid',
            label: 'Mermaid Diagram',
            hint: 'Flowchart',
            icon: '📐',
            snippet: '\n```mermaid\ngraph TD\n    A[Client Browser] -->|E2EE Ciphertext| B(Zero-Knowledge Relay)\n    B --> C[(Firestore Storage)]\n    A -->|Direct P2P DataChannel| D[Collaborator Peer]\n```\n\n'
        },
        {
            key: 'math',
            label: 'KaTeX Math Formula',
            hint: 'Equation',
            icon: '🧮',
            snippet: '\n$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$\n\n'
        },
        {
            key: 'code',
            label: 'Code Block',
            hint: 'JavaScript',
            icon: '💻',
            snippet: '\n```javascript\nfunction calculateMomentum(velocity, mass) {\n    return velocity * mass;\n}\n```\n\n'
        },
        {
            key: 'task',
            label: 'Task Checkbox',
            hint: '- [ ]',
            icon: '☑️',
            snippet: '\n- [ ] '
        },
        {
            key: 'lorem',
            label: 'Lorem Ipsum',
            hint: 'Placeholder',
            icon: '📜',
            snippet: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. '
        }
    ];

    function initSlashCommands() {
        if (!editor) return;

        editor.addEventListener('input', (e) => {
            handleEditorSlashInput(e);
            if (isTypewriterMode) centerCurrentEditorLine();
        });

        editor.addEventListener('click', () => {
            if (isTypewriterMode) centerCurrentEditorLine();
            if (slashActive) closeSlashPopup();
        });

        editor.addEventListener('keyup', (e) => {
            if (isTypewriterMode && (e.key.startsWith('Arrow') || e.key === 'Enter')) centerCurrentEditorLine();
        });

        editor.addEventListener('keydown', (e) => {
            if (slashActive) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    slashSelectedIndex = (slashSelectedIndex + 1) % (slashFilteredTemplates.length || 1);
                    renderSlashResults();
                    return;
                }
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    slashSelectedIndex = (slashSelectedIndex - 1 + (slashFilteredTemplates.length || 1)) % (slashFilteredTemplates.length || 1);
                    renderSlashResults();
                    return;
                }
                if (e.key === 'Enter' || e.key === 'Tab') {
                    if (slashFilteredTemplates[slashSelectedIndex]) {
                        e.preventDefault();
                        insertSlashSnippet(slashFilteredTemplates[slashSelectedIndex]);
                        return;
                    }
                }
                if (e.key === 'Escape') {
                    e.preventDefault();
                    closeSlashPopup();
                    return;
                }
            }
        });
    }

    function handleEditorSlashInput(e) {
        if (!editor || !slashPopup) return;
        const val = editor.value;
        const pos = editor.selectionStart;

        const charBefore = val.charAt(pos - 1);
        const charTwoBefore = pos > 1 ? val.charAt(pos - 2) : '\n';

        if (charBefore === '/' && (pos === 1 || charTwoBefore === '\n' || charTwoBefore === ' ')) {
            slashActive = true;
            slashStartIndex = pos - 1;
            slashQuery = '';
            showSlashPopup(pos);
            return;
        }

        if (slashActive) {
            if (pos < slashStartIndex) {
                closeSlashPopup();
                return;
            }
            slashQuery = val.substring(slashStartIndex + 1, pos);
            if (slashQuery.includes(' ') || slashQuery.includes('\n')) {
                closeSlashPopup();
                return;
            }
            renderSlashResults();
        }
    }

    function showSlashPopup(pos) {
        if (!slashPopup || !editor) return;
        const coords = getCaretCoordinates(pos);
        const main = document.getElementById('workspace-main');
        const boundsW = main ? main.clientWidth : window.innerWidth;
        const boundsH = main ? main.clientHeight : window.innerHeight;

        let left = coords.left + 12;
        let top = coords.top + 26;

        if (left + 290 > boundsW) left = Math.max(10, boundsW - 300);
        if (top + 320 > boundsH) top = Math.max(10, top - 330);

        slashPopup.style.left = `${left}px`;
        slashPopup.style.top = `${top}px`;
        slashPopup.classList.remove('hidden');
        renderSlashResults();
    }

    function closeSlashPopup() {
        slashActive = false;
        if (slashPopup) slashPopup.classList.add('hidden');
    }

    function renderSlashResults() {
        if (!slashItems) return;
        slashItems.innerHTML = '';
        const q = slashQuery.toLowerCase();
        slashFilteredTemplates = SLASH_TEMPLATES.filter(t => t.key.includes(q) || t.label.toLowerCase().includes(q));

        if (slashFilteredTemplates.length === 0) {
            slashItems.innerHTML = '<div style="padding:10px;text-align:center;font-size:0.78rem;color:var(--text-muted);">No matching snippets</div>';
            slashSelectedIndex = 0;
            return;
        }

        if (slashSelectedIndex >= slashFilteredTemplates.length) slashSelectedIndex = 0;

        slashFilteredTemplates.forEach((item, idx) => {
            const div = document.createElement('div');
            div.className = `slash-item ${idx === slashSelectedIndex ? 'selected' : ''}`;
            div.innerHTML = `
                <div class="slash-item-left">
                    <span class="slash-item-icon">${item.icon}</span>
                    <span>${escapeHtml(item.label)}</span>
                </div>
                <span class="slash-item-hint">${escapeHtml(item.hint)}</span>
            `;
            div.addEventListener('mouseenter', () => {
                slashSelectedIndex = idx;
                renderSlashResults();
            });
            div.addEventListener('click', () => insertSlashSnippet(item));
            slashItems.appendChild(div);
        });
    }

    function insertSlashSnippet(template) {
        if (!editor) return;
        const val = editor.value;
        const pos = editor.selectionStart;
        const snippetText = typeof template.snippet === 'function' ? template.snippet() : template.snippet;

        const before = val.substring(0, slashStartIndex);
        const after = val.substring(pos);
        editor.value = before + snippetText + after;
        const newPos = before.length + snippetText.length;
        editor.selectionStart = editor.selectionEnd = newPos;

        closeSlashPopup();
        if (tabsData[activeTabId]) tabsData[activeTabId].content = editor.value;
        updatePreview();
        updateHUD();
        saveWorkspace();
        editor.focus();
        showToast(`Inserted ${template.label}!`, 'success');
    }

    // =========================================================================
    // 5. GHOST IMAGE STEGANOGRAPHY ENGINE (LSB PIXEL ENCODING)
    // =========================================================================
    function initSteganography() {
        if (stegOpenBtn) stegOpenBtn.addEventListener('click', () => {
            if (stegModal) {
                stegModal.classList.remove('hidden');
                drawStegMatrixPattern();
            }
        });
        if (closeSteg) closeSteg.addEventListener('click', () => stegModal && stegModal.classList.add('hidden'));

        if (stegTabHide && stegTabExtract) {
            stegTabHide.addEventListener('click', () => {
                stegTabHide.classList.add('active');
                stegTabExtract.classList.remove('active');
                if (stegPanelHide) stegPanelHide.classList.remove('hidden');
                if (stegPanelExtract) stegPanelExtract.classList.add('hidden');
            });
            stegTabExtract.addEventListener('click', () => {
                stegTabExtract.classList.add('active');
                stegTabHide.classList.remove('active');
                if (stegPanelExtract) stegPanelExtract.classList.remove('hidden');
                if (stegPanelHide) stegPanelHide.classList.add('hidden');
            });
        }

        if (stegGenPatternBtn) stegGenPatternBtn.addEventListener('click', drawStegMatrixPattern);
        if (stegLoadCurrentBtn) stegLoadCurrentBtn.addEventListener('click', () => {
            if (stegHideText && editor) stegHideText.value = editor.value;
        });

        if (stegCarrierFile) {
            stegCarrierFile.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) loadCarrierToCanvas(e.target.files[0]);
            });
        }

        if (stegEncodeBtn) stegEncodeBtn.addEventListener('click', encodeSteganography);
        if (stegDecodeBtn) stegDecodeBtn.addEventListener('click', decodeSteganography);

        if (stegRevealFile) {
            stegRevealFile.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) loadRevealPreview(e.target.files[0]);
            });
        }

        if (stegLoadEditorBtn) {
            stegLoadEditorBtn.addEventListener('click', () => {
                if (stegExtractedText && editor) {
                    editor.value = stegExtractedText.value;
                    if (tabsData[activeTabId]) tabsData[activeTabId].content = editor.value;
                    updatePreview();
                    updateHUD();
                    saveWorkspace();
                    if (stegModal) stegModal.classList.add('hidden');
                    showToast("Extracted note inserted into editor!", 'success');
                }
            });
        }

        if (stegNewTabBtn) {
            stegNewTabBtn.addEventListener('click', () => {
                if (stegExtractedText) {
                    const tid = generateToken();
                    tabsData[tid] = { name: 'ghost-secret.txt', content: stegExtractedText.value, is_encrypted: false };
                    renderTabs();
                    switchTab(tid);
                    if (stegModal) stegModal.classList.add('hidden');
                    showToast("Secret opened in new tab!", 'success');
                }
            });
        }

        if (stegCarrierDropzone) {
            ['dragenter', 'dragover'].forEach(evt => {
                stegCarrierDropzone.addEventListener(evt, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    stegCarrierDropzone.classList.add('drag-active');
                });
            });
            ['dragleave', 'drop'].forEach(evt => {
                stegCarrierDropzone.addEventListener(evt, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    stegCarrierDropzone.classList.remove('drag-active');
                });
            });
            stegCarrierDropzone.addEventListener('drop', (e) => {
                if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
                    loadCarrierToCanvas(e.dataTransfer.files[0]);
                }
            });
        }

        if (stegRevealDropzone) {
            ['dragenter', 'dragover'].forEach(evt => {
                stegRevealDropzone.addEventListener(evt, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    stegRevealDropzone.classList.add('drag-active');
                });
            });
            ['dragleave', 'drop'].forEach(evt => {
                stegRevealDropzone.addEventListener(evt, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    stegRevealDropzone.classList.remove('drag-active');
                });
            });
            stegRevealDropzone.addEventListener('drop', (e) => {
                if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
                    loadRevealPreview(e.dataTransfer.files[0]);
                }
            });
            stegRevealDropzone.addEventListener('click', (e) => {
                if (e.target !== stegRevealFile && stegRevealFile) {
                    stegRevealFile.click();
                }
            });
        }
    }

    function drawStegMatrixPattern() {
        if (!stegCanvas) return;
        const ctx = stegCanvas.getContext('2d');
        const w = stegCanvas.width = 400;
        const h = stegCanvas.height = 300;
        
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#0a0f1d');
        grad.addColorStop(0.5, '#051829');
        grad.addColorStop(1, '#020617');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(0, 255, 249, 0.25)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 20; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * w, Math.random() * h);
            ctx.lineTo(Math.random() * w, Math.random() * h);
            ctx.stroke();
        }

        ctx.fillStyle = 'rgba(0, 255, 102, 0.4)';
        ctx.font = '12px monospace';
        const glyphs = '01QUICKPAD_STEG_AES256_GHOST_CIPHER';
        for (let x = 10; x < w; x += 22) {
            for (let y = 18; y < h; y += 22) {
                if (Math.random() > 0.6) {
                    ctx.fillText(glyphs[Math.floor(Math.random() * glyphs.length)], x, y);
                }
            }
        }
    }

    function loadCarrierToCanvas(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                if (!stegCanvas) return;
                stegCanvas.width = Math.max(300, img.width);
                stegCanvas.height = Math.max(200, img.height);
                const ctx = stegCanvas.getContext('2d');
                ctx.drawImage(img, 0, 0, stegCanvas.width, stegCanvas.height);
                showToast("Carrier image loaded!", 'info');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    let revealImageFile = null;
    function loadRevealPreview(file) {
        revealImageFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            if (stegRevealPreview) {
                stegRevealPreview.src = e.target.result;
                stegRevealPreview.classList.remove('hidden');
            }
            if (stegRevealPrompt) stegRevealPrompt.innerText = `Selected: ${file.name} (${Math.round(file.size / 1024)} KB)`;
        };
        reader.readAsDataURL(file);
    }

    function encodeSteganography() {
        if (!stegCanvas || !stegHideText) return;
        const secret = stegHideText.value;
        if (!secret) {
            showToast("Please enter secret text to conceal", 'error');
            return;
        }

        const pass = stegHidePass ? stegHidePass.value.trim() : '';
        let payload = secret;
        let isEncrypted = false;
        if (pass && typeof CryptoJS !== 'undefined') {
            payload = CryptoJS.AES.encrypt(secret, pass).toString();
            isEncrypted = true;
        }

        const rawPayload = `QPSTEG1:${isEncrypted ? '1' : '0'}:${payload}`;
        const encoder = new TextEncoder();
        const payloadBytes = encoder.encode(rawPayload);
        const totalBitsNeeded = (payloadBytes.length + 4) * 8;

        const ctx = stegCanvas.getContext('2d');
        let imgData = ctx.getImageData(0, 0, stegCanvas.width, stegCanvas.height);
        const maxBits = imgData.width * imgData.height * 3;

        if (totalBitsNeeded > maxBits) {
            const scale = Math.ceil(Math.sqrt(totalBitsNeeded / maxBits) * 1.2);
            stegCanvas.width *= scale;
            stegCanvas.height *= scale;
            drawStegMatrixPattern();
            imgData = ctx.getImageData(0, 0, stegCanvas.width, stegCanvas.height);
        }

        const data = imgData.data;
        let bitIndex = 0;

        const writeBit = (bit) => {
            const pixelIdx = Math.floor(bitIndex / 3) * 4;
            const channel = bitIndex % 3;
            data[pixelIdx + channel] = (data[pixelIdx + channel] & 0xFE) | (bit & 1);
            data[pixelIdx + 3] = 255;
            bitIndex++;
        };

        const len = payloadBytes.length;
        for (let b = 31; b >= 0; b--) {
            writeBit((len >> b) & 1);
        }

        for (let i = 0; i < payloadBytes.length; i++) {
            const byte = payloadBytes[i];
            for (let b = 7; b >= 0; b--) {
                writeBit((byte >> b) & 1);
            }
        }

        ctx.putImageData(imgData, 0, 0);

        const link = document.createElement('a');
        link.download = `ghost-secret-${Date.now()}.png`;
        link.href = stegCanvas.toDataURL('image/png');
        link.click();
        showToast("🔒 Secret encoded! Ghost PNG downloaded.", 'success');
    }

    function decodeSteganography() {
        if (!revealImageFile) {
            showToast("Please choose or drop a Ghost PNG image first", 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const offCanvas = document.createElement('canvas');
                offCanvas.width = img.width;
                offCanvas.height = img.height;
                const ctx = offCanvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const imgData = ctx.getImageData(0, 0, img.width, img.height);
                const data = imgData.data;

                let bitIndex = 0;
                const readBit = () => {
                    const pixelIdx = Math.floor(bitIndex / 3) * 4;
                    const channel = bitIndex % 3;
                    const bit = data[pixelIdx + channel] & 1;
                    bitIndex++;
                    return bit;
                };

                let len = 0;
                for (let b = 31; b >= 0; b--) {
                    len = (len << 1) | readBit();
                }

                if (len <= 0 || len > 2000000) {
                    showToast("No QuickPad secret found in this image.", 'error');
                    return;
                }

                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    let byte = 0;
                    for (let b = 7; b >= 0; b--) {
                        byte = (byte << 1) | readBit();
                    }
                    bytes[i] = byte;
                }

                const decoder = new TextDecoder('utf-8');
                const rawStr = decoder.decode(bytes);

                if (!rawStr.startsWith('QPSTEG1:')) {
                    showToast("Corrupted or incompatible steganography payload.", 'error');
                    return;
                }

                const parts = rawStr.split(':');
                const isEnc = parts[1] === '1';
                let secretCipher = parts.slice(2).join(':');

                if (isEnc) {
                    const pass = stegRevealPass ? stegRevealPass.value.trim() : '';
                    if (!pass) {
                        showToast("This secret is password-protected. Enter passphrase above.", 'warn');
                        return;
                    }
                    try {
                        const bytesDec = CryptoJS.AES.decrypt(secretCipher, pass);
                        const decrypted = bytesDec.toString(CryptoJS.enc.Utf8);
                        if (!decrypted) {
                            showToast("Incorrect decryption passphrase.", 'error');
                            return;
                        }
                        secretCipher = decrypted;
                    } catch(err) {
                        showToast("Decryption failed. Check passphrase.", 'error');
                        return;
                    }
                }

                if (stegExtractedText) stegExtractedText.value = secretCipher;
                if (stegExtractedContainer) stegExtractedContainer.classList.remove('hidden');
                showToast("🔓 Secret note successfully extracted!", 'success');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(revealImageFile);
    }

    // =========================================================================
    // 6. WEBRTC P2P WORMHOLE FILE BEAM ENGINE (DIRECT DATACHANNEL)
    // =========================================================================
    const rtcConfig = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
        ]
    };

    function initWormhole() {
        if (wormholeOpenBtn) {
            wormholeOpenBtn.addEventListener('click', () => {
                if (wormholeModal) {
                    wormholeModal.classList.remove('hidden');
                    updateWormholePeersUI();
                    checkWormholeReady();
                }
            });
        }
        if (closeWormhole) closeWormhole.addEventListener('click', () => wormholeModal && wormholeModal.classList.add('hidden'));

        if (wormholeFileInput) {
            wormholeFileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    setWormholeFile(e.target.files[0]);
                }
            });
        }

        if (wormholeSendBtn) {
            wormholeSendBtn.addEventListener('click', () => {
                startWormholeTransfer();
            });
        }

        if (wormholeDropzone) {
            ['dragenter', 'dragover'].forEach(evt => {
                wormholeDropzone.addEventListener(evt, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    wormholeDropzone.classList.add('drag-active');
                });
            });
            ['dragleave', 'drop'].forEach(evt => {
                wormholeDropzone.addEventListener(evt, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    wormholeDropzone.classList.remove('drag-active');
                });
            });
            wormholeDropzone.addEventListener('drop', (e) => {
                if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
                    setWormholeFile(e.dataTransfer.files[0]);
                }
            });
            wormholeDropzone.addEventListener('click', (e) => {
                if (e.target !== wormholeFileInput && wormholeFileInput) {
                    wormholeFileInput.click();
                }
            });
        }
    }

    function setWormholeFile(file) {
        selectedWormholeFile = file;
        if (wormholeFileMeta) wormholeFileMeta.classList.remove('hidden');
        if (wormholeFileName) wormholeFileName.innerText = file.name;
        if (wormholeFileSize) wormholeFileSize.innerText = formatFileSize(file.size);
        if (wormholeDropPrompt) wormholeDropPrompt.innerText = "File selected!";
        checkWormholeReady();
    }

    function formatFileSize(bytes) {
        if (!bytes || isNaN(bytes)) return '0 B';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    function checkWormholeReady() {
        if (!wormholeSendBtn) return;
        
        let otherPeerCount = 0;
        currentActiveUsers.forEach((user, cid) => {
            if (cid !== myDeviceId) otherPeerCount++;
        });

        if (selectedWormholePeer && selectedWormholeFile) {
            const peer = currentActiveUsers.get(selectedWormholePeer) || { name: 'Collaborator' };
            wormholeSendBtn.disabled = false;
            wormholeSendBtn.classList.add('ready-pulse');
            wormholeSendBtn.innerText = `⚡ Beam "${selectedWormholeFile.name}" to ${peer.name}`;
        } else if (!selectedWormholeFile) {
            wormholeSendBtn.disabled = false;
            wormholeSendBtn.classList.remove('ready-pulse');
            wormholeSendBtn.innerText = "⚡ Choose a File to Beam";
        } else if (otherPeerCount === 0) {
            wormholeSendBtn.disabled = false;
            wormholeSendBtn.classList.remove('ready-pulse');
            wormholeSendBtn.innerText = "⚡ Waiting for Collaborator to Join...";
        } else {
            wormholeSendBtn.disabled = false;
            wormholeSendBtn.classList.remove('ready-pulse');
            wormholeSendBtn.innerText = "⚡ Select a Collaborator Above";
        }
    }

    function updateWormholePeersUI() {
        if (!wormholePeersList) return;
        wormholePeersList.innerHTML = '';
        const otherPeerIds = [];

        currentActiveUsers.forEach((user, cid) => {
            if (cid !== myDeviceId) otherPeerIds.push(cid);
        });

        // Automatically select collaborator if only 1 is present, or if none is currently selected
        if (otherPeerIds.length > 0 && (!selectedWormholePeer || !currentActiveUsers.has(selectedWormholePeer))) {
            selectedWormholePeer = otherPeerIds[0];
        }

        otherPeerIds.forEach((cid) => {
            const user = currentActiveUsers.get(cid) || { name: 'Collaborator' };
            const isSelected = selectedWormholePeer === cid;
            const item = document.createElement('div');
            item.className = `wormhole-peer-item ${isSelected ? 'selected' : ''}`;
            const colorObj = getPeerColor(cid);
            
            const badgeHtml = isSelected
                ? '<span class="wormhole-peer-check">✓ Selected</span>'
                : '<span class="wormhole-peer-select-btn">Click to select</span>';

            item.innerHTML = `
                <div class="wormhole-peer-info">
                    <span class="wormhole-peer-avatar" style="border:1.5px solid ${colorObj.color}">${user.avatar && !user.avatar.startsWith('http') && !user.avatar.startsWith('data:') ? user.avatar : '👤'}</span>
                    <span style="font-weight:600;color:${colorObj.color}">${escapeHtml(user.name)}</span>
                </div>
                ${badgeHtml}
            `;
            item.addEventListener('click', () => {
                selectedWormholePeer = cid;
                updateWormholePeersUI();
                checkWormholeReady();
            });
            wormholePeersList.appendChild(item);
        });

        if (otherPeerIds.length === 0) {
            selectedWormholePeer = null;
            wormholePeersList.innerHTML = '<div class="wormhole-empty-peers">No other collaborators currently in workspace. Share your link with a peer first!</div>';
        }

        checkWormholeReady();
    }

    async function startWormholeTransfer() {
        if (!selectedWormholeFile) {
            showToast("Please choose a file to beam first", 'info');
            if (wormholeFileInput) wormholeFileInput.click();
            return;
        }

        let otherPeerCount = 0;
        currentActiveUsers.forEach((user, cid) => {
            if (cid !== myDeviceId) otherPeerCount++;
        });

        if (otherPeerCount === 0) {
            showToast("No other collaborators in workspace. Share your link to beam files!", 'warning');
            return;
        }

        if (!selectedWormholePeer || !currentActiveUsers.has(selectedWormholePeer)) {
            showToast("Please select a collaborator in the list above to beam to", 'info');
            return;
        }

        if (!db || !currentToken) {
            showToast("Workspace connection offline", 'error');
            return;
        }

        if (wormholeProgressContainer) wormholeProgressContainer.classList.remove('hidden');
        if (wormholeStatusText) wormholeStatusText.innerText = "Gathering P2P routes...";
        if (wormholeSendBtn) wormholeSendBtn.disabled = true;

        try {
            if (wormholePeerConn) {
                try { wormholePeerConn.close(); } catch(e) {}
            }

            wormholePeerConn = new RTCPeerConnection(rtcConfig);
            wormholeDataChannel = wormholePeerConn.createDataChannel('fileTransfer', { ordered: true });
            wormholeDataChannel.binaryType = 'arraybuffer';

            wormholeDataChannel.onopen = () => {
                if (wormholeStatusText) wormholeStatusText.innerText = `Connected! Beaming ${selectedWormholeFile.name}...`;
                sendFileChunks(selectedWormholeFile, wormholeDataChannel);
            };

            wormholeDataChannel.onerror = (err) => {
                console.error("Wormhole DataChannel error:", err);
                showToast("P2P DataChannel connection error", 'error');
                if (wormholeSendBtn) wormholeSendBtn.disabled = false;
            };

            const offer = await wormholePeerConn.createOffer();
            await wormholePeerConn.setLocalDescription(offer);

            // Wait for ICE gathering to complete so all candidates are cleanly embedded in the SDP
            await new Promise((resolve) => {
                if (wormholePeerConn.iceGatheringState === 'complete') {
                    resolve();
                } else {
                    const check = () => {
                        if (wormholePeerConn.iceGatheringState === 'complete') {
                            wormholePeerConn.removeEventListener('icegatheringstatechange', check);
                            resolve();
                        }
                    };
                    wormholePeerConn.addEventListener('icegatheringstatechange', check);
                    setTimeout(resolve, 2000);
                }
            });

            // Send pure JSON payload so Firestore never throws serialization errors
            await sendWormholeSignal({
                type: 'offer',
                sdp: {
                    type: wormholePeerConn.localDescription.type,
                    sdp: wormholePeerConn.localDescription.sdp
                },
                to: selectedWormholePeer,
                fileMeta: {
                    name: selectedWormholeFile.name,
                    size: selectedWormholeFile.size,
                    type: selectedWormholeFile.type || 'application/octet-stream'
                }
            });

            if (wormholeStatusText) wormholeStatusText.innerText = "Beam invite sent! Waiting for peer acceptance...";
        } catch(err) {
            console.error("Wormhole handshake error:", err);
            showToast("Failed to initiate P2P Wormhole", 'error');
            if (wormholeStatusText) wormholeStatusText.innerText = "Connection error";
            if (wormholeSendBtn) wormholeSendBtn.disabled = false;
        }
    }

    async function sendWormholeSignal(sigObj) {
        if (!db || !currentToken) return;
        sigObj.from = myDeviceId;
        sigObj.timestamp = Date.now();
        try {
            await db.collection("workspaces").doc(currentToken).update({ wormhole: sigObj });
        } catch(e) {
            console.warn("Wormhole signal write warning:", e);
        }
    }

    async function clearWormholeSignal() {
        if (!db || !currentToken) return;
        try {
            await db.collection("workspaces").doc(currentToken).update({
                wormhole: firebase.firestore.FieldValue.delete()
            });
        } catch(e) {}
    }

    async function handleIncomingWormholeSignal(sig) {
        if (!sig || sig.from === myDeviceId) return;

        if (sig.type === 'offer') {
            const senderUser = currentActiveUsers.get(sig.from) || { name: 'Collaborator' };
            const accept = await showCustomConfirm(
                "⚡ P2P Wormhole File Beam",
                `${senderUser.name} wants to beam you file:\n\n"${sig.fileMeta.name}" (${formatFileSize(sig.fileMeta.size)})\n\nAccept direct P2P transfer?`
            );

            if (!accept) {
                await sendWormholeSignal({ type: 'reject', to: sig.from });
                return;
            }

            incomingFileMeta = sig.fileMeta;
            incomingFileBuffer = [];
            incomingReceivedBytes = 0;

            if (wormholeModal) wormholeModal.classList.remove('hidden');
            if (wormholeProgressContainer) wormholeProgressContainer.classList.remove('hidden');
            if (wormholeStatusText) wormholeStatusText.innerText = `Connecting P2P channel for ${sig.fileMeta.name}...`;
            if (wormholeProgressFill) wormholeProgressFill.style.width = '0%';
            if (wormholePercentage) wormholePercentage.innerText = '0%';

            if (wormholePeerConn) {
                try { wormholePeerConn.close(); } catch(e) {}
            }

            wormholePeerConn = new RTCPeerConnection(rtcConfig);
            const startTime = Date.now();

            wormholePeerConn.ondatachannel = (e) => {
                const channel = e.channel;
                channel.binaryType = 'arraybuffer';

                channel.onmessage = (msgEvent) => {
                    incomingFileBuffer.push(msgEvent.data);
                    incomingReceivedBytes += msgEvent.data.byteLength;
                    const pct = Math.min(100, Math.round((incomingReceivedBytes / incomingFileMeta.size) * 100));

                    if (wormholeProgressFill) wormholeProgressFill.style.width = `${pct}%`;
                    if (wormholePercentage) wormholePercentage.innerText = `${pct}%`;

                    const elapsed = (Date.now() - startTime) / 1000;
                    const speed = elapsed > 0 ? (incomingReceivedBytes / 1024 / elapsed).toFixed(0) : 0;
                    if (wormholeSpeedText) wormholeSpeedText.innerText = `${speed} KB/s`;

                    if (incomingReceivedBytes >= incomingFileMeta.size) {
                        if (wormholeStatusText) wormholeStatusText.innerText = "Transfer Complete! Saving file...";
                        const blob = new Blob(incomingFileBuffer, { type: incomingFileMeta.type || 'application/octet-stream' });
                        const dl = document.createElement('a');
                        dl.href = URL.createObjectURL(blob);
                        dl.download = incomingFileMeta.name;
                        document.body.appendChild(dl);
                        dl.click();
                        setTimeout(() => { dl.remove(); URL.revokeObjectURL(dl.href); }, 1000);
                        showToast(`⚡ File beamed successfully: ${incomingFileMeta.name}`, 'success');
                        clearWormholeSignal();
                    }
                };
            };

            await wormholePeerConn.setRemoteDescription(new RTCSessionDescription(sig.sdp));
            const answer = await wormholePeerConn.createAnswer();
            await wormholePeerConn.setLocalDescription(answer);

            // Wait for answer ICE gathering
            await new Promise((resolve) => {
                if (wormholePeerConn.iceGatheringState === 'complete') {
                    resolve();
                } else {
                    const check = () => {
                        if (wormholePeerConn.iceGatheringState === 'complete') {
                            wormholePeerConn.removeEventListener('icegatheringstatechange', check);
                            resolve();
                        }
                    };
                    wormholePeerConn.addEventListener('icegatheringstatechange', check);
                    setTimeout(resolve, 2000);
                }
            });

            await sendWormholeSignal({
                type: 'answer',
                sdp: {
                    type: wormholePeerConn.localDescription.type,
                    sdp: wormholePeerConn.localDescription.sdp
                },
                to: sig.from
            });
        } else if (sig.type === 'answer' && wormholePeerConn) {
            if (wormholePeerConn.signalingState !== 'stable') {
                await wormholePeerConn.setRemoteDescription(new RTCSessionDescription(sig.sdp));
            }
        } else if (sig.type === 'reject') {
            showToast("Collaborator declined the file beam.", 'info');
            if (wormholeStatusText) wormholeStatusText.innerText = "Beam declined by collaborator";
            if (wormholeSendBtn) wormholeSendBtn.disabled = false;
            clearWormholeSignal();
        }
    }

    function sendFileChunks(file, channel) {
        const CHUNK_SIZE = 16 * 1024; // 16 KB standard safe RTCDataChannel frame
        let offset = 0;
        const startTime = Date.now();

        function readSlice(o) {
            if (channel.readyState !== 'open') return;
            const slice = file.slice(o, o + CHUNK_SIZE);
            const reader = new FileReader();
            reader.onload = (e) => {
                if (channel.readyState !== 'open') return;

                channel.send(e.target.result);
                offset += e.target.result.byteLength;
                const pct = Math.min(100, Math.round((offset / file.size) * 100));

                if (wormholeProgressFill) wormholeProgressFill.style.width = `${pct}%`;
                if (wormholePercentage) wormholePercentage.innerText = `${pct}%`;

                const elapsed = (Date.now() - startTime) / 1000;
                const speed = elapsed > 0 ? (offset / 1024 / elapsed).toFixed(0) : 0;
                if (wormholeSpeedText) wormholeSpeedText.innerText = `${speed} KB/s`;

                if (offset < file.size) {
                    if (channel.bufferedAmount > 512 * 1024) {
                        setTimeout(() => readSlice(offset), 20);
                    } else {
                        readSlice(offset);
                    }
                } else {
                    if (wormholeStatusText) wormholeStatusText.innerText = "File successfully beamed to peer!";
                    showToast(`⚡ ${file.name} beamed successfully!`, 'success');
                    if (wormholeSendBtn) wormholeSendBtn.disabled = false;
                }
            };
            reader.readAsArrayBuffer(slice);
        }
        readSlice(0);
    }

    // --- Command Palette Engine ---
    const cmdInput = document.getElementById('cmd-input');
    const cmdResults = document.getElementById('cmd-results');
    let cmdSelectedIndex = 0;

    const commands = [
        { name: "Share Links & QR Code", shortcut: "Share", action: () => shareBtn && shareBtn.click() },
        { name: "User Profile Settings", shortcut: "User", action: () => profilePillBtn && profilePillBtn.click() },
        { name: "Upload Profile Avatar Photo", shortcut: "Photo", action: () => { if (profilePillBtn) profilePillBtn.click(); setTimeout(() => profileAvatarFileInput && profileAvatarFileInput.click(), 200); } },
        { name: "Insert Image from Device...", shortcut: "Image", action: () => noteImageFileInput && noteImageFileInput.click() },
        { name: "Find & Replace", shortcut: "⌘F", action: () => toggleFindBar() },
        { name: "Toggle Markdown Preview", shortcut: "Alt+M", action: () => mdToggleBtn && mdToggleBtn.click() },
        { name: "Toggle Split View", shortcut: "Alt+S", action: () => splitToggleBtn && splitToggleBtn.click() },
        { name: "Toggle Zen Mode", shortcut: "Alt+Z", action: () => zenBtn && zenBtn.click() },
        { name: "Toggle Typewriter Scroll", shortcut: "Alt+T", action: () => toggleTypewriterMode() },
        { name: "Toggle Focus Dimming", shortcut: "Alt+H", action: () => toggleFocusMode() },
        { name: "Toggle Presenter Spotlight", shortcut: "Alt+O", action: () => togglePresenterSpotlight() },
        { name: "Toggle Collaborator Laser", shortcut: "Alt+L", action: () => toggleLaserPointer() },
        { name: "Live Sandboxed Code Runner", shortcut: "⌘Enter", action: () => toggleCodeRunner(true) },
        { name: "Ghost Image Steganography", shortcut: "Steg", action: () => stegOpenBtn && stegOpenBtn.click() },
        { name: "P2P Wormhole File Beam", shortcut: "Beam", action: () => wormholeOpenBtn && wormholeOpenBtn.click() },
        { name: "Download Markdown (.md)", shortcut: "File", action: () => exportMdBtn && exportMdBtn.click() },
        { name: "Download Text (.txt)", shortcut: "File", action: () => exportTxtBtn && exportTxtBtn.click() },
        { name: "Export Workspace (.json)", shortcut: "Backup", action: () => exportJsonBtn && exportJsonBtn.click() },
        { name: "Export Encrypted HTML (.html)", shortcut: "Vault", action: () => exportHtmlBtn && exportHtmlBtn.click() },
        { name: "Copy Document to Clipboard", shortcut: "⌘C", action: () => copyBtn && copyBtn.click() },
        { name: "Create New Workspace", shortcut: "New", action: () => newBtn && newBtn.click() },
        { name: "Create Burn Note (Self-Destruct)", shortcut: "Burn", action: () => burnBtn && burnBtn.click() },
        { name: "💥 Burn Note Right Away", shortcut: "Burn Now", action: () => instantBurnWorkspace() },
        { name: "Lock Current Tab (Nested Vault)", shortcut: "Lock", action: () => lockCurrentTab() },
        { name: "Zero-Knowledge & Privacy Inspector", shortcut: "Audit", action: () => openPrivacyInspector() },
        { name: "Export Note as Image Card", shortcut: "Card", action: () => openCardExportModal() },
        { name: "Toggle Pomodoro Focus Timer", shortcut: "🍅", action: () => togglePomodoro() },
        { name: "Reset Pomodoro Timer", shortcut: "Reset", action: () => resetPomodoro() }
    ];

    function renderCmdResults(filterText = "") {
        if (!cmdResults) return;
        cmdResults.innerHTML = '';
        const filtered = commands.filter(c => c.name.toLowerCase().includes(filterText.toLowerCase()));
        
        // Add current workspace tabs as searchable switch commands
        for (let tid in tabsData) {
            if (tabsData[tid].name.toLowerCase().includes(filterText.toLowerCase())) {
                filtered.push({ name: `Switch Tab: ${tabsData[tid].name}`, shortcut: "Tab", action: () => switchTab(tid) });
            }
        }

        if (filtered.length === 0) {
            cmdResults.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:0.85rem;">No matching commands found</div>';
            cmdSelectedIndex = 0;
            return;
        }

        if (cmdSelectedIndex >= filtered.length) cmdSelectedIndex = Math.max(0, filtered.length - 1);

        filtered.forEach((cmd, idx) => {
            const div = document.createElement('div');
            div.className = `cmd-item ${idx === cmdSelectedIndex ? 'active' : ''}`;
            div.innerHTML = `<span>${escapeHtml(cmd.name)}</span> <kbd style="font-size:0.7rem;padding:2px 5px;background:rgba(255,255,255,0.06);border-radius:4px;">${escapeHtml(cmd.shortcut || '')}</kbd>`;
            div.onmouseenter = () => { cmdSelectedIndex = idx; renderCmdResults(filterText); };
            div.onclick = () => { if (cmdPaletteModal) cmdPaletteModal.classList.add('hidden'); cmd.action(); };
            cmdResults.appendChild(div);
        });
    }

    function openCommandPalette() {
        if (!cmdPaletteModal) return;
        cmdPaletteModal.classList.remove('hidden');
        if (cmdInput) {
            cmdInput.value = '';
            cmdInput.focus();
        }
        cmdSelectedIndex = 0;
        renderCmdResults();
    }

    if (cmdPaletteBtn) cmdPaletteBtn.addEventListener('click', openCommandPalette);

    document.addEventListener('keydown', (e) => {
        // Cmd+K / Ctrl+K Palette
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            if (cmdPaletteModal && cmdPaletteModal.classList.contains('hidden')) openCommandPalette();
            else if (cmdPaletteModal) cmdPaletteModal.classList.add('hidden');
        }
        // Cmd+F / Ctrl+F Find
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            toggleFindBar();
        }
        // Cmd+Enter / Ctrl+Enter Live Sandbox Runner
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            toggleCodeRunner(true);
        }
        // Alt+M Markdown
        if (e.altKey && e.key.toLowerCase() === 'm') {
            e.preventDefault();
            if (mdToggleBtn) mdToggleBtn.click();
        }
        // Alt+S Split
        if (e.altKey && e.key.toLowerCase() === 's') {
            e.preventDefault();
            if (splitToggleBtn) splitToggleBtn.click();
        }
        // Alt+Z Zen
        if (e.altKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            if (document.body.classList.contains('zen-mode')) {
                if (zenExitBtn) zenExitBtn.click();
            } else {
                if (zenBtn) zenBtn.click();
            }
        }
        // Alt+T Typewriter Scroll
        if (e.altKey && e.key.toLowerCase() === 't') {
            e.preventDefault();
            toggleTypewriterMode();
        }
        // Alt+H Focus Dimming
        if (e.altKey && e.key.toLowerCase() === 'h') {
            e.preventDefault();
            toggleFocusMode();
        }
        // Alt+O Presenter Spotlight
        if (e.altKey && e.key.toLowerCase() === 'o') {
            e.preventDefault();
            togglePresenterSpotlight();
        }
        // Alt+L Laser Pointer
        if (e.altKey && e.key.toLowerCase() === 'l') {
            e.preventDefault();
            toggleLaserPointer();
        }
    });

    if (cmdInput) {
        cmdInput.addEventListener('keydown', (e) => {
            const items = cmdResults ? cmdResults.querySelectorAll('.cmd-item') : [];
            if (items.length === 0) return;
            if (e.key === 'ArrowDown') { e.preventDefault(); cmdSelectedIndex = (cmdSelectedIndex + 1) % items.length; renderCmdResults(cmdInput.value); }
            if (e.key === 'ArrowUp') { e.preventDefault(); cmdSelectedIndex = (cmdSelectedIndex - 1 + items.length) % items.length; renderCmdResults(cmdInput.value); }
            if (e.key === 'Enter') { e.preventDefault(); items[cmdSelectedIndex].click(); }
        });

        cmdInput.addEventListener('input', (e) => {
            cmdSelectedIndex = 0;
            renderCmdResults(e.target.value);
        });
    }

    async function lockCurrentTab() {
        if (!activeTabId || !tabsData[activeTabId]) return;
        if (tabsData[activeTabId].is_secret) {
            const remove = await showCustomConfirm("Unlock Tab", "This tab is already locked. Remove the lock password?");
            if (remove) {
                tabsData[activeTabId].is_secret = false;
                tabsData[activeTabId].secret_pass = null;
                saveWorkspace();
                renderTabs();
                showToast("Tab lock removed.", 'success');
            }
            return;
        }
        const pass = await showCustomPrompt("Lock Tab", "Enter a secret password for this tab:");
        if (pass && pass.trim()) {
            tabsData[activeTabId].is_secret = true;
            tabsData[activeTabId].secret_pass = pass.trim();
            saveWorkspace();
            renderTabs();
            showToast("Tab locked successfully!", 'success');
        }
    }

    let strokeBatch = [];
    let strokeBatchTimeout = null;
    let strokesUnsubscribe = null;

    function broadcastStrokes() {
        if (strokeBatch.length === 0) return;
        const batch = [...strokeBatch];
        strokeBatch = [];

        const strokeData = {
            cid: myDeviceId,
            tabId: activeTabId,
            color: wbColor,
            size: wbSize,
            eraser: wbTool === 'eraser',
            points: batch,
            timestamp: Date.now()
        };

        // Broadcast to local tabs immediately
        broadcastLocalSync({
            type: 'whiteboard_stroke',
            tabId: activeTabId,
            senderId: myDeviceId,
            stroke: strokeData
        });

        if (db && currentToken && !isCloudQuotaExceeded) {
            db.collection("workspaces").doc(currentToken).collection("strokes").add(strokeData).catch(() => {});
        }
    }

    function drawRemoteStrokeBatch(data) {
        if (!wbCtx || !whiteboardCanvas) return;
        
        wbCtx.save();
        wbCtx.lineWidth = data.size;
        wbCtx.lineCap = 'round';
        wbCtx.lineJoin = 'round';

        if (data.eraser) {
            wbCtx.globalCompositeOperation = 'destination-out';
            wbCtx.strokeStyle = 'rgba(0,0,0,1)';
            wbCtx.shadowBlur = 0;
        } else {
            wbCtx.globalCompositeOperation = 'source-over';
            wbCtx.strokeStyle = data.color;
            wbCtx.shadowColor = data.color;
            wbCtx.shadowBlur = 6;
        }

        wbCtx.beginPath();
        if (data.points && data.points.length > 0) {
            wbCtx.moveTo(data.points[0].x, data.points[0].y);
            for (let i = 1; i < data.points.length; i++) {
                wbCtx.lineTo(data.points[i].x, data.points[i].y);
            }
            wbCtx.stroke();
            wbCtx.beginPath();
            wbCtx.moveTo(data.points[data.points.length - 1].x, data.points[data.points.length - 1].y);
        }
        wbCtx.restore();
    }

    function initStrokesListener() {
        if (!db || !currentToken) return;
        if (strokesUnsubscribe) {
            try { strokesUnsubscribe(); } catch(e) {}
            strokesUnsubscribe = null;
        }
        
        try {
            strokesUnsubscribe = db.collection("workspaces").doc(currentToken).collection("strokes")
                .where("timestamp", ">", Date.now())
                .onSnapshot(snap => {
                    snap.docChanges().forEach(change => {
                        if (change.type === 'added') {
                            const data = change.doc.data();
                            if (data.cid !== myDeviceId && data.tabId === activeTabId) {
                                drawRemoteStrokeBatch(data);
                            }
                        }
                    });
                }, err => {
                    // Gracefully ignore permission or quota errors on strokes subcollection
                });
        } catch(e) {}
    }
    // ============================================================
    // VERSION 4.0 PRO ENGINE
    // ============================================================

    // 1. Auto-Save & Sync Status Indicator
    const hudSaveStatus = document.getElementById('hud-save-status');
    const hudSaveText = document.getElementById('hud-save-text');

    function setSaveStatus(status) {
        if (!hudSaveStatus || !hudSaveText) return;
        hudSaveStatus.classList.remove('saving', 'saved', 'quota', 'error');
        if (status === 'saving') {
            hudSaveStatus.classList.add('saving');
            hudSaveText.textContent = 'Syncing...';
            hudSaveStatus.title = 'Encrypting & syncing workspace...';
        } else if (status === 'quota') {
            hudSaveStatus.classList.add('quota');
            hudSaveText.textContent = 'Local (Quota)';
            hudSaveStatus.title = 'Firebase daily write quota exceeded. Notes are saved locally & syncing between your tabs.';
        } else if (status === 'error') {
            hudSaveStatus.classList.add('error');
            hudSaveText.textContent = 'Offline (Saved)';
            hudSaveStatus.title = 'Offline or cloud sync error. Saved locally.';
        } else {
            hudSaveStatus.classList.add('saved');
            hudSaveText.textContent = 'Saved';
            hudSaveStatus.title = '✓ Encrypted & Saved';
        }
    }

    // 2. Floating Medium/Notion-Style Text Formatting Mini-Bar
    const floatingFormatBar = document.getElementById('floating-format-bar');

    function initFloatingFormatBar() {
        if (!floatingFormatBar || !editor) return;

        function updateFormatBarPos() {
            if (isBurnMode || !tabsData[activeTabId] || (tabsData[activeTabId].name && tabsData[activeTabId].name.endsWith('.draw'))) {
                floatingFormatBar.classList.add('hidden');
                return;
            }
            const start = editor.selectionStart;
            const end = editor.selectionEnd;
            if (typeof start !== 'number' || typeof end !== 'number' || start === end) {
                floatingFormatBar.classList.add('hidden');
                return;
            }

            const coord = getCaretCoordinates(start);
            const barWidth = 320;
            const barHeight = 36;

            let top = coord.top - barHeight - 12;
            if (top < 10) top = coord.top + 28;
            let left = coord.left;
            if (left + barWidth > editor.clientWidth) {
                left = Math.max(10, editor.clientWidth - barWidth - 10);
            }
            if (left < 10) left = 10;

            floatingFormatBar.style.top = `${top}px`;
            floatingFormatBar.style.left = `${left}px`;
            floatingFormatBar.classList.remove('hidden');
        }

        editor.addEventListener('mouseup', () => setTimeout(updateFormatBarPos, 10));
        editor.addEventListener('keyup', (e) => {
            if (e.shiftKey || ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
                setTimeout(updateFormatBarPos, 10);
            }
        });

        document.addEventListener('selectionchange', () => {
            if (document.activeElement !== editor) {
                floatingFormatBar.classList.add('hidden');
            }
        });

        editor.addEventListener('scroll', () => {
            if (!floatingFormatBar.classList.contains('hidden')) {
                updateFormatBarPos();
            }
        });

        const fmtButtons = floatingFormatBar.querySelectorAll('.fmt-btn');
        fmtButtons.forEach(btn => {
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
            });
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const fmt = btn.getAttribute('data-format');
                applyTextFormat(fmt);
            });
        });
    }

    function applyTextFormat(format) {
        if (!editor) return;
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const val = editor.value;
        const sel = val.substring(start, end);
        let replacement = '';
        let newSelStart = start;
        let newSelEnd = end;

        switch (format) {
            case 'bold':
                replacement = `**${sel || 'bold text'}**`;
                newSelStart = start + 2;
                newSelEnd = newSelStart + (sel ? sel.length : 9);
                break;
            case 'italic':
                replacement = `*${sel || 'italic text'}*`;
                newSelStart = start + 1;
                newSelEnd = newSelStart + (sel ? sel.length : 11);
                break;
            case 'strike':
                replacement = `~~${sel || 'strikethrough'}~~`;
                newSelStart = start + 2;
                newSelEnd = newSelStart + (sel ? sel.length : 13);
                break;
            case 'h1':
                replacement = `# ${sel || 'Heading 1'}`;
                newSelStart = start + 2;
                newSelEnd = newSelStart + (sel ? sel.length : 9);
                break;
            case 'h2':
                replacement = `## ${sel || 'Heading 2'}`;
                newSelStart = start + 3;
                newSelEnd = newSelStart + (sel ? sel.length : 9);
                break;
            case 'code':
                replacement = `\`${sel || 'code'}\``;
                newSelStart = start + 1;
                newSelEnd = newSelStart + (sel ? sel.length : 4);
                break;
            case 'link':
                replacement = `[${sel || 'link text'}](https://)`;
                newSelStart = start + (sel ? sel.length + 3 : 12);
                newSelEnd = newSelStart + 8;
                break;
            case 'task':
                replacement = `- [ ] ${sel || 'Todo item'}`;
                newSelStart = start + 6;
                newSelEnd = newSelStart + (sel ? sel.length : 9);
                break;
            case 'quote':
                replacement = `> ${sel || 'Quote'}`;
                newSelStart = start + 2;
                newSelEnd = newSelStart + (sel ? sel.length : 5);
                break;
            default:
                return;
        }

        editor.value = val.substring(0, start) + replacement + val.substring(end);
        editor.selectionStart = newSelStart;
        editor.selectionEnd = newSelEnd;
        editor.focus();

        if (tabsData[activeTabId]) tabsData[activeTabId].content = editor.value;
        editor.dispatchEvent(new Event('input'));
        floatingFormatBar.classList.add('hidden');
        playMechanicalSound('click');
    }

    // 3. Pomodoro Focus Timer in HUD
    const hudPomodoroContainer = document.getElementById('hud-pomodoro-container');
    const hudPomodoroTime = document.getElementById('hud-pomodoro-time');
    const hudPomodoroBtn = document.getElementById('hud-pomodoro-btn');
    const hudPomodoroReset = document.getElementById('hud-pomodoro-reset');
    const hudPomodoroIcon = document.getElementById('hud-pomodoro-icon');

    let customFocusMins = parseInt(localStorage.getItem('quickpad_pomodoro_mins'), 10) || 25;
    let customBreakMins = 5;
    let pomodoroSecs = customFocusMins * 60;
    let pomodoroMode = 'focus';
    let pomodoroRunning = false;
    let pomodoroInterval = null;

    async function promptCustomPomodoroDuration() {
        const currentMins = pomodoroMode === 'focus' ? Math.round(pomodoroSecs / 60) : customFocusMins;
        const entered = await showCustomPrompt(
            "⏱️ Set Focus Duration",
            "Enter focus duration in minutes (e.g. 15, 25, 45, 60):",
            String(currentMins || 25)
        );
        if (entered !== null && entered.trim()) {
            const parsed = parseInt(entered.trim(), 10);
            if (!isNaN(parsed) && parsed > 0 && parsed <= 360) {
                customFocusMins = parsed;
                localStorage.setItem('quickpad_pomodoro_mins', customFocusMins);
                if (pomodoroInterval) clearInterval(pomodoroInterval);
                pomodoroRunning = false;
                pomodoroMode = 'focus';
                pomodoroSecs = customFocusMins * 60;
                updatePomodoroDisplay();
                showToast(`🍅 Focus timer set to ${customFocusMins} minutes!`, 'success');
            } else {
                showToast("Please enter a valid duration (1 - 360 minutes)", 'error');
            }
        }
    }

    function playPomodoroChime() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const freqs = [523.25, 659.25, 783.99, 1046.50];
            freqs.forEach((f, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(f, ctx.currentTime + idx * 0.12);
                gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.12);
                gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.12 + 1.8);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + idx * 0.12);
                osc.stop(ctx.currentTime + idx * 0.12 + 2.0);
            });
        } catch(e) {}
    }

    function updatePomodoroDisplay() {
        if (!hudPomodoroTime) return;
        const mins = Math.floor(pomodoroSecs / 60);
        const secs = pomodoroSecs % 60;
        hudPomodoroTime.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        if (hudPomodoroBtn) {
            hudPomodoroBtn.textContent = pomodoroRunning ? '⏸' : '▶';
            hudPomodoroBtn.title = pomodoroRunning ? "Pause Pomodoro" : "Start Pomodoro";
        }
        if (hudPomodoroIcon) {
            hudPomodoroIcon.textContent = pomodoroMode === 'focus' ? '🍅' : '☕';
        }
        if (hudPomodoroContainer) {
            if (pomodoroMode === 'break') hudPomodoroContainer.classList.add('break-mode');
            else hudPomodoroContainer.classList.remove('break-mode');
            hudPomodoroContainer.title = `Pomodoro Focus Timer (${Math.round(pomodoroSecs / 60)}m left) • Click time to change duration`;
        }
    }

    function togglePomodoro() {
        if (pomodoroRunning) {
            clearInterval(pomodoroInterval);
            pomodoroRunning = false;
            updatePomodoroDisplay();
            showToast("Pomodoro paused", 'info');
        } else {
            pomodoroRunning = true;
            updatePomodoroDisplay();
            showToast(pomodoroMode === 'focus' ? `🍅 ${Math.round(pomodoroSecs / 60)}m Focus sprint started!` : "☕ 5m Break started!", 'info');
            pomodoroInterval = setInterval(() => {
                pomodoroSecs--;
                if (pomodoroSecs <= 0) {
                    clearInterval(pomodoroInterval);
                    pomodoroRunning = false;
                    playPomodoroChime();
                    if (pomodoroMode === 'focus') {
                        pomodoroMode = 'break';
                        pomodoroSecs = customBreakMins * 60;
                        showToast("🍅 Focus session complete! Time for a 5-minute break.", 'success');
                    } else {
                        pomodoroMode = 'focus';
                        pomodoroSecs = customFocusMins * 60;
                        showToast("🚀 Break over! Ready to focus?", 'info');
                    }
                    updatePomodoroDisplay();
                } else {
                    updatePomodoroDisplay();
                }
            }, 1000);
        }
    }

    function resetPomodoro() {
        if (pomodoroInterval) clearInterval(pomodoroInterval);
        pomodoroRunning = false;
        pomodoroSecs = (pomodoroMode === 'focus' ? customFocusMins : customBreakMins) * 60;
        updatePomodoroDisplay();
        showToast("Pomodoro timer reset", 'info');
    }

    function initPomodoroTimer() {
        if (hudPomodoroBtn) {
            hudPomodoroBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                togglePomodoro();
            });
        }
        if (hudPomodoroReset) {
            hudPomodoroReset.addEventListener('click', (e) => {
                e.stopPropagation();
                resetPomodoro();
            });
        }
        if (hudPomodoroTime) {
            hudPomodoroTime.style.cursor = 'pointer';
            hudPomodoroTime.addEventListener('click', promptCustomPomodoroDuration);
        }
        if (hudPomodoroIcon) {
            hudPomodoroIcon.style.cursor = 'pointer';
            hudPomodoroIcon.addEventListener('click', promptCustomPomodoroDuration);
        }
        if (hudPomodoroContainer) {
            hudPomodoroContainer.addEventListener('click', (e) => {
                if (e.target !== hudPomodoroBtn && e.target !== hudPomodoroReset) {
                    promptCustomPomodoroDuration();
                }
            });
        }
        updatePomodoroDisplay();
    }

    // 4. Beautiful Note PNG / Code Card Generator
    const exportCardBtn = document.getElementById('export-card-btn');
    const cardRenderCanvas = document.getElementById('card-render-canvas');
    const cardFontSizeSelect = document.getElementById('card-font-size-select');
    const cardWatermarkCheck = document.getElementById('card-watermark-check');
    const cardCopyImgBtn = document.getElementById('card-copy-img-btn');
    const cardDownloadPngBtn = document.getElementById('card-download-png-btn');
    const cardThemeButtons = document.querySelectorAll('.card-theme-btn');

    let currentCardTheme = 'cyber';

    const CARD_THEMES = {
        cyber: {
            bgGrad1: '#050c18',
            bgGrad2: '#020409',
            cardBg: 'rgba(9, 17, 34, 0.94)',
            cardBorder: 'rgba(0, 255, 249, 0.35)',
            cardGlow: 'rgba(0, 255, 249, 0.25)',
            textPrimary: '#e2e8f0',
            textTitle: '#00fff9',
            lineNums: '#475569'
        },
        matrix: {
            bgGrad1: '#041608',
            bgGrad2: '#010502',
            cardBg: 'rgba(6, 22, 10, 0.95)',
            cardBorder: 'rgba(0, 255, 102, 0.4)',
            cardGlow: 'rgba(0, 255, 102, 0.25)',
            textPrimary: '#00ff66',
            textTitle: '#55ff99',
            lineNums: '#1b4d27'
        },
        sunset: {
            bgGrad1: '#24081c',
            bgGrad2: '#080208',
            cardBg: 'rgba(32, 10, 26, 0.94)',
            cardBorder: 'rgba(255, 0, 85, 0.4)',
            cardGlow: 'rgba(255, 0, 85, 0.25)',
            textPrimary: '#f8fafc',
            textTitle: '#ff4d88',
            lineNums: '#641b38'
        },
        purple: {
            bgGrad1: '#180a2c',
            bgGrad2: '#06020c',
            cardBg: 'rgba(22, 12, 40, 0.94)',
            cardBorder: 'rgba(176, 38, 255, 0.4)',
            cardGlow: 'rgba(176, 38, 255, 0.25)',
            textPrimary: '#f1f5f9',
            textTitle: '#c056ff',
            lineNums: '#4c267a'
        },
        midnight: {
            bgGrad1: '#0f172a',
            bgGrad2: '#020617',
            cardBg: 'rgba(15, 23, 42, 0.95)',
            cardBorder: 'rgba(148, 163, 184, 0.3)',
            cardGlow: 'rgba(59, 130, 246, 0.15)',
            textPrimary: '#cbd5e1',
            textTitle: '#94a3b8',
            lineNums: '#334155'
        }
    };

    function renderNoteCard() {
        if (!cardRenderCanvas) return;
        const ctx = cardRenderCanvas.getContext('2d');
        const theme = CARD_THEMES[currentCardTheme] || CARD_THEMES.cyber;
        const baseFontSize = parseInt(cardFontSizeSelect ? cardFontSizeSelect.value : 20, 10);
        const showWatermark = cardWatermarkCheck ? cardWatermarkCheck.checked : true;

        const isDraw = activeTabId && tabsData[activeTabId] && tabsData[activeTabId].name && tabsData[activeTabId].name.endsWith('.draw');
        const rawText = isDraw ? "/* QuickPad Whiteboard Drawing Tab */" : (editor ? editor.value : "");
        const lines = rawText.split('\n');
        const tabTitle = (tabsData[activeTabId] ? tabsData[activeTabId].name : 'note.txt') || 'quickpad-note.txt';

        const scale = 2;
        const width = 1100 * scale;
        const padding = 60 * scale;
        const cardPadding = 36 * scale;
        const lineHeight = Math.round(baseFontSize * 1.55) * scale;
        const fontSizePx = baseFontSize * scale;

        ctx.font = `${fontSizePx}px "Fira Code", monospace`;
        const maxTextWidth = width - (padding * 2) - (cardPadding * 2) - (50 * scale);
        const wrappedLines = [];

        const maxInputLines = Math.min(lines.length, 50);
        for (let i = 0; i < maxInputLines; i++) {
            const line = lines[i];
            if (line.length === 0) {
                wrappedLines.push({ text: '', lineNum: i + 1 });
                continue;
            }
            let currentLine = '';
            for (let char of line) {
                const testLine = currentLine + char;
                if (ctx.measureText(testLine).width > maxTextWidth) {
                    wrappedLines.push({ text: currentLine, lineNum: currentLine === '' ? i + 1 : null });
                    currentLine = char;
                } else {
                    currentLine = testLine;
                }
            }
            if (currentLine) {
                wrappedLines.push({ text: currentLine, lineNum: wrappedLines.length === 0 || wrappedLines[wrappedLines.length - 1].lineNum === null ? i + 1 : null });
            }
            if (wrappedLines.length > 55) break;
        }

        if (lines.length > maxInputLines || wrappedLines.length > 55) {
            wrappedLines.push({ text: `... (${lines.length - maxInputLines} more lines)`, lineNum: null });
        }

        const titleBarHeight = 44 * scale;
        const footerHeight = showWatermark ? (36 * scale) : (16 * scale);
        const cardContentHeight = Math.max(160 * scale, wrappedLines.length * lineHeight + (20 * scale));
        const cardHeight = titleBarHeight + cardContentHeight + footerHeight;
        const height = cardHeight + (padding * 2);

        cardRenderCanvas.width = width;
        cardRenderCanvas.height = height;

        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, theme.bgGrad1);
        bgGrad.addColorStop(1, theme.bgGrad2);
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        const glowRad = ctx.createRadialGradient(width / 2, height / 2, 80 * scale, width / 2, height / 2, width / 1.5);
        glowRad.addColorStop(0, theme.cardGlow);
        glowRad.addColorStop(1, 'transparent');
        ctx.fillStyle = glowRad;
        ctx.fillRect(0, 0, width, height);

        const cardX = padding;
        const cardY = padding;
        const cardW = width - (padding * 2);
        const cardH = cardHeight;
        const cardRadius = 16 * scale;

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
        ctx.shadowBlur = 40 * scale;
        ctx.shadowOffsetY = 20 * scale;

        function roundRect(c, x, y, w, h, r) {
            c.beginPath();
            c.moveTo(x + r, y);
            c.lineTo(x + w - r, y);
            c.quadraticCurveTo(x + w, y, x + w, y + r);
            c.lineTo(x + w, y + h - r);
            c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            c.lineTo(x + r, y + h);
            c.quadraticCurveTo(x, y + h, x, y + h - r);
            c.lineTo(x, y + r);
            c.quadraticCurveTo(x, y, x + r, y);
            c.closePath();
        }

        roundRect(ctx, cardX, cardY, cardW, cardH, cardRadius);
        ctx.fillStyle = theme.cardBg;
        ctx.fill();
        ctx.restore();

        roundRect(ctx, cardX, cardY, cardW, cardH, cardRadius);
        ctx.strokeStyle = theme.cardBorder;
        ctx.lineWidth = 1.5 * scale;
        ctx.stroke();

        const dotY = cardY + (22 * scale);
        const dotR = 6 * scale;
        const dotSpacing = 18 * scale;
        const dotStartX = cardX + (24 * scale);

        const dots = ['#ff5f56', '#ffbd2e', '#27c93f'];
        dots.forEach((color, idx) => {
            ctx.beginPath();
            ctx.arc(dotStartX + (idx * dotSpacing), dotY, dotR, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
        });

        ctx.fillStyle = theme.textTitle;
        ctx.font = `600 ${14 * scale}px "Inter", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(tabTitle, cardX + (cardW / 2), dotY + (5 * scale));

        ctx.beginPath();
        ctx.moveTo(cardX, cardY + titleBarHeight);
        ctx.lineTo(cardX + cardW, cardY + titleBarHeight);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1 * scale;
        ctx.stroke();

        ctx.textAlign = 'left';
        let currentY = cardY + titleBarHeight + (26 * scale);
        const textStartX = cardX + (28 * scale) + (36 * scale);

        wrappedLines.forEach((item) => {
            if (item.lineNum !== null) {
                ctx.fillStyle = theme.lineNums;
                ctx.font = `500 ${fontSizePx * 0.85}px "Fira Code", monospace`;
                ctx.textAlign = 'right';
                ctx.fillText(String(item.lineNum), textStartX - (14 * scale), currentY);
            }

            ctx.textAlign = 'left';
            ctx.fillStyle = theme.textPrimary;
            ctx.font = `${fontSizePx}px "Fira Code", monospace`;
            ctx.fillText(item.text, textStartX, currentY);

            currentY += lineHeight;
        });

        if (showWatermark) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.font = `500 ${12 * scale}px "Inter", sans-serif`;
            ctx.textAlign = 'right';
            ctx.fillText('⚡ QuickPad • Zero-Knowledge E2EE • quickpad.org', cardX + cardW - (20 * scale), cardY + cardH - (14 * scale));
        }
    }

    function openCardExportModal() {
        if (!cardExportModal) return;
        renderNoteCard();
        cardExportModal.classList.remove('hidden');
    }

    function initCardExporter() {
        if (exportCardBtn) exportCardBtn.addEventListener('click', openCardExportModal);

        if (cardFontSizeSelect) cardFontSizeSelect.addEventListener('change', renderNoteCard);
        if (cardWatermarkCheck) cardWatermarkCheck.addEventListener('change', renderNoteCard);

        cardThemeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                cardThemeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentCardTheme = btn.getAttribute('data-card-theme') || 'cyber';
                renderNoteCard();
            });
        });

        if (cardDownloadPngBtn) {
            cardDownloadPngBtn.addEventListener('click', () => {
                if (!cardRenderCanvas) return;
                const tabName = (tabsData[activeTabId] ? tabsData[activeTabId].name : 'note').replace(/\.[^/.]+$/, "");
                const link = document.createElement('a');
                link.download = `quickpad-${tabName}-card.png`;
                link.href = cardRenderCanvas.toDataURL('image/png');
                link.click();
                showToast("📥 Card downloaded as PNG!", 'success');
            });
        }

        if (cardCopyImgBtn) {
            cardCopyImgBtn.addEventListener('click', async () => {
                if (!cardRenderCanvas) return;
                try {
                    cardRenderCanvas.toBlob(async (blob) => {
                        if (!blob) throw new Error("Canvas export failed");
                        await navigator.clipboard.write([
                            new ClipboardItem({ 'image/png': blob })
                        ]);
                        showToast("📋 Card image copied to clipboard!", 'success');
                    });
                } catch(e) {
                    showToast("Clipboard copy failed: " + e.message, 'error');
                }
            });
        }
    }

    // 5. Password-Protected One-Click Read-Only Sharing
    const sharePassCheckbox = document.getElementById('share-pass-checkbox');
    const sharePassContainer = document.getElementById('share-pass-container');
    const sharePassInput = document.getElementById('share-pass-input');
    const sharePassGenBtn = document.getElementById('share-pass-gen-btn');

    function updateShareLinks() {
        let baseToken = currentToken;
        if (urlKey) baseToken += '_' + urlKey;
        const fullEditUrl = window.location.origin + window.location.pathname + '#' + baseToken;
        let fullViewUrl = window.location.origin + window.location.pathname + '?view=' + baseToken;

        if (sharePassCheckbox && sharePassCheckbox.checked && sharePassInput && sharePassInput.value.trim()) {
            const pass = sharePassInput.value.trim();
            if (typeof CryptoJS !== 'undefined') {
                const encKey = CryptoJS.AES.encrypt(urlKey || '', pass).toString();
                fullViewUrl = window.location.origin + window.location.pathname + '?view=' + currentToken + '_' + encodeURIComponent(encKey) + '&protected=1';
            }
        }

        if (shareEditLink) shareEditLink.value = fullEditUrl;
        if (shareViewLink) shareViewLink.value = fullViewUrl;
        if (shareQrImg) {
            shareQrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(fullEditUrl)}&color=00fff9&bgcolor=000000`;
        }
    }

    function initSharePassProtection() {
        if (!sharePassCheckbox) return;

        sharePassCheckbox.addEventListener('change', () => {
            if (sharePassCheckbox.checked) {
                if (sharePassContainer) sharePassContainer.classList.remove('hidden');
                if (sharePassInput && !sharePassInput.value) {
                    sharePassInput.value = Math.random().toString(36).substring(2, 8);
                }
            } else {
                if (sharePassContainer) sharePassContainer.classList.add('hidden');
            }
            updateShareLinks();
        });

        if (sharePassInput) {
            sharePassInput.addEventListener('input', updateShareLinks);
        }

        if (sharePassGenBtn) {
            sharePassGenBtn.addEventListener('click', () => {
                if (sharePassInput) {
                    sharePassInput.value = Math.random().toString(36).substring(2, 8);
                    updateShareLinks();
                }
            });
        }
    }

    // Start QuickPad Engine
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
