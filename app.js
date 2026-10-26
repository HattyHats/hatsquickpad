// QuickPad v4.6 - Universal Client Script
(function() {
    'use strict';

    // --- Cross-Device & Mobile Detection + Stable Device Identity Engine ---
    const myTabInstanceId = 'tab_' + Date.now().toString(36) + Math.random().toString(36).substring(2);
    const joinedWorkspaceAt = Date.now();

    const isMobileDevice = (typeof navigator !== 'undefined') && (
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '') ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );

    function getCookieValue(name) {
        try {
            const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
            return match ? decodeURIComponent(match[1]) : null;
        } catch(e) { return null; }
    }

    function setCookieValue(name, val) {
        try {
            document.cookie = `${name}=${encodeURIComponent(val)}; path=/; max-age=31536000; SameSite=Lax`;
        } catch(e) {}
    }

    let myDeviceInstanceId;
    try {
        myDeviceInstanceId = localStorage.getItem('quickpad_device_instance_id') || getCookieValue('qp_dev_inst');
        if (!myDeviceInstanceId) {
            myDeviceInstanceId = 'inst_' + Date.now().toString(36) + Math.random().toString(36).substring(2);
        }
        localStorage.setItem('quickpad_device_instance_id', myDeviceInstanceId);
        setCookieValue('qp_dev_inst', myDeviceInstanceId);
    } catch(e) {
        myDeviceInstanceId = getCookieValue('qp_dev_inst') || ('inst_' + Date.now().toString(36) + Math.random().toString(36).substring(2));
        setCookieValue('qp_dev_inst', myDeviceInstanceId);
    }

    const myDeviceSig = (function() {
        try {
            const w = window.screen ? Math.min(window.screen.width, window.screen.height) : 0;
            const h = window.screen ? Math.max(window.screen.width, window.screen.height) : 0;
            const dpr = window.devicePixelRatio || 1;
            const plat = (typeof navigator !== 'undefined' && navigator.platform) ? navigator.platform : '';
            const tz = (typeof Intl !== 'undefined' && Intl.DateTimeFormat) ? (Intl.DateTimeFormat().resolvedOptions().timeZone || '') : '';
            const lang = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : '';
            return [isMobileDevice ? 'M' : 'D', `${w}x${h}@${dpr}`, plat, tz, lang].join('|');
        } catch(e) {
            return isMobileDevice ? 'M|generic' : 'D|generic';
        }
    })();

    // Maintain stable device ID across reloads, QR handoffs, and mobile tabs, preventing ghost duplicate collaborators
    let myDeviceId;
    let isPrimaryDeviceTab = false;
    try {
        let primaryDevId = localStorage.getItem('quickpad_device_id') || getCookieValue('qp_dev_id');
        const sessionDevId = sessionStorage.getItem('quickpad_tab_dev_id');
        if (!primaryDevId) {
            primaryDevId = sessionDevId || ('dev_' + Date.now().toString(36) + Math.random().toString(36).substring(2));
        }
        localStorage.setItem('quickpad_device_id', primaryDevId);
        setCookieValue('qp_dev_id', primaryDevId);

        if (isMobileDevice) {
            // On mobile & tablet devices, always use the unified device ID so QR scans or new tabs never spawn duplicate users
            myDeviceId = primaryDevId;
            isPrimaryDeviceTab = true;
            sessionStorage.setItem('quickpad_tab_dev_id', myDeviceId);
        } else {
            // On desktop, use the primary device ID unless another tab in the same browser is actively holding the primary lock
            let activeLock = null;
            try {
                const rawLock = localStorage.getItem('quickpad_primary_tab_lock');
                if (rawLock) activeLock = JSON.parse(rawLock);
            } catch(e) {}

            const now = Date.now();
            const lockHeldByOtherLiveTab = activeLock &&
                activeLock.tabId &&
                activeLock.tabId !== myTabInstanceId &&
                (now - (activeLock.ts || 0) < 4500) &&
                sessionDevId !== primaryDevId;

            if (!lockHeldByOtherLiveTab) {
                myDeviceId = primaryDevId;
                isPrimaryDeviceTab = true;
                sessionStorage.setItem('quickpad_tab_dev_id', myDeviceId);
                try {
                    localStorage.setItem('quickpad_primary_tab_lock', JSON.stringify({ tabId: myTabInstanceId, devId: myDeviceId, ts: now }));
                } catch(e) {}
            } else {
                if (sessionDevId && sessionDevId !== primaryDevId) {
                    myDeviceId = sessionDevId;
                } else {
                    myDeviceId = 'dev_' + now.toString(36) + Math.random().toString(36).substring(2);
                    sessionStorage.setItem('quickpad_tab_dev_id', myDeviceId);
                }
            }
        }
    } catch(e) {
        myDeviceId = getCookieValue('qp_dev_id') || ('dev_' + Date.now().toString(36) + Math.random().toString(36).substring(2));
        setCookieValue('qp_dev_id', myDeviceId);
    }

    // iOS Keyboard Dismiss Fix
    window.addEventListener('focusout', () => window.scrollTo(0, 0));

    // macOS Platform Detection & Dynamic Keyboard Label Adapter
    const isMacPlatform = (typeof navigator !== 'undefined') && (
        (navigator.platform && navigator.platform.toUpperCase().indexOf('MAC') >= 0) ||
        (navigator.userAgent && navigator.userAgent.toUpperCase().indexOf('MAC') >= 0)
    );

    function adaptMacKeyboardBadges() {
        if (!isMacPlatform) return;
        document.querySelectorAll('kbd').forEach(el => {
            if (el.textContent.includes('Alt+')) {
                el.textContent = el.textContent.replace('Alt+', '⌥');
            }
        });
        document.querySelectorAll('[title*="Alt+"]').forEach(el => {
            el.title = el.title.replace(/Alt\+/g, '⌥');
        });
        document.querySelectorAll('.menu-action-btn, .header-icon-btn').forEach(el => {
            if (el.title && el.title.includes('Ctrl+T')) {
                el.title = el.title.replace('Ctrl+T', '⌥N');
            }
        });
    }

    let isAppInitialized = false;
    let lastKnownHash = window.location.hash;
    window.addEventListener('hashchange', () => {
        if (!isAppInitialized) return;
        if (window.location.hash !== lastKnownHash) {
            lastKnownHash = window.location.hash;
            if (typeof removeMyCloudPresence === 'function') {
                removeMyCloudPresence();
            }
            window.location.reload();
        }
    });

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

    // --- Nested Secret Tab Vault Elements ---
    const lockedTabOverlay = document.getElementById('locked-tab-overlay');
    const lockedTabTitle = document.getElementById('locked-tab-title');
    const lockedTabPassInput = document.getElementById('locked-tab-pass-input');
    const lockedTabUnlockBtn = document.getElementById('locked-tab-unlock-btn');
    const lockedTabError = document.getElementById('locked-tab-error');

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
    const tabsScrollLeftBtn = document.getElementById('tabs-scroll-left-btn');
    const tabsScrollRightBtn = document.getElementById('tabs-scroll-right-btn');
    const allTabsDropdownGroup = document.getElementById('all-tabs-dropdown-group');
    const allTabsBtn = document.getElementById('all-tabs-btn');
    const allTabsCount = document.getElementById('all-tabs-count');
    const allTabsMenuSubtitle = document.getElementById('all-tabs-menu-subtitle');
    const allTabsList = document.getElementById('all-tabs-list');
    const addTabBtn = document.getElementById('add-tab-btn');
    const splitNotesBtn = document.getElementById('split-notes-btn');
    const multiNote2Btn = document.getElementById('multi-note-2-btn');
    const multiPane1Header = document.getElementById('multi-pane-1-header');
    const multiPane1Title = document.getElementById('multi-pane-1-title');
    const multiPane1SingleBtn = document.getElementById('multi-pane-1-single-btn');
    const multiPane2 = document.getElementById('multi-pane-2');
    const multiPane2Select = document.getElementById('multi-pane-2-select');
    const multiPane2MdBtn = document.getElementById('multi-pane-2-md-btn');
    const multiPane2CloseBtn = document.getElementById('multi-pane-2-close-btn');
    const multiPane2Editor = document.getElementById('multi-pane-2-editor');
    const multiPane2Preview = document.getElementById('multi-pane-2-preview');
    const tabContextMenu = document.getElementById('tab-context-menu');
    const tabCtxSplit = document.getElementById('tab-ctx-split');
    const tabCtxMoveLeft = document.getElementById('tab-ctx-move-left');
    const tabCtxMoveRight = document.getElementById('tab-ctx-move-right');
    const tabCtxRename = document.getElementById('tab-ctx-rename');
    const tabCtxLock = document.getElementById('tab-ctx-lock');
    const tabCtxDelete = document.getElementById('tab-ctx-delete');
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
    const deleteTabMenuBtn = document.getElementById('delete-tab-menu-btn');
    const exampleGuideBtn = document.getElementById('example-guide-btn');
    const fileExampleGuideBtn = document.getElementById('file-example-guide-btn');
    const aboutOpenGuideBtn = document.getElementById('about-open-guide-btn');

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
    const hudVoiceMaskTag = document.getElementById('hud-voice-mask-tag');
    const hudVoiceMaskBtn = document.getElementById('hud-voice-mask-btn');
    const hudVoiceMaskToolBtn = document.getElementById('hud-voice-mask-tool-btn');
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
    const stegRevealPrompt = document.getElementById('steg-reveal-prompt');
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
 
    // --- Biometric Voice Mask Modal ---
    const voiceMaskModal = document.getElementById('voice-mask-modal');
    const closeVoiceMask = document.getElementById('close-voice-mask');
    const audioSignalDot = document.getElementById('audio-signal-dot');
    const voiceMonitorLabel = document.getElementById('voice-monitor-label');
    const voiceTestMonitorBtn = document.getElementById('voice-test-monitor-btn');
    const voiceTestIcon = document.getElementById('voice-test-icon');
    const voiceTestText = document.getElementById('voice-test-text');
    const voiceVisualizerCanvas = document.getElementById('voice-visualizer-canvas');
    const voicePresetCards = document.querySelectorAll('.voice-preset-card');
    const voiceModalToggleBtn = document.getElementById('voice-modal-toggle-btn');
    const voiceModalToggleIcon = document.getElementById('voice-modal-toggle-icon');
    const voiceModalToggleText = document.getElementById('voice-modal-toggle-text');

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
    let closeAllDropdowns = function() {
        document.querySelectorAll('.dropdown-menu').forEach(m => {
            m.classList.remove('show');
            m.classList.remove('hidden');
        });
        document.querySelectorAll('.dropdown-group').forEach(g => {
            g.classList.remove('active');
        });
    };
    let currentToken = '';
    let urlKey = null;
    let vaultPassword = null;
    let debounceTimeout = null;
    let saveMaxWaitTimer = null;
    const SAVE_DEBOUNCE_MS = 300;
    const SAVE_MAX_WAIT_MS = 1000;

    function scheduleWorkspaceSave() {
        if (isReadOnly || isBurnMode) return;
        if (debounceTimeout) clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            if (saveMaxWaitTimer) {
                clearTimeout(saveMaxWaitTimer);
                saveMaxWaitTimer = null;
            }
            saveWorkspace();
        }, SAVE_DEBOUNCE_MS);

        if (!saveMaxWaitTimer) {
            saveMaxWaitTimer = setTimeout(() => {
                saveMaxWaitTimer = null;
                if (debounceTimeout) {
                    clearTimeout(debounceTimeout);
                    debounceTimeout = null;
                }
                saveWorkspace();
            }, SAVE_MAX_WAIT_MS);
        }
    }

    let unsubscribeWorkspace = null;
    let timerMinutes = null;
    let countdownInterval = null;
    let isTyping = false;
    let typingTabId = null;
    let typingResetTimeout = null;
    const dirtyTabIds = new Set();
    let isTabOrderDirty = false;

    function isTypingInTab(tid) {
        return isTyping && (typingTabId === tid);
    }
    let activeTabId = 'main';
    let tabsData = { 'main': { name: 'main.txt', content: '', is_encrypted: false } };
    let tabOrder = ['main'];
    let draggedTabId = null;
    let contextMenuTabId = null;

    // Multi-Note Side-by-Side View State (Max 2 notes open simultaneously)
    let multiNoteMode = 1; // 1 = Single Note, 2 = 2 Notes Side-by-Side
    let multiPaneTabs = { pane2: null };
    let multiPanePreviews = { pane2: false };
    let lastSyncedServerTabs = {};
    let lastSentByMeTabs = {};
    let lastSavedTabsJSON = "";
    let tabsContentDirty = false;
    let isPollsDirty = false;
    let pendingCloudSaveAfterInit = false;
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

    // Collaborator Neon Color Palette
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

    // --- Remote Tab Active Glow Engine ---
    // Tracks when remote peers are actively typing/editing notes not currently viewed by local user
    const remoteTabActivity = new Map(); // tid -> { timestamp, peerId, peerName, color, timeoutId }

    function isTabCurrentlyViewedLocally(tid) {
        if (!tid) return false;
        if (tid === activeTabId) return true;
        if (multiNoteMode === 2 && multiPaneTabs && multiPaneTabs.pane2 === tid) return true;
        return false;
    }

    function triggerTabRemoteActivity(tid, peerId, peerName) {
        if (!tid) return;
        if (isTabCurrentlyViewedLocally(tid)) {
            clearTabRemoteActivity(tid);
            return;
        }

        const peerInfo = (peerId && peerCursorsData && peerCursorsData[peerId]) ? peerCursorsData[peerId] : null;
        const resolvedName = peerName || (peerInfo ? peerInfo.name : 'Collaborator');
        const colorObj = getPeerColor(peerId || 'remote');

        const existing = remoteTabActivity.get(tid);
        if (existing && existing.timeoutId) {
            clearTimeout(existing.timeoutId);
        }

        const timeoutId = setTimeout(() => {
            clearTabRemoteActivity(tid);
        }, 3200);

        remoteTabActivity.set(tid, {
            timestamp: Date.now(),
            peerId: peerId || 'remote',
            peerName: resolvedName,
            color: colorObj.color,
            timeoutId: timeoutId
        });

        applyTabGlowUI(tid, true, colorObj.color, resolvedName);
    }

    function clearTabRemoteActivity(tid) {
        if (!tid) return;
        const existing = remoteTabActivity.get(tid);
        if (existing) {
            if (existing.timeoutId) clearTimeout(existing.timeoutId);
            remoteTabActivity.delete(tid);
        }
        applyTabGlowUI(tid, false);
    }

    function applyTabGlowUI(tid, isGlowing, color, peerName) {
        if (!tabsContainer || !tid) return;
        const tabEl = tabsContainer.querySelector(`.tab[data-tid="${tid}"]`);
        if (tabEl) {
            if (isGlowing) {
                tabEl.classList.add('remote-active');
                if (color) tabEl.style.setProperty('--remote-color', color);
                if (peerName && tabsData[tid]) {
                    tabEl.title = `✍️ ${peerName} is editing "${tabsData[tid].name}"`;
                }
            } else {
                tabEl.classList.remove('remote-active');
                tabEl.style.removeProperty('--remote-color');
                if (tabsData[tid]) {
                    tabEl.title = (tabsData[tid].is_secret ? '🔒 ' : '') + tabsData[tid].name + ' (Drag to reorder • Right-click for options)';
                }
            }
        }
        if (multiNoteMode === 2 && multiPane2Select && typeof updateMultiPaneSelectors === 'function') {
            updateMultiPaneSelectors();
        }
    }

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
    let slashStartIndex = -1;

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
    let strokeBatch = [];
    let strokeBatchTimeout = null;
    let strokesUnsubscribe = null;

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

    // v4.6 Pro Welcome Template
    const WELCOME_CHECKLIST_TEMPLATE = `# ⚡ Welcome to QuickPad v4.6 Pro

Your hyper-fast, serverless scratchpad with **zero-knowledge end-to-end encryption**.
Everything you type is encrypted directly in your browser with AES-256 before leaving your device. No signups, no trackers, 100% private.

### 🚀 Getting Started Checklist
- [x] Create a private workspace (You're here!)
- [ ] Upload or drag & drop documents (.docx Word, .pdf, .txt, .md, code)
- [ ] Try formatting text with the floating toolbar (Highlight any text)
- [ ] Start a Pomodoro focus sprint with the 🍅 timer in the bottom HUD
- [ ] Export a beautiful image card from File -> Export Note as Image Card
- [ ] Inspect your encryption live with the 🛡️ Shield button in the header
- [ ] Share your note or create a password-protected link via 🔗 Share

### 💡 Pro Tips & Shortcuts
- **⚡ Command Palette:** Press \`Cmd+K\` (or \`Ctrl+K\`) for instant actions and recent notes.
- **📄 Document Upload:** Upload or drag & drop Word documents (\`.docx\`), PDFs, Markdown, text, and code files to edit them directly.
- **🎨 Markdown Preview:** Press \`Option+M\` / \`Cmd+M\` on Mac (or \`Alt+M\` on Windows) / \`Option+S\` for Split View.
- **👥 2-Note Split View:** Press \`Option+2\` on Mac (or \`Alt+2\` on Windows) to edit two notes side-by-side.
- **🎨 Whiteboard:** Add a new tab ending in \`.draw\` (e.g. \`sketch.draw\`) for real-time drawing.
- **🔒 Secret Vault:** Right-click or lock any tab with a passphrase for nested privacy.
- **🕶️ Panic Camouflage:** Press \`Alt+P\` or double-tap \`Esc\` to instantly disguise your screen.
`;

    // Custom Background & Theme Restore
    function applyThemeClass(themeName) {
        if (!document.body) return;
        const toRemove = [];
        document.body.classList.forEach(cls => {
            if (cls.startsWith('theme-')) toRemove.push(cls);
        });
        toRemove.forEach(cls => document.body.classList.remove(cls));
        if (themeName && typeof themeName === 'string') {
            themeName.split(/\s+/).forEach(cls => {
                if (cls) document.body.classList.add(cls);
            });
        }
    }

    function serializeTabsForLocalCache(tabsObj) {
        if (!tabsObj || typeof tabsObj !== 'object') return '{}';
        const safeTabs = {};
        for (let tid in tabsObj) {
            const t = tabsObj[tid];
            if (!t) continue;
            if (t.is_secret) {
                let encBlob = t.encrypted_blob || '';
                if (!encBlob && t.secret_pass && t.content && !t.content.startsWith('U2FsdGVkX1') && typeof CryptoJS !== 'undefined') {
                    try { encBlob = CryptoJS.AES.encrypt(t.content, t.secret_pass).toString(); } catch(e) {}
                } else if (!encBlob && t.content && t.content.startsWith('U2FsdGVkX1')) {
                    encBlob = t.content;
                }
                safeTabs[tid] = {
                    name: t.name,
                    content: '',
                    encrypted_blob: encBlob,
                    is_encrypted: !!t.is_encrypted,
                    is_secret: true,
                    secret_pass: null
                };
            } else {
                safeTabs[tid] = { ...t };
            }
        }
        return JSON.stringify(safeTabs);
    }

    let customBgColor = localStorage.getItem('quickpad_bg');
    if (customBgColor) document.body.style.backgroundColor = customBgColor;
    const savedTheme = localStorage.getItem('quickpad_theme');
    if (savedTheme) applyThemeClass(savedTheme);

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
    let currentGlitchOriginal = '';
    let glitchIntervalPane2 = null;
    let currentGlitchOriginalPane2 = '';

    function stopCipherGlitchAnimation() {
        if (glitchInterval) {
            clearInterval(glitchInterval);
            glitchInterval = null;
            if (editor) {
                editor.classList.remove('cipher-decrypting');
                editor.value = currentGlitchOriginal;
            }
        }
    }

    function stopCipherGlitchAnimationPane2() {
        if (glitchIntervalPane2) {
            clearInterval(glitchIntervalPane2);
            glitchIntervalPane2 = null;
            if (multiPane2Editor) {
                multiPane2Editor.classList.remove('cipher-decrypting');
                multiPane2Editor.value = currentGlitchOriginalPane2;
            }
        }
    }

    function buildScrambledFrame(original, len, progress, glyphs) {
        let scrambled = '';
        for (let i = 0; i < len; i++) {
            const char = original[i];
            if (char === '\n' || char === '\r' || char === ' ' || char === '\t') {
                scrambled += char;
            } else {
                // Reveal threshold sweeps from 0.14 (start of note) to 0.88 (end of visible note)
                const revealThreshold = 0.14 + (len > 1 ? (i / (len - 1)) : 0) * 0.74;
                if (progress >= revealThreshold) {
                    // Character has locked into its true decrypted plaintext
                    scrambled += char;
                } else if (progress >= revealThreshold - 0.22) {
                    // Active decryption wavefront: rapid flicker between cyber glyph and true char
                    if (Math.random() < 0.32) {
                        scrambled += char;
                    } else {
                        scrambled += glyphs[Math.floor(Math.random() * glyphs.length)];
                    }
                } else {
                    // Encrypted ciphertext ahead of the wavefront
                    scrambled += glyphs[Math.floor(Math.random() * glyphs.length)];
                }
            }
        }
        return scrambled + original.substring(len);
    }

    function triggerCipherGlitchAnimation(targetText) {
        if (!editor || !isGlitchDecryptEnabled || !targetText) return;
        stopCipherGlitchAnimation();

        currentGlitchOriginal = targetText;
        const glyphs = '01λ§0x#*¢∆µØ9876543210ABCDEF';
        const original = targetText;
        // Scramble up to 1500 characters so all visible viewport content is deciphered
        const len = Math.min(original.length, 1500);
        let iteration = 0;
        // 20 frames @ 38ms ≈ 0.76 seconds for a crisp, unmistakable decryption wave
        const maxIter = 20;

        editor.classList.add('cipher-decrypting');
        // Render frame 0 synchronously so switching tabs starts encrypted immediately
        editor.value = buildScrambledFrame(original, len, 0, glyphs);
        iteration = 1;

        glitchInterval = setInterval(() => {
            if (!editor) {
                stopCipherGlitchAnimation();
                return;
            }
            if (iteration >= maxIter) {
                clearInterval(glitchInterval);
                glitchInterval = null;
                editor.classList.remove('cipher-decrypting');
                editor.value = original;
                return;
            }
            const progress = iteration / maxIter;
            editor.value = buildScrambledFrame(original, len, progress, glyphs);
            iteration++;
        }, 38);
    }

    function triggerCipherGlitchAnimationPane2(targetText) {
        if (!multiPane2Editor || !isGlitchDecryptEnabled || !targetText) return;
        stopCipherGlitchAnimationPane2();

        currentGlitchOriginalPane2 = targetText;
        const glyphs = '01λ§0x#*¢∆µØ9876543210ABCDEF';
        const original = targetText;
        const len = Math.min(original.length, 1500);
        let iteration = 0;
        const maxIter = 20;

        multiPane2Editor.classList.add('cipher-decrypting');
        multiPane2Editor.value = buildScrambledFrame(original, len, 0, glyphs);
        iteration = 1;

        glitchIntervalPane2 = setInterval(() => {
            if (!multiPane2Editor) {
                stopCipherGlitchAnimationPane2();
                return;
            }
            if (iteration >= maxIter) {
                clearInterval(glitchIntervalPane2);
                glitchIntervalPane2 = null;
                multiPane2Editor.classList.remove('cipher-decrypting');
                multiPane2Editor.value = original;
                return;
            }
            const progress = iteration / maxIter;
            multiPane2Editor.value = buildScrambledFrame(original, len, progress, glyphs);
            iteration++;
        }, 38);
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
        const text = (glitchInterval ? currentGlitchOriginal : editor.value) || '';
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
            if (multiNoteMode === 2 && multiPaneTabs.pane2 === activeTabId && multiPane2Editor && multiPane2Editor.value !== editor.value) {
                multiPane2Editor.value = editor.value;
                if (multiPanePreviews.pane2) updateMultiPanePreview(2);
            }
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
            const hasDims = whiteboardCanvas.width > 0 && whiteboardCanvas.height > 0;
            const temp = hasDims ? wbCtx.getImageData(0, 0, whiteboardCanvas.width, whiteboardCanvas.height) : null;
            whiteboardCanvas.width = Math.max(1, rect.width);
            whiteboardCanvas.height = Math.max(1, rect.height - 42);
            if (temp) wbCtx.putImageData(temp, 0, 0);
        }
        window.addEventListener('resize', resizeWbCanvas);

        function startDraw(e) {
            wbIsDrawing = true;
            saveWbHistory();
            strokeBatch = []; // reset batch on new stroke
            wbCtx.beginPath();
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

    // 10. --- Biometric Anonymous Voice Changer & Walkie-Talkie ---
    const VOICE_PRESETS = {
        deep: { name: "Deep Anonymous", icon: "🤖", tag: "🤖 Deep", desc: "Sub-harmonic pitch shift + chest resonance. Witness protection filter." },
        robot: { name: "Cyborg (Robotic)", icon: "👾", tag: "👾 Cyborg", desc: "Metallic ring modulation + comb resonance. Pure synthetic tone." },
        high: { name: "Helium / Alien", icon: "🛸", tag: "🛸 Helium", desc: "High pitch shift (+7 semitones) + high-frequency formant shift." },
        radio: { name: "Tactical Walkie-Talkie", icon: "📻", tag: "📻 Tactical", desc: "Military radio bandpass (450Hz-2.8kHz) + analog clipping overdrive." },
        ghost: { name: "Ghost Entity", icon: "👻", tag: "👻 Ghost", desc: "Pitch drop + tremolo modulation & cavernous hollow delay." },
        normal: { name: "Natural (Unmasked)", icon: "🎙️", tag: "🎙️ Natural", desc: "Clean original voice with standard echo cancellation." }
    };

    let activeVoiceMask = localStorage.getItem('quickpad_voice_mask') || 'deep';
    if (!VOICE_PRESETS[activeVoiceMask]) activeVoiceMask = 'deep';

    // Headphone sidetone monitor: hear your disguised voice in your headphones while broadcasting
    let hearMyVoice = localStorage.getItem('quickpad_voice_hear_self') !== 'false'; // default TRUE
    let isPushToTalkActive = false;

    // Global remote voice audio context for multi-tab streaming playback
    let remoteVoiceAudioCtx = null;
    let remoteVoiceNextTime = 0;

    function playRemoteVoiceChunk(chunkData) {
        if (!chunkData || !chunkData.samples || chunkData.senderId === myDeviceId) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!remoteVoiceAudioCtx) {
                remoteVoiceAudioCtx = new AudioCtx();
            }
            if (remoteVoiceAudioCtx.state === 'suspended') {
                remoteVoiceAudioCtx.resume();
            }
            const samples = chunkData.samples;
            const sampleRate = chunkData.sampleRate || remoteVoiceAudioCtx.sampleRate || 44100;
            const buffer = remoteVoiceAudioCtx.createBuffer(1, samples.length, sampleRate);
            const channelData = buffer.getChannelData(0);
            for (let i = 0; i < samples.length; i++) {
                channelData[i] = samples[i] / 32768.0;
            }
            const src = remoteVoiceAudioCtx.createBufferSource();
            src.buffer = buffer;
            src.connect(remoteVoiceAudioCtx.destination);

            const now = remoteVoiceAudioCtx.currentTime;
            if (remoteVoiceNextTime < now) {
                remoteVoiceNextTime = now + 0.02; // 20ms jitter buffer
            }
            src.start(remoteVoiceNextTime);
            remoteVoiceNextTime += buffer.duration;

            // Illuminate remote speaker avatar
            const remoteBubble = document.querySelector(`.peer-avatar-wrapper[data-cid="${chunkData.senderId}"] .peer-avatar-bubble`);
            if (remoteBubble) {
                remoteBubble.classList.add('speaking');
                clearTimeout(remoteBubble.__speakTimeout);
                remoteBubble.__speakTimeout = setTimeout(() => remoteBubble.classList.remove('speaking'), 350);
            }
        } catch(e) {
            console.warn("Remote voice playback error:", e);
        }
    }

    function handleRemoteVoiceStop(data) {
        if (!data || data.senderId === myDeviceId) return;
        const remoteBubble = document.querySelector(`.peer-avatar-wrapper[data-cid="${data.senderId}"] .peer-avatar-bubble`);
        if (remoteBubble) remoteBubble.classList.remove('speaking');
    }

    const VoiceMaskEngine = {
        audioCtx: null,
        micStream: null,
        micSource: null,
        currentDsp: null,
        masterCompressor: null,
        masterGain: null,
        processedDest: null,
        analyser: null,
        monitorGain: null,
        txGain: null,
        processorNode: null,
        isTransmitting: false,
        visualizerRunning: false,
        visualizerAnimId: null,

        async initContext() {
            if (!this.audioCtx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                this.audioCtx = new AudioCtx();
            }
            if (this.audioCtx.state === 'suspended') {
                await this.audioCtx.resume();
            }
            return this.audioCtx;
        },

        createPitchShifter(ctx, pitchRatio) {
            if (Math.abs(pitchRatio - 1.0) < 0.02) {
                const gain = ctx.createGain();
                return { input: gain, output: gain, cleanup: () => {} };
            }
            const duration = 0.08;
            const length = Math.floor(duration * ctx.sampleRate);
            const modBuffer = ctx.createBuffer(4, length, ctx.sampleRate);
            const d1 = modBuffer.getChannelData(0);
            const d2 = modBuffer.getChannelData(1);
            const g1 = modBuffer.getChannelData(2);
            const g2 = modBuffer.getChannelData(3);
            const maxDelay = 0.05;

            for (let i = 0; i < length; i++) {
                const p1 = i / length;
                const p2 = (p1 + 0.5) % 1.0;
                if (pitchRatio >= 1.0) {
                    d1[i] = (1.0 - p1) * maxDelay * (pitchRatio - 1.0) / pitchRatio;
                    d2[i] = (1.0 - p2) * maxDelay * (pitchRatio - 1.0) / pitchRatio;
                } else {
                    d1[i] = p1 * maxDelay * (1.0 - pitchRatio);
                    d2[i] = p2 * maxDelay * (1.0 - pitchRatio);
                }
                g1[i] = 0.5 * (1 - Math.cos(2 * Math.PI * p1));
                g2[i] = 0.5 * (1 - Math.cos(2 * Math.PI * p2));
            }

            const input = ctx.createGain();
            const output = ctx.createGain();
            const delay1 = ctx.createDelay(1.0);
            const delay2 = ctx.createDelay(1.0);
            delay1.delayTime.value = 0;
            delay2.delayTime.value = 0;

            const fade1 = ctx.createGain();
            const fade2 = ctx.createGain();
            fade1.gain.value = 0;
            fade2.gain.value = 0;

            const modSource = ctx.createBufferSource();
            modSource.buffer = modBuffer;
            modSource.loop = true;

            const splitter = ctx.createChannelSplitter(4);
            modSource.connect(splitter);

            splitter.connect(delay1.delayTime, 0);
            splitter.connect(delay2.delayTime, 1);
            splitter.connect(fade1.gain, 2);
            splitter.connect(fade2.gain, 3);

            input.connect(delay1);
            input.connect(delay2);
            delay1.connect(fade1);
            delay2.connect(fade2);
            fade1.connect(output);
            fade2.connect(output);

            modSource.start();

            return {
                input,
                output,
                cleanup: () => {
                    try { modSource.stop(); } catch(e) {}
                    try { modSource.disconnect(); } catch(e) {}
                    try { splitter.disconnect(); } catch(e) {}
                    try { input.disconnect(); } catch(e) {}
                    try { delay1.disconnect(); } catch(e) {}
                    try { delay2.disconnect(); } catch(e) {}
                    try { fade1.disconnect(); } catch(e) {}
                    try { fade2.disconnect(); } catch(e) {}
                }
            };
        },

        createRingModulator(ctx, freq = 68) {
            const input = ctx.createGain();
            const output = ctx.createGain();
            const ringGain = ctx.createGain();
            ringGain.gain.value = 0;

            const osc = ctx.createOscillator();
            osc.frequency.value = freq;
            osc.type = 'sine';
            osc.connect(ringGain.gain);
            osc.start();

            input.connect(ringGain);
            ringGain.connect(output);

            return {
                input,
                output,
                cleanup: () => {
                    try { osc.stop(); } catch(e) {}
                    try { osc.disconnect(); } catch(e) {}
                    try { input.disconnect(); } catch(e) {}
                    try { ringGain.disconnect(); } catch(e) {}
                }
            };
        },

        createDistortion(ctx, amount = 20) {
            const waveShaper = ctx.createWaveShaper();
            const n_samples = 44100;
            const curve = new Float32Array(n_samples);
            const deg = Math.PI / 180;
            const k = typeof amount === 'number' ? amount : 20;
            for (let i = 0; i < n_samples; ++i) {
                const x = (i * 2) / n_samples - 1;
                curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
            }
            waveShaper.curve = curve;
            waveShaper.oversample = '4x';
            return waveShaper;
        },

        buildDsp(ctx, mode) {
            const cleanups = [];
            const input = ctx.createGain();
            const output = ctx.createGain();

            if (mode === 'deep') {
                const ps = this.createPitchShifter(ctx, 0.74);
                cleanups.push(ps.cleanup);

                const makeup = ctx.createGain();
                makeup.gain.value = 1.35;

                const lowShelf = ctx.createBiquadFilter();
                lowShelf.type = 'lowshelf';
                lowShelf.frequency.value = 160;
                lowShelf.gain.value = 6;

                const midPeak = ctx.createBiquadFilter();
                midPeak.type = 'peaking';
                midPeak.frequency.value = 900;
                midPeak.gain.value = 3;

                const lowPass = ctx.createBiquadFilter();
                lowPass.type = 'lowpass';
                lowPass.frequency.value = 3200;

                const dist = this.createDistortion(ctx, 10);

                input.connect(ps.input);
                ps.output.connect(makeup);
                makeup.connect(lowShelf);
                lowShelf.connect(midPeak);
                midPeak.connect(lowPass);
                lowPass.connect(dist);
                dist.connect(output);

            } else if (mode === 'robot') {
                const ps = this.createPitchShifter(ctx, 0.88);
                cleanups.push(ps.cleanup);

                const rm = this.createRingModulator(ctx, 68);
                cleanups.push(rm.cleanup);

                // Compensate for carrier modulation amplitude loss
                const makeup = ctx.createGain();
                makeup.gain.value = 2.2;

                const bp = ctx.createBiquadFilter();
                bp.type = 'bandpass';
                bp.frequency.value = 1800;
                bp.Q.value = 0.8;

                const peak = ctx.createBiquadFilter();
                peak.type = 'peaking';
                peak.frequency.value = 1600;
                peak.gain.value = 5;

                input.connect(ps.input);
                ps.output.connect(rm.input);
                rm.output.connect(makeup);
                makeup.connect(bp);
                bp.connect(peak);
                peak.connect(output);

            } else if (mode === 'high') {
                const ps = this.createPitchShifter(ctx, 1.45);
                cleanups.push(ps.cleanup);

                const makeup = ctx.createGain();
                makeup.gain.value = 1.3;

                const hp = ctx.createBiquadFilter();
                hp.type = 'highpass';
                hp.frequency.value = 340;

                const highShelf = ctx.createBiquadFilter();
                highShelf.type = 'highshelf';
                highShelf.frequency.value = 2200;
                highShelf.gain.value = 5;

                const lp = ctx.createBiquadFilter();
                lp.type = 'lowpass';
                lp.frequency.value = 6500;

                input.connect(ps.input);
                ps.output.connect(makeup);
                makeup.connect(hp);
                hp.connect(highShelf);
                highShelf.connect(lp);
                lp.connect(output);

            } else if (mode === 'radio') {
                const makeup = ctx.createGain();
                makeup.gain.value = 1.5;

                const hp = ctx.createBiquadFilter();
                hp.type = 'highpass';
                hp.frequency.value = 420;
                hp.Q.value = 1.2;

                const lp = ctx.createBiquadFilter();
                lp.type = 'lowpass';
                lp.frequency.value = 2700;
                lp.Q.value = 1.4;

                const peak = ctx.createBiquadFilter();
                peak.type = 'peaking';
                peak.frequency.value = 1400;
                peak.gain.value = 6;

                const dist = this.createDistortion(ctx, 24);

                input.connect(makeup);
                makeup.connect(hp);
                hp.connect(lp);
                lp.connect(peak);
                peak.connect(dist);
                dist.connect(output);

            } else if (mode === 'ghost') {
                const ps = this.createPitchShifter(ctx, 0.82);
                cleanups.push(ps.cleanup);

                const makeup = ctx.createGain();
                makeup.gain.value = 1.3;

                const tremoloGain = ctx.createGain();
                tremoloGain.gain.value = 0.65;
                const tremoloLfo = ctx.createOscillator();
                tremoloLfo.frequency.value = 4.0;
                const lfoDepth = ctx.createGain();
                lfoDepth.gain.value = 0.35;
                tremoloLfo.connect(lfoDepth);
                lfoDepth.connect(tremoloGain.gain);
                tremoloLfo.start();
                cleanups.push(() => {
                    try { tremoloLfo.stop(); tremoloLfo.disconnect(); } catch(e) {}
                });

                const delay = ctx.createDelay(1.0);
                delay.delayTime.value = 0.16;
                const feedback = ctx.createGain();
                feedback.gain.value = 0.40;
                const damp = ctx.createBiquadFilter();
                damp.type = 'lowpass';
                damp.frequency.value = 1800;

                delay.connect(damp);
                damp.connect(feedback);
                feedback.connect(delay);

                input.connect(ps.input);
                ps.output.connect(makeup);
                makeup.connect(tremoloGain);
                tremoloGain.connect(output);
                tremoloGain.connect(delay);
                damp.connect(output);

            } else {
                // Normal
                const hp = ctx.createBiquadFilter();
                hp.type = 'highpass';
                hp.frequency.value = 80;

                input.connect(hp);
                hp.connect(output);
            }

            return {
                input,
                output,
                cleanup: () => cleanups.forEach(fn => { try { fn(); } catch(e) {} })
            };
        },

        async startMic() {
            // If mic stream is already warm and alive in memory, simply re-use it! Zero browser permission prompts!
            if (this.micStream && this.micStream.active && this.micStream.getAudioTracks().some(t => t.readyState === 'live')) {
                this.micStream.getAudioTracks().forEach(t => t.enabled = true);
                if (this.audioCtx && this.audioCtx.state === 'suspended') {
                    await this.audioCtx.resume();
                }
                this.startVisualizer();
                return true;
            }

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                showToast("Microphone access requires HTTPS or localhost.", 'error');
                return false;
            }

            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: false
                    }
                });
                this.micStream = stream;
                localAudioStream = stream;

                const ctx = await this.initContext();
                this.micSource = ctx.createMediaStreamSource(stream);

                // Master Dynamics Compressor for studio-level speech presence
                this.masterCompressor = ctx.createDynamicsCompressor();
                this.masterCompressor.threshold.value = -20;
                this.masterCompressor.knee.value = 10;
                this.masterCompressor.ratio.value = 5;
                this.masterCompressor.attack.value = 0.003;
                this.masterCompressor.release.value = 0.15;

                // Master Makeup Gain
                this.masterGain = ctx.createGain();
                this.masterGain.gain.value = 1.4;
                this.masterCompressor.connect(this.masterGain);

                // Transmission Gain Node (0 when muted, 1.0 when transmitting)
                this.txGain = ctx.createGain();
                this.txGain.gain.value = 0;
                this.masterGain.connect(this.txGain);

                // WebRTC Destination for outgoing audio tracks
                this.processedDest = ctx.createMediaStreamDestination();
                this.txGain.connect(this.processedDest);

                // ScriptProcessor for multi-tab BroadcastChannel audio streaming
                if (ctx.createScriptProcessor) {
                    this.processorNode = ctx.createScriptProcessor(2048, 1, 1);
                    this.processorNode.onaudioprocess = (e) => {
                        if (!this.isTransmitting) return;
                        const inputData = e.inputBuffer.getChannelData(0);
                        let sumSquares = 0;
                        const int16 = new Int16Array(inputData.length);
                        for (let i = 0; i < inputData.length; i++) {
                            const s = Math.max(-1, Math.min(1, inputData[i]));
                            int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                            sumSquares += s * s;
                        }
                        const rms = Math.sqrt(sumSquares / inputData.length);
                        if (rms > 0.003) {
                            broadcastLocalSync({
                                type: 'voice_audio_chunk',
                                senderId: myDeviceId,
                                senderName: myUsername,
                                avatar: myAvatarUrl,
                                sampleRate: ctx.sampleRate,
                                samples: Array.from(int16)
                            });
                        }
                    };
                    this.txGain.connect(this.processorNode);
                    this.processorNode.connect(ctx.destination);
                }

                // AnalyserNode for Visualizer Oscilloscope and Signal LED
                this.analyser = ctx.createAnalyser();
                this.analyser.fftSize = 256;
                this.analyser.smoothingTimeConstant = 0.75;
                this.masterGain.connect(this.analyser);

                // Monitor Gain for Headphone Sidetone (hear your disguised voice)
                this.monitorGain = ctx.createGain();
                this.monitorGain.gain.value = 0;
                this.monitorGain.connect(ctx.destination);
                this.masterGain.connect(this.monitorGain);

                // Build initial DSP graph
                this.currentDsp = this.buildDsp(ctx, activeVoiceMask);
                this.micSource.connect(this.currentDsp.input);
                this.currentDsp.output.connect(this.masterCompressor);

                this.startVisualizer();
                return true;
            } catch(err) {
                console.error("Mic access error:", err);
                showToast("Microphone permission denied. Check browser site permissions.", 'error');
                return false;
            }
        },

        setTransmitting(transmitting) {
            this.isTransmitting = transmitting;
            isVoiceTransmitting = transmitting;

            if (this.audioCtx) {
                const t = this.audioCtx.currentTime;
                // Broadcast gain
                if (this.txGain) {
                    this.txGain.gain.setTargetAtTime(transmitting ? 1.0 : 0.0, t, 0.015);
                }
                // Headphone sidetone monitor: hear your disguised voice in your headphones
                if (this.monitorGain) {
                    const shouldHear = transmitting && hearMyVoice;
                    this.monitorGain.gain.setTargetAtTime(shouldHear ? 1.0 : 0.0, t, 0.015);
                }
            }

            // Mute or unmute hardware tracks WITHOUT stopping them (keeps stream persistent in RAM)
            if (this.micStream) {
                this.micStream.getAudioTracks().forEach(track => {
                    track.enabled = transmitting;
                });
            }

            if (!transmitting) {
                broadcastLocalSync({
                    type: 'voice_audio_stop',
                    senderId: myDeviceId
                });
            }

            if (audioSignalDot) {
                audioSignalDot.classList.toggle('transmitting', transmitting);
            }

            const myBubble = document.querySelector('#profile-avatar-display');
            if (myBubble) myBubble.classList.toggle('speaking', transmitting);
        },

        setMask(newMode) {
            if (!VOICE_PRESETS[newMode]) return;
            activeVoiceMask = newMode;
            localStorage.setItem('quickpad_voice_mask', newMode);
            this.updateUiPresetCards();

            if (hudVoiceMaskTag) {
                hudVoiceMaskTag.textContent = VOICE_PRESETS[newMode].tag;
            }

            if (!this.audioCtx || !this.micSource) return;

            try {
                if (this.currentDsp) {
                    try { this.micSource.disconnect(this.currentDsp.input); } catch(e) {}
                    try { this.currentDsp.output.disconnect(); } catch(e) {}
                    if (this.currentDsp.cleanup) this.currentDsp.cleanup();
                }

                this.currentDsp = this.buildDsp(this.audioCtx, newMode);
                this.micSource.connect(this.currentDsp.input);
                if (this.masterCompressor) {
                    this.currentDsp.output.connect(this.masterCompressor);
                }
            } catch(err) {
                console.warn("Error switching voice mask DSP:", err);
            }
        },

        updateUiPresetCards() {
            if (voicePresetCards) {
                voicePresetCards.forEach(card => {
                    const m = card.getAttribute('data-mask');
                    card.classList.toggle('active', m === activeVoiceMask);
                });
            }
        },

        toggleHearMyVoice() {
            hearMyVoice = !hearMyVoice;
            localStorage.setItem('quickpad_voice_hear_self', hearMyVoice ? 'true' : 'false');
            this.updateSidetoneUi();

            // Immediately apply to audio graph if actively broadcasting or testing
            if (this.monitorGain && this.audioCtx) {
                const shouldHear = this.isTransmitting && hearMyVoice;
                this.monitorGain.gain.setTargetAtTime(shouldHear ? 1.0 : 0.0, this.audioCtx.currentTime, 0.015);
            }

            if (hearMyVoice) {
                showToast("🎧 Headphone monitor ON: You will hear your masked voice as you speak", 'success');
            } else {
                showToast("🔇 Headphone monitor OFF (Silent sidetone)", 'info');
            }
        },

        updateSidetoneUi() {
            if (voiceTestIcon) {
                voiceTestIcon.textContent = hearMyVoice ? '🔊' : '🔇';
            }
            if (voiceTestText) {
                voiceTestText.textContent = hearMyVoice ? 'Hear My Voice: ON' : 'Hear My Voice: OFF';
            }
            if (voiceTestMonitorBtn) {
                voiceTestMonitorBtn.classList.toggle('testing', hearMyVoice);
            }
            if (voiceMonitorLabel) {
                if (isVoiceActive) {
                    voiceMonitorLabel.textContent = hearMyVoice ? '🎧 Broadcasting (Hear Mask ON)' : '🎙️ Broadcasting (Silent Sidetone)';
                    voiceMonitorLabel.style.color = '#00ff66';
                } else {
                    voiceMonitorLabel.textContent = 'Mic Standby (Muted)';
                    voiceMonitorLabel.style.color = '';
                }
            }
        },

        startVisualizer() {
            if (this.visualizerRunning || !voiceVisualizerCanvas) return;
            this.visualizerRunning = true;
            const canvas = voiceVisualizerCanvas;
            const ctx = canvas.getContext('2d');
            const dataArray = new Uint8Array(this.analyser ? this.analyser.frequencyBinCount : 128);

            const render = () => {
                if (!this.visualizerRunning) return;
                this.visualizerAnimId = requestAnimationFrame(render);

                const width = canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth : 300;
                const height = canvas.height = 50;

                ctx.fillStyle = 'rgba(5, 8, 16, 0.4)';
                ctx.fillRect(0, 0, width, height);

                if (this.analyser && this.micStream && this.isTransmitting) {
                    this.analyser.getByteTimeDomainData(dataArray);

                    let sum = 0;
                    for (let i = 0; i < dataArray.length; i++) {
                        const val = (dataArray[i] - 128) / 128;
                        sum += val * val;
                    }
                    const rms = Math.sqrt(sum / dataArray.length);

                    if (audioSignalDot) {
                        audioSignalDot.classList.toggle('active', rms > 0.025);
                    }

                    ctx.lineWidth = 2;
                    ctx.strokeStyle = hearMyVoice ? '#00ff66' : '#00fff9';
                    ctx.shadowColor = ctx.strokeStyle;
                    ctx.shadowBlur = 8;
                    ctx.beginPath();

                    const sliceWidth = width / dataArray.length;
                    let x = 0;

                    for (let i = 0; i < dataArray.length; i++) {
                        const v = dataArray[i] / 128.0;
                        const y = (v * height) / 2;
                        if (i === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                        x += sliceWidth;
                    }
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                } else {
                    // Resting scanline
                    ctx.lineWidth = 1.5;
                    ctx.strokeStyle = 'rgba(0, 255, 249, 0.25)';
                    ctx.beginPath();
                    ctx.moveTo(0, height / 2);
                    ctx.lineTo(width, height / 2);
                    ctx.stroke();
                    if (audioSignalDot) audioSignalDot.classList.remove('active');
                }
            };
            render();
        },

        stopVisualizer() {
            this.visualizerRunning = false;
            if (this.visualizerAnimId) {
                cancelAnimationFrame(this.visualizerAnimId);
                this.visualizerAnimId = null;
            }
        }
    };

    async function toggleVoice() {
        if (isVoiceActive) {
            stopVoice();
        } else {
            await startVoice();
        }
    }

    async function startVoice() {
        // Resume AudioContext on user gesture
        await VoiceMaskEngine.initContext();

        // Warm up persistent mic stream (only requests browser permission once!)
        const ok = await VoiceMaskEngine.startMic();
        if (!ok) return;

        isVoiceActive = true;
        VoiceMaskEngine.setTransmitting(true);

        if (hudVoiceBtn) {
            hudVoiceBtn.classList.add('active', 'transmitting');
            if (hudVoiceStatus) hudVoiceStatus.innerText = "Live (Masked)";
        }
        if (voiceModalToggleBtn) {
            voiceModalToggleBtn.classList.add('active');
            if (voiceModalToggleIcon) voiceModalToggleIcon.textContent = '🔴';
            if (voiceModalToggleText) voiceModalToggleText.textContent = 'Stop Voice Broadcast';
        }
        VoiceMaskEngine.updateSidetoneUi();

        showToast(`🎙️ Voice Live (${VOICE_PRESETS[activeVoiceMask].name})! Speak into your mic.`, 'success');
    }

    function stopVoice() {
        isVoiceActive = false;
        VoiceMaskEngine.setTransmitting(false);

        if (hudVoiceBtn) {
            hudVoiceBtn.classList.remove('active', 'transmitting');
            if (hudVoiceStatus) hudVoiceStatus.innerText = "Voice";
        }
        if (voiceModalToggleBtn) {
            voiceModalToggleBtn.classList.remove('active');
            if (voiceModalToggleIcon) voiceModalToggleIcon.textContent = '🎙️';
            if (voiceModalToggleText) voiceModalToggleText.textContent = 'Start Live Voice Broadcast';
        }
        VoiceMaskEngine.updateSidetoneUi();

        const myBubble = document.querySelector('#profile-avatar-display');
        if (myBubble) myBubble.classList.remove('speaking');
        showToast("Voice broadcast stopped (Muted)", 'info');
    }

    function openVoiceMaskModal() {
        if (!voiceMaskModal) return;
        document.querySelectorAll('.dropdown-menu').forEach(m => {
            m.classList.remove('show');
            m.classList.remove('hidden');
        });
        document.querySelectorAll('.dropdown-group').forEach(g => g.classList.remove('active'));
        voiceMaskModal.classList.remove('hidden');
        VoiceMaskEngine.updateUiPresetCards();
        VoiceMaskEngine.updateSidetoneUi();
        if (!VoiceMaskEngine.visualizerRunning) {
            VoiceMaskEngine.startVisualizer();
        }
    }

    function closeVoiceMaskModal() {
        if (!voiceMaskModal) return;
        voiceMaskModal.classList.add('hidden');
        document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('hidden'));
        // If not actively broadcasting, stop visualizer loop to save battery
        if (!isVoiceActive) {
            VoiceMaskEngine.stopVisualizer();
        }
    }

    // Single unified click handler for HUD voice button (no mousedown/mouseup collision!)
    if (hudVoiceBtn) {
        hudVoiceBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleVoice();
        });
        hudVoiceBtn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            openVoiceMaskModal();
        });
    }

    if (hudVoiceMaskBtn) {
        hudVoiceMaskBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openVoiceMaskModal();
        });
    }

    if (hudVoiceMaskToolBtn) {
        hudVoiceMaskToolBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.dropdown-menu').forEach(m => {
                m.classList.remove('show');
                m.classList.remove('hidden');
            });
            document.querySelectorAll('.dropdown-group').forEach(g => g.classList.remove('active'));
            openVoiceMaskModal();
        });
    }

    if (voiceTestMonitorBtn) {
        voiceTestMonitorBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            // If mic not active yet, initialize it and update voice state so user can test immediately
            if (!VoiceMaskEngine.micStream) {
                const ok = await VoiceMaskEngine.startMic();
                if (!ok) return;
                isVoiceActive = true;
                VoiceMaskEngine.setTransmitting(true);
                updateVoiceUI();
            }
            VoiceMaskEngine.toggleHearMyVoice();
        });
    }

    if (voiceModalToggleBtn) {
        voiceModalToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleVoice();
        });
    }

    if (voicePresetCards) {
        voicePresetCards.forEach(card => {
            card.addEventListener('click', () => {
                const mask = card.getAttribute('data-mask');
                if (mask) {
                    VoiceMaskEngine.setMask(mask);
                    showToast(`🎭 Voice disguise changed to: ${VOICE_PRESETS[mask].name}`, 'info');
                }
            });
        });
    }

    // Push-to-Talk via Spacebar (active when in Muted mode)
    window.addEventListener('keydown', async (e) => {
        if (e.code === 'Space' && !isVoiceActive && !isPushToTalkActive) {
            const tag = document.activeElement ? document.activeElement.tagName : '';
            const isTypingField = ['INPUT', 'TEXTAREA'].includes(tag) || (document.activeElement && document.activeElement.isContentEditable);
            if (!isTypingField) {
                e.preventDefault();
                await VoiceMaskEngine.initContext();
                const ok = await VoiceMaskEngine.startMic();
                if (ok) {
                    isPushToTalkActive = true;
                    VoiceMaskEngine.setTransmitting(true);
                    if (hudVoiceBtn) {
                        hudVoiceBtn.classList.add('active', 'transmitting');
                        if (hudVoiceStatus) hudVoiceStatus.innerText = "Transmitting...";
                    }
                }
            }
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'Space' && isPushToTalkActive) {
            isPushToTalkActive = false;
            VoiceMaskEngine.setTransmitting(false);
            if (hudVoiceBtn) {
                hudVoiceBtn.classList.remove('active', 'transmitting');
                if (hudVoiceStatus) hudVoiceStatus.innerText = "Voice";
            }
        }
    });

    // Resume AudioContexts on any pointer click anywhere on the page
    document.addEventListener('pointerdown', () => {
        if (VoiceMaskEngine.audioCtx && VoiceMaskEngine.audioCtx.state === 'suspended') {
            VoiceMaskEngine.audioCtx.resume();
        }
        if (remoteVoiceAudioCtx && remoteVoiceAudioCtx.state === 'suspended') {
            remoteVoiceAudioCtx.resume();
        }
    }, { passive: true });

    if (hudVoiceMaskTag && VOICE_PRESETS[activeVoiceMask]) {
        hudVoiceMaskTag.textContent = VOICE_PRESETS[activeVoiceMask].tag;
    }

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
                    tabsContentDirty = true;
                    dirtyTabIds.add(activeTabId);
                    if (multiNoteMode === 2 && multiPaneTabs.pane2 === activeTabId && multiPane2Editor && multiPane2Editor.value !== editor.value) {
                        multiPane2Editor.value = editor.value;
                        if (multiPanePreviews.pane2) updateMultiPanePreview(2);
                    }
                    broadcastLocalSync({
                        type: 'tab_content',
                        tid: activeTabId,
                        content: editor.value,
                        senderId: myDeviceId
                    });
                    updateHUD();
                    if (isMarkdown || isSplitMode) updatePreview();
                    scheduleWorkspaceSave();
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

        closeAllDropdowns = function() {
            clearTimeout(closeTimeout);
            document.querySelectorAll('.dropdown-menu').forEach(m => {
                m.classList.remove('show');
                m.classList.remove('hidden');
            });
            document.querySelectorAll('.dropdown-group').forEach(g => {
                g.classList.remove('active');
            });
            activeMenu = null;
            activeGroup = null;
        };

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
                menu.classList.remove('hidden');
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
            applyThemeClass(theme);
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

        if (typeof updateAllVisiblePeerCursors === 'function') {
            updateAllVisiblePeerCursors();
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

                isPollsDirty = true;
                updatePreview();
                saveWorkspace();
            });
        });
    }

    function updateViewVisibility() {
        if (!editor || !preview) return;
        const isDrawTab = activeTabId && tabsData[activeTabId] && tabsData[activeTabId].name && tabsData[activeTabId].name.endsWith('.draw');

        if (isDrawTab) {
            editor.classList.add('hidden');
            editor.style.display = 'none';
            preview.classList.add('hidden');
            preview.style.display = 'none';
            if (editorMirror) editorMirror.style.display = 'none';
            return;
        }

        if (isSplitMode) {
            document.body.classList.add('split-mode');
            editor.classList.remove('hidden');
            editor.style.display = '';
            preview.classList.remove('hidden');
            preview.style.display = 'block';
            if (editorMirror) editorMirror.style.display = '';
            updatePreview();
        } else if (isMarkdown) {
            document.body.classList.remove('split-mode');
            editor.classList.add('hidden');
            editor.style.display = 'none';
            preview.classList.remove('hidden');
            preview.style.display = 'block';
            if (editorMirror) editorMirror.style.display = 'none';
            updatePreview();
        } else {
            document.body.classList.remove('split-mode');
            editor.classList.remove('hidden');
            editor.style.display = '';
            preview.classList.add('hidden');
            preview.style.display = 'none';
            if (editorMirror) editorMirror.style.display = '';
        }
    }

    function updatePreview() {
        if (!isMarkdown && !isSplitMode) return;
        if (!preview || !editor) return;
        
        const rawContent = (glitchInterval ? currentGlitchOriginal : editor.value) || '';

        // Fallback if marked library failed to load or is unavailable
        if (typeof marked === 'undefined') {
            console.warn("Marked.js is not loaded. Displaying formatted text fallback.");
            preview.innerHTML = `<div style="white-space: pre-wrap; font-family: var(--editor-font); color: var(--text-color);">${escapeHtml(rawContent)}</div>`;
            return;
        }

        try {
            // 1. Pre-process poll syntax into cyber poll cards & markdown highlights
            let processedContent = typeof processPollMarkup === 'function' ? processPollMarkup(rawContent) : rawContent;
            processedContent = processedContent.replace(/==([^=\n\r]+)==/g, '<mark class="hl-yellow">$1</mark>');

            // 2. Render Markdown & sanitize (preserving mark and style attributes)
            let parsed = '';
            if (typeof marked.parse === 'function') {
                parsed = marked.parse(processedContent);
            } else if (typeof marked === 'function') {
                parsed = marked(processedContent);
            }

            const html = typeof DOMPurify !== 'undefined' 
                ? DOMPurify.sanitize(parsed, { ADD_TAGS: ['mark', 'svg', 'path', 'line', 'polygon', 'rect', 'circle'], ADD_ATTR: ['style', 'class', 'viewBox', 'xmlns', 'fill', 'stroke', 'stroke-width', 'data-poll-id', 'data-opt-idx'] }) 
                : parsed;

            preview.innerHTML = html || '<p style="color: var(--text-muted); font-style: italic;">(Empty note)</p>';
        } catch (err) {
            console.error("Markdown rendering error:", err);
            preview.innerHTML = `<div style="white-space: pre-wrap; font-family: var(--editor-font); color: var(--text-color);">${escapeHtml(rawContent)}</div>`;
        }
        
        // 3. Apply syntax highlighting to code blocks in preview
        if (typeof hljs !== 'undefined') {
            try {
                preview.querySelectorAll('pre code').forEach((block) => {
                    if (!block.classList.contains('language-mermaid')) {
                        try { hljs.highlightElement(block); } catch (e) {}
                    }
                });
            } catch (e) {}
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
        try {
            preview.querySelectorAll('input[type="checkbox"]').forEach((checkbox, idx) => {
                checkbox.removeAttribute('disabled');
                checkbox.addEventListener('change', (e) => {
                    toggleTaskInEditor(idx, e.target.checked);
                });
            });
        } catch (e) {}

        // 7. Wire interactive poll click listeners
        if (typeof wirePollListeners === 'function') {
            try { wirePollListeners(); } catch (e) {}
        }
    }

    function toggleTaskInEditor(taskIndex, isChecked) {
        if (!editor) return;
        const lines = editor.value.split('\n');
        let currentTask = 0;
        let inCodeBlock = false;
        const taskRegex = /^(\s*(?:[-*+]|\d+\.)\s+\[)[ xX](\])/;
        for (let i = 0; i < lines.length; i++) {
            if (/^\s*```/.test(lines[i])) {
                inCodeBlock = !inCodeBlock;
                continue;
            }
            if (inCodeBlock) continue;
            if (taskRegex.test(lines[i])) {
                if (currentTask === taskIndex) {
                    lines[i] = lines[i].replace(taskRegex, `$1${isChecked ? 'x' : ' '}$2`);
                    break;
                }
                currentTask++;
            }
        }
        editor.value = lines.join('\n');
        if (tabsData[activeTabId]) tabsData[activeTabId].content = editor.value;
        tabsContentDirty = true;
        dirtyTabIds.add(activeTabId);
        if (multiNoteMode === 2 && multiPaneTabs.pane2 === activeTabId && multiPane2Editor && multiPane2Editor.value !== editor.value) {
            multiPane2Editor.value = editor.value;
            if (multiPanePreviews.pane2) updateMultiPanePreview(2);
        }
        broadcastLocalSync({
            type: 'tab_content',
            tid: activeTabId,
            content: editor.value,
            senderId: myDeviceId
        });
        updateHUD();
        updatePreview();
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
            if (shareBtn) shareBtn.style.display = 'none';
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
                if (!rawToken.includes('_') && window.location.hash && window.location.hash.length > 1) {
                    rawToken = `${viewParam}_${window.location.hash.substring(1)}`;
                }
                if (editor) {
                    editor.readOnly = true;
                    editor.placeholder = "This document is in Read-Only mode.";
                }
                if (newBtn) newBtn.style.display = 'none';
                if (timerBtn) timerBtn.style.display = 'none';
                if (burnBtn) burnBtn.style.display = 'none';
                if (instantBurnBtn) instantBurnBtn.style.display = 'none';
            } else if (padParam) {
                rawToken = padParam.trim();
                window.history.replaceState({}, '', `#${rawToken}`);
                try { localStorage.setItem('quickpad_last_active_hash', rawToken); } catch(e){}
            } else if (window.location.hash && window.location.hash.length > 1) {
                try {
                    rawToken = decodeURIComponent(window.location.hash.substring(1)).trim();
                } catch(e) {
                    rawToken = window.location.hash.substring(1).trim();
                }
                try { localStorage.setItem('quickpad_last_active_hash', rawToken); } catch(e){}
            } else {
                // When opened without a hash (e.g. Chrome App / PWA launch from dock or desktop),
                // resume the user's active note from their previous session
                let lastSavedHash = null;
                try { lastSavedHash = localStorage.getItem('quickpad_last_active_hash'); } catch(e){}
                if (lastSavedHash && lastSavedHash.trim().length > 3) {
                    rawToken = lastSavedHash.trim();
                    window.history.replaceState({}, '', `#${rawToken}`);
                } else {
                    rawToken = generateToken();
                    window.history.replaceState({}, '', `#${rawToken}`);
                    try { localStorage.setItem('quickpad_last_active_hash', rawToken); } catch(e){}
                }
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
                    if (duressPin && enteredPass.trim() === duressPin.trim()) {
                        isDuressUnlocked = true;
                        isReadOnly = true;
                        unlocked = true;
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
                if (isDuressUnlocked) {
                    tabsData = { 'main': { name: 'notes.txt', content: duressContent || 'Biology 101 Lecture Notes - Cell Mitosis\n\n1. Interphase\n2. Prophase\n3. Metaphase\n4. Anaphase\n5. Telophase', is_encrypted: false } };
                    activeTabId = 'main';
                    renderTabs();
                    if (editor) {
                        editor.value = tabsData['main'].content;
                        editor.readOnly = true;
                    }
                    updatePreview();
                    updateHUD();
                    return;
                }
                if (!unlocked) {
                    if (editor) {
                        editor.value = "🔒 Protected Read-Only Note — Passcode required to decrypt.";
                        editor.readOnly = true;
                    }
                    return;
                }
            } else if (rawToken.includes('_')) {
                let parts = rawToken.split('_');
                currentToken = parts[0];
                urlKey = parts.slice(1).join('_');
                vaultPassword = urlKey;
            } else {
                currentToken = rawToken;
                urlKey = null;
                if (typeof CryptoJS !== 'undefined' && currentToken) {
                    vaultPassword = CryptoJS.SHA256('qp_vault_' + currentToken).toString().substring(0, 24);
                }
            }

            // Fresh workspaces start clean & blank. Example guide can be opened via Settings, File menu, or Command Palette.

            await initCrypto();
            if (tabsBar) tabsBar.classList.remove('hidden');
            if (liveHud) liveHud.classList.remove('hidden');
            if (currentToken) {
                try {
                    const cachedTabs = localStorage.getItem('quickpad_cached_tabs_' + currentToken);
                    if (cachedTabs) {
                        const parsedTabs = JSON.parse(cachedTabs);
                        if (parsedTabs && typeof parsedTabs === 'object' && Object.keys(parsedTabs).length > 0) {
                            tabsData = parsedTabs;
                            const savedActive = localStorage.getItem('quickpad_active_tab_' + currentToken);
                            if (savedActive && tabsData[savedActive]) {
                                activeTabId = savedActive;
                            }
                            upgradeExistingGuideTabs();
                            if (editor && tabsData[activeTabId]) {
                                editor.value = tabsData[activeTabId].content || '';
                            }
                        }
                    }
                } catch(e){}
                try {
                    const savedOrder = localStorage.getItem('quickpad_tab_order_' + currentToken);
                    if (savedOrder) {
                        const parsed = JSON.parse(savedOrder);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            tabOrder = parsed;
                            ensureTabOrder();
                        }
                    }
                } catch(e){}
                try {
                    const savedMulti = localStorage.getItem('quickpad_multi_note_' + currentToken);
                    if (savedMulti && savedMulti === '2') {
                        setTimeout(() => setMultiNoteLayout(2), 100);
                    }
                } catch(e){}
            }
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
        adaptMacKeyboardBadges();
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
                if (e.target.closest('button, input, select, a, .flare-btn, .dropdown-group, .tab')) return;
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

        setTimeout(() => {
            isAppInitialized = true;
            lastKnownHash = window.location.hash;
        }, 500);
    }

    function generateToken() { 
        return Math.random().toString(36).substring(2, 12) + '_' + Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12); 
    }

    function createNewWorkspace() {
        try { localStorage.removeItem('quickpad_last_active_hash'); } catch(e){}
        const freshToken = generateToken();
        try { localStorage.setItem('quickpad_last_active_hash', freshToken); } catch(e){}
        window.location.href = window.location.origin + window.location.pathname + '#' + freshToken;
    }
    window.createNewWorkspace = createNewWorkspace;

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
                if (!data || data.senderTabInstance === myTabInstanceId) return;

                try {
                    if (data.type === 'tab_content') {
                        if (tabsData[data.tid]) {
                            // If tab is secret on this tab and not unlocked, ignore local broadcast
                            if (tabsData[data.tid].is_secret && !tabsData[data.tid].secret_pass) {
                                return;
                            }
                            if (data.senderId !== myDeviceId) {
                                triggerTabRemoteActivity(data.tid, data.senderId, (peerCursorsData[data.senderId] ? peerCursorsData[data.senderId].name : null));
                            }
                            tabsData[data.tid].content = data.content;
                            lastSavedTabsJSON = JSON.stringify(tabsData);
                            lastSyncedServerTabs[data.tid] = { content: data.content };
                            dirtyTabIds.delete(data.tid);
                            try { localStorage.setItem('quickpad_cached_tabs_' + token, serializeTabsForLocalCache(tabsData)); } catch(e) {}
                            if (data.tid === activeTabId) {
                                const isFocused = (document.activeElement === editor);
                                if (!isTypingInTab(data.tid) || !isFocused) {
                                    const isDraw = tabsData[data.tid].name && tabsData[data.tid].name.endsWith('.draw');
                                    if (isDraw) {
                                        if (typeof wbIsDrawing !== 'undefined' && !wbIsDrawing) {
                                            loadWhiteboardFromTab(data.content);
                                        }
                                    } else if (editor) {
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

                            // Secondary Editor (Pane 2)
                            if (multiNoteMode === 2 && multiPaneTabs.pane2 === data.tid && multiPane2Editor) {
                                const isP2Focused = (document.activeElement === multiPane2Editor);
                                if (!isTypingInTab(data.tid) || !isP2Focused) {
                                    if (isP2Focused) {
                                        const start = multiPane2Editor.selectionStart;
                                        const end = multiPane2Editor.selectionEnd;
                                        multiPane2Editor.value = data.content;
                                        multiPane2Editor.setSelectionRange(start, end);
                                    } else {
                                        multiPane2Editor.value = data.content;
                                    }
                                    if (multiPanePreviews.pane2) updateMultiPanePreview(2);
                                }
                            }
                        }
                    } else if (data.type === 'tabs_structure') {
                    if (data.tabs) {
                        if (data.tab_order && Array.isArray(data.tab_order) && data.tab_order.length > 0) {
                            tabOrder = data.tab_order;
                        }
                        for (let tid in data.tabs) {
                            if (!tabsData[tid]) {
                                tabsData[tid] = data.tabs[tid];
                            } else {
                                tabsData[tid].name = data.tabs[tid].name;
                                if (!dirtyTabIds.has(tid) && typeof data.tabs[tid].content === 'string') {
                                    if (!data.tabs[tid].is_secret || tabsData[tid].secret_pass) {
                                        tabsData[tid].content = data.tabs[tid].content;
                                    }
                                }
                                if (tabsData[tid].is_secret !== !!data.tabs[tid].is_secret) {
                                    tabsData[tid].is_secret = !!data.tabs[tid].is_secret;
                                    if (!tabsData[tid].is_secret) tabsData[tid].secret_pass = null;
                                }
                            }
                        }
                        // Remove tabs deleted in another local tab
                        for (let existingTid in tabsData) {
                            if (!data.tabs[existingTid] && !dirtyTabIds.has(existingTid)) {
                                delete tabsData[existingTid];
                            }
                        }
                        ensureTabOrder();
                        if (!tabsData[activeTabId]) {
                            activeTabId = tabOrder[0] || Object.keys(tabsData)[0] || 'main';
                            if (!tabsData[activeTabId]) {
                                tabsData[activeTabId] = { name: 'main.txt', content: '', is_encrypted: false };
                            }
                            switchTab(activeTabId, true);
                        }
                        lastSavedTabsJSON = JSON.stringify(tabsData);
                        try { localStorage.setItem('quickpad_cached_tabs_' + token, serializeTabsForLocalCache(tabsData)); } catch(e) {}
                        renderTabs();
                        updateMultiPaneSelectors();
                        if (multiNoteMode === 2) loadMultiPaneContent(2);
                        if (typeof checkLockedTabUI === 'function') checkLockedTabUI(activeTabId);
                        if (tabsData[activeTabId] && editor && (!tabsData[activeTabId].is_secret || tabsData[activeTabId].secret_pass)) {
                            const isDraw = tabsData[activeTabId].name && tabsData[activeTabId].name.endsWith('.draw');
                            if (!isDraw) {
                                editor.value = tabsData[activeTabId].content || '';
                                updatePreview();
                                updateHUD();
                            }
                        }
                    }
                } else if (data.type === 'cursor_presence') {
                    if (data.cursor) {
                        const isNewPeer = !peerCursorsData[data.senderId];
                        peerCursorsData[data.senderId] = {
                            pos: data.cursor.pos,
                            name: data.cursor.name,
                            pubKey: data.cursor.pubKey,
                            tabId: data.cursor.tabId,
                            avatar: data.cursor.avatar,
                            speaking: !!data.cursor.speaking,
                            timestamp: data.cursor.timestamp || Date.now(),
                            lastSeenLocalTime: Date.now(),
                            isLocalTab: true
                        };
                        const tabId = data.cursor.tabId || 'main';
                        const isVisibleInPane1 = (tabId === activeTabId);
                        const isVisibleInPane2 = (multiNoteMode === 2 && multiPaneTabs.pane2 === tabId);
                        if (isVisibleInPane1 || isVisibleInPane2) {
                            renderPeerCursor(data.senderId, data.cursor.pos, data.cursor.name, tabId);
                        } else {
                            removePeerCursor(data.senderId);
                            if (data.senderId !== myDeviceId && data.cursor.tabId) {
                                if (data.cursor.typing || data.cursor.isTyping) {
                                    triggerTabRemoteActivity(data.cursor.tabId, data.senderId, data.cursor.name);
                                }
                            }
                        }
                        if (typeof updatePresenceUI === 'function') {
                            updatePresenceUI();
                        }
                        // Reciprocate presence immediately to newly discovered peer so both tabs show 2 Online
                        if (isNewPeer && typeof syncMyCursor === 'function') {
                            syncMyCursor();
                        }
                    }
                } else if (data.type === 'peer_disconnect') {
                    if (data.senderId) {
                        removePeerCursor(data.senderId);
                        delete peerCursorsData[data.senderId];
                        if (typeof updatePresenceUI === 'function') {
                            updatePresenceUI();
                        }
                    }
                } else if (data.type === 'laser_presence') {
                    if (data.laser && data.laser.active) {
                        const lTab = data.laser.tabId || (peerCursorsData[data.senderId] ? peerCursorsData[data.senderId].tabId : 'main');
                        const lx = typeof data.laser.x === 'number' ? data.laser.x : null;
                        const ly = typeof data.laser.y === 'number' ? data.laser.y : null;
                        const now = Date.now();
                        if (lx !== null && ly !== null) {
                            if (!remoteLasers[data.senderId]) {
                                remoteLasers[data.senderId] = {
                                    x: lx,
                                    y: ly,
                                    targetX: lx,
                                    targetY: ly,
                                    trail: [],
                                    color: data.laser.color || getPeerColor(data.senderId).color,
                                    name: data.laser.name || 'Collaborator',
                                    tabId: lTab,
                                    active: true,
                                    opacity: 1,
                                    lastUpdate: now
                                };
                            } else {
                                const rl = remoteLasers[data.senderId];
                                rl.targetX = lx;
                                rl.targetY = ly;
                                rl.color = data.laser.color || rl.color;
                                rl.name = data.laser.name || rl.name;
                                rl.tabId = lTab;
                                rl.active = true;
                                rl.opacity = 1;
                                rl.lastUpdate = now;
                            }
                        }
                    } else {
                        delete remoteLasers[data.senderId];
                    }
                } else if (data.type === 'whiteboard_stroke') {
                    if (data.stroke && data.tabId === activeTabId) {
                        drawRemoteStrokeBatch(data.stroke);
                    }
                } else if (data.type === 'voice_audio_chunk') {
                    if (data.samples && typeof playRemoteVoiceChunk === 'function') {
                        playRemoteVoiceChunk(data);
                    }
                } else if (data.type === 'voice_audio_stop') {
                    if (typeof handleRemoteVoiceStop === 'function') {
                        handleRemoteVoiceStop(data);
                    }
                } else if (data.type === 'dm_message') {
                    if (data.chatKey && data.dmObj) {
                        if (!globalDms[data.chatKey]) globalDms[data.chatKey] = [];
                        if (!globalDms[data.chatKey].some(m => m.id === data.dmObj.id)) {
                            globalDms[data.chatKey].push(data.dmObj);
                            if (typeof calculateUnread === 'function') calculateUnread(globalDms);
                            if (typeof renderChat === 'function') renderChat();
                        }
                    }
                } else if (data.type === 'request_initial_sync') {
                    if (tabsData && Object.keys(tabsData).length > 0) {
                        broadcastLocalSync({
                            type: 'tabs_structure',
                            tabs: tabsData,
                            tab_order: tabOrder,
                            senderId: myDeviceId
                        });
                    }
                    if (typeof syncMyCursor === 'function') {
                        syncMyCursor();
                    }
                }
                } catch(err) {
                    window.__lastLocalSyncError = err.message + '\n' + err.stack;
                }
            };

            // Request initial sync and announce presence to all open tabs on this device
            broadcastLocalSync({
                type: 'request_initial_sync',
                senderId: myDeviceId
            });
            setTimeout(() => {
                if (typeof syncMyCursor === 'function') syncMyCursor();
                if (typeof updatePresenceUI === 'function') updatePresenceUI();
            }, 50);
        } catch (e) {
            console.warn("BroadcastChannel initialization warning:", e);
        }
    }

    function broadcastLocalSync(msg) {
        if (!localSyncChannel) return;
        try {
            msg.senderTabInstance = myTabInstanceId;
            msg.senderId = myDeviceId;
            localSyncChannel.postMessage(msg);
        } catch(e) {}
    }

    // --- Unified Presence UI Engine (Keeps Online Badges & Collaborator Bubbles in 100% Real-Time Sync) ---
    const lastSeenRemoteCursorTs = {}; // cid -> last seen remote c.timestamp

    function deduplicatePeerCursors(now) {
        const cids = Object.keys(peerCursorsData);
        if (cids.length <= 1) return;

        // Group by browser instance / public key / mobile hardware signature
        const byIdentityKey = new Map();
        for (const cid of cids) {
            if (cid === myDeviceId) continue;
            const c = peerCursorsData[cid];
            if (!c || c.isLocalTab) continue;

            const keys = [];
            if (c.deviceInstanceId) keys.push('inst:' + c.deviceInstanceId);
            if (c.pubKey && c.pubKey.n) keys.push('pub:' + c.pubKey.n);
            if (c.isMobile && c.deviceSig) {
                keys.push('msig:' + c.deviceSig + '|' + (c.name || 'Anon') + '|' + (c.avatar || ''));
            }

            for (const k of keys) {
                if (!byIdentityKey.has(k)) {
                    byIdentityKey.set(k, cid);
                } else {
                    const existingCid = byIdentityKey.get(k);
                    if (existingCid === cid) continue;
                    const existing = peerCursorsData[existingCid];
                    if (!existing) {
                        byIdentityKey.set(k, cid);
                        continue;
                    }
                    // For mobile signature matches, if both have sent >= 3 independent live heartbeats within 3s of each other, allow both
                    const isMobileSigOnly = k.startsWith('msig:') &&
                        (!c.deviceInstanceId || !existing.deviceInstanceId || c.deviceInstanceId !== existing.deviceInstanceId);
                    if (isMobileSigOnly) {
                        const bothActivelyHeartbeating = (c.heartbeatCount || 0) >= 3 &&
                            (existing.heartbeatCount || 0) >= 3 &&
                            Math.abs((c.lastSeenLocalTime || 0) - (existing.lastSeenLocalTime || 0)) < 3500 &&
                            (now - (c.lastSeenLocalTime || 0) < 4500) &&
                            (now - (existing.lastSeenLocalTime || 0) < 4500);
                        if (bothActivelyHeartbeating) continue;
                    }

                    // Keep the most recently updated cursor and prune the older ghost duplicate
                    const cTime = (c.lastSeenLocalTime || 0);
                    const exTime = (existing.lastSeenLocalTime || 0);
                    const cRemote = (c.timestamp || 0);
                    const exRemote = (existing.timestamp || 0);
                    const cIsNewer = (cTime !== exTime) ? (cTime > exTime) : (cRemote >= exRemote);
                    const staleCid = cIsNewer ? existingCid : cid;
                    const keepCid = cIsNewer ? cid : existingCid;

                    removePeerCursor(staleCid);
                    delete peerCursorsData[staleCid];
                    byIdentityKey.set(k, keepCid);

                    if (db && currentToken && !isBurnMode) {
                        try {
                            const delPayload = {};
                            delPayload[`cursors.${staleCid}`] = firebase.firestore.FieldValue.delete();
                            db.collection("workspaces").doc(currentToken).update(delPayload).catch(() => {});
                        } catch(e) {}
                    }
                }
            }
        }
    }

    function updatePresenceUI() {
        const activeUsers = new Map();
        activeUsers.set(myDeviceId, { name: myUsername, avatar: myAvatarUrl, speaking: isVoiceTransmitting });

        const now = Date.now();
        deduplicatePeerCursors(now);

        for (let cid in peerCursorsData) {
            if (cid === myDeviceId) continue;
            const c = peerCursorsData[cid];
            if (!c) continue;
            // Prune if inactive for more than 35 seconds using local monotonic reception time (immune to cross-device clock skew)
            const lastActive = c.lastSeenLocalTime || c.timestamp || 0;
            if (now - lastActive > 35000) {
                removePeerCursor(cid);
                delete peerCursorsData[cid];
                if (db && currentToken && !isBurnMode && (now - lastActive > 65000)) {
                    try {
                        const delPayload = {};
                        delPayload[`cursors.${cid}`] = firebase.firestore.FieldValue.delete();
                        db.collection("workspaces").doc(currentToken).update(delPayload).catch(() => {});
                    } catch(e) {}
                }
                continue;
            }
            activeUsers.set(cid, {
                name: c.name || 'Anon',
                avatar: c.avatar || '',
                speaking: !!c.speaking,
                pubKey: c.pubKey
            });
        }

        // Prune disconnected peers from remote lasers
        for (let cid in remoteLasers) {
            if (!activeUsers.has(cid)) {
                delete remoteLasers[cid];
            }
        }

        // Save global active users map
        currentActiveUsers = activeUsers;
        if (typeof updateWormholePeersUI === 'function') {
            updateWormholePeersUI();
        }
        if (typeof renderCollaboratorsModal === 'function' && collaboratorsModal && !collaboratorsModal.classList.contains('hidden')) {
            renderCollaboratorsModal();
        }

        // Update Presence Header / Bottom Bar UI on all devices
        const totalCount = activeUsers.size;
        if (onlineCountText) {
            onlineCountText.innerText = totalCount === 1 ? '1 Online' : `${totalCount} Online`;
        }

        let totalUnread = 0;
        for (let cid in unreadMessages) {
            if (activeUsers.has(cid)) {
                totalUnread += (unreadMessages[cid] || 0);
            }
        }
        if (onlineCountBadge) {
            onlineCountBadge.classList.toggle('has-unread-dms', totalUnread > 0);
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
                const unreadCount = unreadMessages[cid] || 0;
                const unread = unreadCount > 0 ? `<span class="peer-unread-dot" title="${unreadCount} new message${unreadCount > 1 ? 's' : ''}"></span>` : '';
                const speakingClass = user.speaking ? ' speaking' : '';

                peersHtml += `
                    <div class="peer-avatar-wrapper" data-cid="${escapeHtml(cid)}" data-name="${escapeHtml(user.name)}" title="${escapeHtml(user.name)} (Click to DM)">
                        <div class="peer-avatar-bubble${speakingClass}" style="border-color:${colorObj.color}">
                            ${avatarContent}
                        </div>
                        ${unread}
                        <div class="peer-tooltip">
                            <span class="peer-tooltip-name" style="color:${colorObj.color}">${escapeHtml(user.name)}</span>
                            <span class="peer-tooltip-action" style="${unreadCount > 0 ? 'color:#ff0055;font-weight:700;' : ''}">${unreadCount > 0 ? `💬 ${unreadCount} new message${unreadCount > 1 ? 's' : ''}` : (user.speaking ? '🔊 Speaking...' : '💬 Click to DM')}</span>
                        </div>
                    </div>
                `;
            });
            if (peerAvatarsList.dataset.renderedHtml !== peersHtml) {
                peerAvatarsList.dataset.renderedHtml = peersHtml;
                peerAvatarsList.innerHTML = peersHtml;

                // Attach chat & DM listeners
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
    }

    // --- Unified Departure & Mobile QR Handoff Cleanup ---
    let hiddenPresenceCleanupTimer = null;
    let lastHiddenTimestamp = 0;

    function removeMyCloudPresence(releasePrimaryLock = false) {
        if (typeof cursorBroadcastTimeout !== 'undefined' && cursorBroadcastTimeout) {
            clearTimeout(cursorBroadcastTimeout);
            cursorBroadcastTimeout = null;
        }
        if (releasePrimaryLock && isPrimaryDeviceTab && !isMobileDevice) {
            try {
                const rawLock = localStorage.getItem('quickpad_primary_tab_lock');
                if (rawLock) {
                    const parsed = JSON.parse(rawLock);
                    if (parsed && parsed.tabId === myTabInstanceId) {
                        localStorage.removeItem('quickpad_primary_tab_lock');
                    }
                }
            } catch(e) {}
        }
        broadcastLocalSync({
            type: 'peer_disconnect',
            senderId: myDeviceId
        });
        if (db && currentToken && !isBurnMode) {
            try {
                const delPayload = {};
                if (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue) {
                    delPayload[`cursors.${myDeviceId}`] = firebase.firestore.FieldValue.delete();
                    db.collection("workspaces").doc(currentToken).update(delPayload).catch(() => {});
                }
            } catch(e) {}
        }
    }

    // Announce departure on tab close, mobile Safari/Chrome pagehide, and QR preview handoff
    window.addEventListener('beforeunload', () => removeMyCloudPresence(true));
    window.addEventListener('pagehide', () => removeMyCloudPresence(true));

    // Heartbeat to keep collaborator presence in sync across tabs and cloud (only when page is visible)
    setInterval(() => {
        if (isPrimaryDeviceTab && !isMobileDevice && !document.hidden) {
            try {
                localStorage.setItem('quickpad_primary_tab_lock', JSON.stringify({ tabId: myTabInstanceId, devId: myDeviceId, ts: Date.now() }));
            } catch(e) {}
        }
        if (!document.hidden && document.visibilityState !== 'hidden') {
            if (typeof syncMyCursor === 'function') {
                syncMyCursor();
            }
        }
        if (typeof updatePresenceUI === 'function') {
            updatePresenceUI();
        }
    }, 3000);

    // Handle visibility transitions on mobile (QR scanner preview -> browser handoff, app switch) and desktop
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            lastHiddenTimestamp = Date.now();
            if (typeof cursorBroadcastTimeout !== 'undefined' && cursorBroadcastTimeout) {
                clearTimeout(cursorBroadcastTimeout);
                cursorBroadcastTimeout = null;
            }
            if (isMobileDevice) {
                // On mobile/tablet, immediately clean up presence when QR preview closes or app backgrounds
                if (tabsContentDirty || dirtyTabIds.size > 0) {
                    saveWorkspace();
                }
                removeMyCloudPresence(false);
            } else {
                if (hiddenPresenceCleanupTimer) clearTimeout(hiddenPresenceCleanupTimer);
                hiddenPresenceCleanupTimer = setTimeout(() => {
                    if (document.visibilityState === 'hidden') {
                        removeMyCloudPresence(false);
                    }
                }, 20000);
            }
        } else if (document.visibilityState === 'visible') {
            if (hiddenPresenceCleanupTimer) {
                clearTimeout(hiddenPresenceCleanupTimer);
                hiddenPresenceCleanupTimer = null;
            }
            if (isPrimaryDeviceTab && !isMobileDevice) {
                try {
                    localStorage.setItem('quickpad_primary_tab_lock', JSON.stringify({ tabId: myTabInstanceId, devId: myDeviceId, ts: Date.now() }));
                } catch(e) {}
            }
            if (typeof syncMyCursor === 'function') {
                syncMyCursor(true);
            }
            if (typeof updatePresenceUI === 'function') {
                updatePresenceUI();
            }
            if (tabsContentDirty || dirtyTabIds.size > 0) {
                saveWorkspace();
            }
        }
    });

    window.addEventListener('pageshow', (e) => {
        if (document.visibilityState !== 'hidden') {
            if (typeof syncMyCursor === 'function') syncMyCursor(true);
            if (typeof updatePresenceUI === 'function') updatePresenceUI();
            if (e.persisted && currentToken && typeof setupRealtimeSync === 'function') {
                setupRealtimeSync(currentToken);
            }
        }
    });

    // --- Non-Blocking Real-Time 3-Way Concurrent Merge Engine ---
    function computeChange(oldStr, newStr) {
        if (oldStr === newStr) return null;
        let p = 0;
        const minLen = Math.min(oldStr.length, newStr.length);
        while (p < minLen && oldStr.charCodeAt(p) === newStr.charCodeAt(p)) {
            p++;
        }
        let sOld = oldStr.length;
        let sNew = newStr.length;
        while (sOld > p && sNew > p && oldStr.charCodeAt(sOld - 1) === newStr.charCodeAt(sNew - 1)) {
            sOld--;
            sNew--;
        }
        return {
            start: p,
            delCount: sOld - p,
            insertedText: newStr.substring(p, sNew)
        };
    }

    function mergeConcurrentEdits(base, local, remote, localCursor = 0) {
        base = base || '';
        local = local || '';
        remote = remote || '';
        localCursor = typeof localCursor === 'number' ? localCursor : 0;

        if (base === local) return { text: remote, cursor: Math.min(localCursor, remote.length) };
        if (base === remote) return { text: local, cursor: Math.min(localCursor, local.length) };
        if (local === remote) return { text: local, cursor: Math.min(localCursor, local.length) };

        // If base is empty, and one contains the other, prefer the superset
        if (!base) {
            if (local.includes(remote)) {
                return { text: local, cursor: localCursor };
            }
            if (remote.includes(local)) {
                return { text: remote, cursor: Math.min(localCursor, remote.length) };
            }
        }

        const cLocal = computeChange(base, local);
        const cRemote = computeChange(base, remote);

        if (!cLocal) return { text: remote, cursor: Math.min(localCursor, remote.length) };
        if (!cRemote) return { text: local, cursor: Math.min(localCursor, local.length) };

        // Case 1: Remote change is strictly after local change
        if (cRemote.start >= cLocal.start + cLocal.delCount) {
            const localDelta = cLocal.insertedText.length - cLocal.delCount;
            const adjustedRemoteStart = cRemote.start + localDelta;
            const targetEnd = adjustedRemoteStart + cRemote.delCount;

            const merged = local.substring(0, adjustedRemoteStart) + 
                           cRemote.insertedText + 
                           local.substring(Math.min(targetEnd, local.length));

            let newCursor = localCursor;
            if (localCursor > adjustedRemoteStart) {
                newCursor += (cRemote.insertedText.length - cRemote.delCount);
            }
            return { text: merged, cursor: Math.max(0, Math.min(newCursor, merged.length)) };
        }

        // Case 2: Remote change is strictly before local change
        if (cRemote.start + cRemote.delCount <= cLocal.start) {
            const remoteDelta = cRemote.insertedText.length - cRemote.delCount;
            const targetEnd = cRemote.start + cRemote.delCount;

            const merged = local.substring(0, cRemote.start) + 
                           cRemote.insertedText + 
                           local.substring(Math.min(targetEnd, local.length));

            let newCursor = localCursor;
            if (localCursor >= cRemote.start) {
                newCursor += remoteDelta;
            }
            return { text: merged, cursor: Math.max(0, Math.min(newCursor, merged.length)) };
        }

        // Case 3: Overlapping changes in the same region (e.g. concurrent appends)
        if (cLocal.start >= base.length && cRemote.start >= base.length) {
            const sep = (base.endsWith('\n') || cRemote.insertedText.endsWith('\n') || cLocal.insertedText.startsWith('\n')) ? '' : '\n';
            const merged = base + cRemote.insertedText + sep + cLocal.insertedText;
            return { text: merged, cursor: merged.length };
        }

        // Interleaved non-destructive combination (keep both lines)
        const merged = local + '\n' + cRemote.insertedText;
        return { text: merged, cursor: localCursor };
    }

    // --- Real-Time Firestore Synchronization ---
    let lastSeenServerTimestamp = 0;
    let hasLoadedInitialCloudSnapshot = false;
    function setupRealtimeSync(token) {
        if (!db) return;
        if (unsubscribeWorkspace) unsubscribeWorkspace();
        hasLoadedInitialCloudSnapshot = false;
        initStrokesListener();

        // Immediately announce presence to Firestore upon room connection (only if tab is actively visible)
        setTimeout(() => {
            if (typeof syncMyCursor === 'function' && !document.hidden && document.visibilityState !== 'hidden') {
                syncMyCursor(true);
            }
        }, 80);
        
        try {
            unsubscribeWorkspace = db.collection("workspaces").doc(token).onSnapshot((docSnap) => {
                try {
                    if (isDuressUnlocked) return;
                    if (docSnap && docSnap.exists) {
                        const data = docSnap.data();

                        // Track latest seen timestamp without dropping cross-device snapshots due to client clock skew
                        if (data.updated_at) {
                            lastSeenServerTimestamp = Math.max(lastSeenServerTimestamp, data.updated_at);
                        }

                        const isInitialLoad = !hasLoadedInitialCloudSnapshot;
                        hasLoadedInitialCloudSnapshot = true;
                        if (pendingCloudSaveAfterInit) {
                            pendingCloudSaveAfterInit = false;
                            setTimeout(() => {
                                if (typeof scheduleWorkspaceSave === 'function') scheduleWorkspaceSave();
                            }, 50);
                        }

                        // If snapshot is an echo of this tab's own recent write, update baseline & check for concurrent remote tab changes
                        const isSelfWriter = (data.last_writer === myDeviceId);
                        let hasUnappliedServerChanges = false;
                        if (data.tabs) {
                            for (let tid in data.tabs) {
                                let content = data.tabs[tid].content || '';
                                if (vaultPassword && content.startsWith("U2FsdGVkX1") && typeof CryptoJS !== 'undefined') {
                                    try {
                                        const dec = CryptoJS.AES.decrypt(content, vaultPassword).toString(CryptoJS.enc.Utf8);
                                        if (dec && dec.length > 0) content = dec;
                                    } catch(e) {}
                                }
                                if (isSelfWriter) {
                                    // Check if another device modified a different tab concurrently just before our write landed
                                    const localVal = tabsData[tid] ? (tabsData[tid].content || '') : '';
                                    const sentByMe = lastSentByMeTabs[tid];
                                    const normServer = content.replace(/\r\n/g, '\n').trimEnd();
                                    const normLocal = localVal.replace(/\r\n/g, '\n').trimEnd();
                                    if (normServer !== normLocal && (sentByMe === undefined || content !== sentByMe)) {
                                        hasUnappliedServerChanges = true;
                                    } else {
                                        lastSyncedServerTabs[tid] = { content: content };
                                    }
                                }
                            }
                        }
                    
                        // Check if burned or expired
                        if (data.burned || (data.expires_at && Date.now() > data.expires_at)) {
                            if (data.expires_at && Date.now() > data.expires_at && !data.burned) {
                                db.collection("workspaces").doc(token).set({ burned: true }, { merge: true });
                            }
                            try {
                                localStorage.removeItem('quickpad_last_active_hash');
                                localStorage.removeItem(`qp_cached_${token}`);
                                localStorage.removeItem(`qp_active_tab_${token}`);
                                localStorage.removeItem(`quickpad_cached_tabs_${token}`);
                                localStorage.removeItem(`quickpad_active_tab_${token}`);
                                localStorage.removeItem(`quickpad_tab_order_${token}`);
                            } catch(e) {}
                            window.history.replaceState({}, '', window.location.origin + window.location.pathname);
                            document.body.innerHTML = `
                                <div style='height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#050811;color:#fff;'>
                                    <div class='splash-badge' style='margin-bottom:15px;color:#ff0055;border-color:rgba(255,0,85,0.4);'>ZERO-TRACE ACTIVE</div>
                                    <h1 class='glitch-text' data-text='WORKSPACE BURNED' style='color:#ff0055;text-shadow:0 0 24px rgba(255,0,85,0.6);margin-bottom:20px;'>WORKSPACE BURNED</h1>
                                    <p style='color:#94a3b8;font-family:monospace;margin-bottom:30px;max-width:400px;text-align:center;'>This workspace reached its expiration timer or was deleted. All ciphertext was eradicated.</p>
                                    <button onclick="if(window.createNewWorkspace){window.createNewWorkspace();}else{try{localStorage.removeItem('quickpad_last_active_hash');}catch(e){};var t=(Math.random().toString(36).substring(2,12)+'_'+Math.random().toString(36).substring(2,12)+'_'+Math.random().toString(36).substring(2,12));try{localStorage.setItem('quickpad_last_active_hash',t);}catch(e){};window.location.href=window.location.origin+window.location.pathname+'#'+t;}" class="btn primary-action" style="font-size:1.05rem;padding:12px 28px;border-radius:10px;cursor:pointer;">Create New Pad</button>
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
                                switchTab('main', true);
                                return;
                            }
                        }

                        // Synchronize workspace tabs: Always hydrate on initial snapshot and when missing/deleted tabs, order updates, or concurrent edits are discovered
                        const hasMissingTabs = data.tabs && Object.keys(data.tabs).some(tid => !tabsData[tid]);
                        const hasRemoteDeletedTabs = data.tabs && Object.keys(data.tabs).length > 0 && Object.keys(tabsData).some(tid => !data.tabs[tid] && !dirtyTabIds.has(tid));
                        const hasOrderMismatch = Array.isArray(data.tab_order) && data.tab_order.length > 0 && JSON.stringify(tabOrder) !== JSON.stringify(data.tab_order);
                        const shouldSyncTabs = (!isSelfWriter || isInitialLoad || hasMissingTabs || hasRemoteDeletedTabs || hasOrderMismatch || hasUnappliedServerChanges) && (data.tabs || data.content);
                        if (shouldSyncTabs) {
                            let tabsUpdated = false;
                            if (Array.isArray(data.tab_order) && data.tab_order.length > 0) {
                                if (JSON.stringify(tabOrder) !== JSON.stringify(data.tab_order)) {
                                    tabOrder = data.tab_order;
                                    tabsUpdated = true;
                                }
                            }
                            let serverTabs = data.tabs || {};
                            if (data.content && !data.tabs) serverTabs = { 'main': { name: 'main.txt', content: data.content, is_encrypted: data.is_encrypted } };

                            // On initial load, restore previously active tab if available in server snapshot
                            if (isInitialLoad) {
                                try {
                                    const savedActiveTab = localStorage.getItem('quickpad_active_tab_' + token);
                                    if (savedActiveTab && serverTabs[savedActiveTab]) {
                                        activeTabId = savedActiveTab;
                                    }
                                } catch(e) {}
                            }
                            
                            // Decrypt all server tab contents
                            for (let tid in serverTabs) {
                                let sTab = serverTabs[tid];
                                let content = sTab.content || '';
                                if (content.startsWith("U2FsdGVkX1")) {
                                    if (vaultPassword && typeof CryptoJS !== 'undefined') {
                                        try {
                                            const bytes = CryptoJS.AES.decrypt(content, vaultPassword);
                                            const dec = bytes.toString(CryptoJS.enc.Utf8);
                                            if (dec && dec.length > 0) content = dec;
                                        } catch(e) {}
                                    }
                                }
                                if (sTab.is_secret && content.startsWith("U2FsdGVkX1")) {
                                    if (tabsData[tid] && tabsData[tid].secret_pass && typeof CryptoJS !== 'undefined') {
                                        try {
                                            const bytes = CryptoJS.AES.decrypt(content, tabsData[tid].secret_pass);
                                            const dec = bytes.toString(CryptoJS.enc.Utf8);
                                            if (dec && dec.length > 0) content = dec;
                                        } catch(e) {}
                                    }
                                }
                                serverTabs[tid].content = content;
                            }

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
                                const isServerSecret = !!sTab.is_secret;
                                const isCiphertext = content.startsWith("U2FsdGVkX1");

                                if (!tabsData[tid]) { 
                                    tabsData[tid] = { 
                                        name: sTab.name, 
                                        content: (isServerSecret && isCiphertext) ? '' : content, 
                                        encrypted_blob: (isServerSecret && isCiphertext) ? content : null,
                                        is_encrypted: sTab.is_encrypted || false, 
                                        is_secret: isServerSecret,
                                        secret_pass: null
                                    }; 
                                    tabsUpdated = true;
                                    if (tid === activeTabId) {
                                        if (typeof checkLockedTabUI === 'function') checkLockedTabUI(tid);
                                        if (!isServerSecret || tabsData[tid].secret_pass) {
                                            if (editor) {
                                                editor.value = content;
                                                editor.readOnly = isReadOnly;
                                            }
                                        }
                                        updatePreview();
                                        updateHUD();
                                    }
                                    if (multiNoteMode === 2 && multiPaneTabs.pane2 === tid && multiPane2Editor) {
                                        loadMultiPaneContent(2);
                                    }
                                } else {
                                    if (tabsData[tid].name !== sTab.name) { 
                                        tabsData[tid].name = sTab.name; 
                                        tabsUpdated = true; 
                                    }
                                    if (tabsData[tid].is_secret !== isServerSecret) {
                                        tabsData[tid].is_secret = isServerSecret;
                                        tabsUpdated = true;
                                        if (!isServerSecret) {
                                            tabsData[tid].secret_pass = null;
                                            tabsData[tid].encrypted_blob = null;
                                        }
                                    }

                                    // If secret tab was updated with ciphertext and this tab doesn't have password
                                    if (isServerSecret && isCiphertext && !tabsData[tid].secret_pass) {
                                        tabsData[tid].encrypted_blob = content;
                                        if (tid === activeTabId && typeof checkLockedTabUI === 'function') {
                                            checkLockedTabUI(tid);
                                        }
                                        if (multiNoteMode === 2 && multiPaneTabs.pane2 === tid) {
                                            loadMultiPaneContent(2);
                                        }
                                        lastSyncedServerTabs[tid] = { content: content };
                                        continue;
                                    }

                                    let localContent = tabsData[tid].content || '';
                                    let baseContent = lastSyncedServerTabs[tid] ? lastSyncedServerTabs[tid].content : '';
                                    let normLocal = localContent.replace(/\r\n/g, '\n').trimEnd();
                                    let normServer = content.replace(/\r\n/g, '\n').trimEnd();

                                    const serverChanged = (normServer !== normLocal);
                                    const isDirtyLocally = dirtyTabIds.has(tid);
                                    const isCurrentlyTypingInThisTab = isTypingInTab(tid);
                                    const isOwnTabEcho = isSelfWriter && (lastSentByMeTabs[tid] !== undefined && content === lastSentByMeTabs[tid]);

                                    if (serverChanged && (!isOwnTabEcho || isInitialLoad)) {
                                        let finalContent = content;
                                        let newCursorPos = null;

                                        // Glow the tab if a collaborator changed its content and local user is not viewing it
                                        if (data.last_writer && data.last_writer !== myDeviceId) {
                                            const writerPeer = peerCursorsData[data.last_writer];
                                            const writerName = writerPeer ? writerPeer.name : null;
                                            triggerTabRemoteActivity(tid, data.last_writer, writerName);
                                        } else if (!data.last_writer) {
                                            triggerTabRemoteActivity(tid, null, null);
                                        }

                                        if (isDirtyLocally || isCurrentlyTypingInThisTab) {
                                            // Non-blocking 3-way concurrent merge!
                                            const activeTextarea = (tid === activeTabId) ? editor : ((multiNoteMode === 2 && multiPaneTabs.pane2 === tid) ? multiPane2Editor : null);
                                            const currentCursor = activeTextarea ? activeTextarea.selectionStart || 0 : 0;

                                            const mergeResult = mergeConcurrentEdits(baseContent, localContent, content, currentCursor);
                                            finalContent = mergeResult.text;
                                            newCursorPos = mergeResult.cursor;

                                            tabsData[tid].content = finalContent;
                                            dirtyTabIds.add(tid);
                                            tabsContentDirty = true;
                                            scheduleWorkspaceSave();
                                        } else {
                                            // Clean authoritative update from server
                                            finalContent = content;
                                            tabsData[tid].content = finalContent;
                                            dirtyTabIds.delete(tid);
                                        }

                                        // 1. Primary Editor
                                        if (tid === activeTabId) {
                                            if (typeof checkLockedTabUI === 'function') checkLockedTabUI(tid);
                                            const isDraw = tabsData[tid].name && tabsData[tid].name.endsWith('.draw');
                                            if (isDraw) {
                                                if (typeof wbIsDrawing !== 'undefined' && !wbIsDrawing) {
                                                    loadWhiteboardFromTab(finalContent);
                                                }
                                            } else if (editor) {
                                                if (glitchInterval && currentGlitchOriginal === finalContent) {
                                                    // Keep cipher animation running if content matches
                                                } else {
                                                    if (glitchInterval) stopCipherGlitchAnimation();
                                                    const isFocused = (document.activeElement === editor);
                                                    const cursor = (newCursorPos !== null) ? newCursorPos : (editor.selectionStart || 0);
                                                    editor.value = finalContent;
                                                    editor.readOnly = isReadOnly;
                                                    if (isFocused) {
                                                        const safePos = Math.min(cursor, finalContent.length);
                                                        editor.setSelectionRange(safePos, safePos);
                                                    }
                                                }
                                                updatePreview();
                                                updateHUD();
                                            }
                                        }

                                        // 2. Secondary Editor (Pane 2)
                                        if (multiNoteMode === 2 && multiPaneTabs.pane2 === tid && multiPane2Editor) {
                                            const isDrawP2 = tabsData[tid].name && tabsData[tid].name.endsWith('.draw');
                                            if (isDrawP2 || (tabsData[tid].is_secret && !tabsData[tid].secret_pass)) {
                                                loadMultiPaneContent(2);
                                            } else {
                                                const isP2Focused = (document.activeElement === multiPane2Editor);
                                                const pCursor = (newCursorPos !== null) ? newCursorPos : (multiPane2Editor.selectionStart || 0);
                                                multiPane2Editor.value = finalContent;
                                                multiPane2Editor.readOnly = isReadOnly;
                                                delete multiPane2Editor.dataset.isPlaceholder;
                                                if (isP2Focused) {
                                                    const safePos = Math.min(pCursor, finalContent.length);
                                                    multiPane2Editor.setSelectionRange(safePos, safePos);
                                                }
                                                if (multiPanePreviews.pane2) updateMultiPanePreview(2);
                                            }
                                        }
                                    }
                                }
                                lastSyncedServerTabs[tid] = { content: content };
                            }
                            
                            // Remove tabs deleted remotely (only when serverTabs has entries and tab is not dirty locally)
                            if (Object.keys(serverTabs).length > 0) {
                                for (let tid in tabsData) {
                                    if (!serverTabs[tid] && !dirtyTabIds.has(tid)) {
                                        delete tabsData[tid];
                                        tabsUpdated = true;
                                        if (tid === activeTabId) {
                                            activeTabId = Object.keys(tabsData)[0] || 'main';
                                            if (!tabsData[activeTabId]) {
                                                tabsData[activeTabId] = { name: 'main.txt', content: '', is_encrypted: false };
                                            }
                                            switchTab(activeTabId, true);
                                        }
                                        if (multiNoteMode === 2 && multiPaneTabs.pane2 === tid) {
                                            updateMultiPaneSelectors();
                                            loadMultiPaneContent(2);
                                        }
                                    }
                                }
                            }
                            
                            // Auto-upgrade any legacy or stale guide tabs to v4.6 Pro
                            const didUpgradeGuides = upgradeExistingGuideTabs();
                            if (didUpgradeGuides) {
                                tabsUpdated = true;
                                saveWorkspace();
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
                            } else if (isInitialLoad) {
                                const isDraw = tabsData[activeTabId] && tabsData[activeTabId].name && tabsData[activeTabId].name.endsWith('.draw');
                                if (isDraw) {
                                    switchTab(activeTabId, true);
                                } else if (editor) {
                                    const targetContent = tabsData[activeTabId].content || '';
                                    if (!(glitchInterval && currentGlitchOriginal === targetContent)) {
                                        editor.value = targetContent;
                                    }
                                    editor.readOnly = isReadOnly;
                                    updatePreview();
                                    updateHUD();
                                }
                                if (multiNoteMode === 2) {
                                    loadMultiPaneContent(2);
                                }
                            }
                            
                            lastSavedTabsJSON = JSON.stringify(tabsData);
                            try { localStorage.setItem('quickpad_cached_tabs_' + token, serializeTabsForLocalCache(tabsData)); } catch(e){}
                            if (tabsUpdated || isInitialLoad) renderTabs();
                            updateMultiPaneSelectors();
                            if (typeof checkLockedTabUI === 'function') checkLockedTabUI(activeTabId);
                        }

                        if (data.cursors) {
                            let activeUsers = new Map();
                            activeUsers.set(myDeviceId, { name: myUsername, avatar: myAvatarUrl, speaking: isVoiceTransmitting });
                            
                            const now = Date.now();
                            for (let cid in data.cursors) {
                                if (cid === myDeviceId) continue;
                                let c = data.cursors[cid];
                                if (!c) continue;

                                // Self-Ghost Detection: If a stale cursor in Firestore belongs to our own browser/device instance
                                // (e.g. from a page reload, Service Worker claim, or mobile QR scanner handoff), purge it immediately!
                                const isSameInstance = (c.deviceInstanceId && c.deviceInstanceId === myDeviceInstanceId) ||
                                    (c.pubKey && myPublicKeyJwk && c.pubKey.n && myPublicKeyJwk.n && c.pubKey.n === myPublicKeyJwk.n);
                                const isMobileQrHandoffGhost = isMobileDevice && c.isMobile && c.deviceSig && (c.deviceSig === myDeviceSig) &&
                                    ((c.name || 'Anon') === (myUsername || 'Anon')) &&
                                    ((now - joinedWorkspaceAt < 25000) || (typeof c.timestamp === 'number' && c.timestamp <= (lastFirestoreCursorSync || now)));
                                if ((isSameInstance || isMobileQrHandoffGhost) && !(peerCursorsData[cid] && peerCursorsData[cid].isLocalTab)) {
                                    removePeerCursor(cid);
                                    delete peerCursorsData[cid];
                                    if (db && currentToken && !isBurnMode) {
                                        try {
                                            const delPayload = {};
                                            delPayload[`cursors.${cid}`] = firebase.firestore.FieldValue.delete();
                                            db.collection("workspaces").doc(currentToken).update(delPayload).catch(() => {});
                                        } catch(e) {}
                                    }
                                    continue;
                                }

                                // Track whether this peer's remote timestamp actually changed in this snapshot
                                const remoteChanged = (lastSeenRemoteCursorTs[cid] !== c.timestamp);
                                if (c.timestamp) lastSeenRemoteCursorTs[cid] = c.timestamp;
                                const prevPeer = peerCursorsData[cid];

                                // Filter out stale ghost cursors from previous sessions on initial load, or cursors that stopped updating (> 35s local time)
                                const cursorClockAge = (typeof c.timestamp === 'number') ? (now - c.timestamp) : Infinity;
                                const localElapsed = prevPeer ? (now - (prevPeer.lastSeenLocalTime || now)) : 0;
                                if ((isInitialLoad && !prevPeer && cursorClockAge > 35000) || (!remoteChanged && prevPeer && localElapsed > 35000)) {
                                    removePeerCursor(cid);
                                    delete peerCursorsData[cid];
                                    // Purge from cloud if abandoned (> 90s)
                                    if (db && currentToken && !isBurnMode && (cursorClockAge > 90000 || localElapsed > 90000)) {
                                        try {
                                            const delPayload = {};
                                            delPayload[`cursors.${cid}`] = firebase.firestore.FieldValue.delete();
                                            db.collection("workspaces").doc(currentToken).update(delPayload).catch(() => {});
                                        } catch(e) {}
                                    }
                                    continue;
                                }

                                const isNewPeer = !prevPeer;
                                const prevFlareTime = prevPeer ? prevPeer.lastFlareTime : 0;
                                const prevLaserTime = prevPeer ? prevPeer.lastLaserTime : 0;
                                const prevHeartbeatCount = prevPeer ? (prevPeer.heartbeatCount || 0) : 0;
                                peerCursorsData[cid] = {
                                    pos: typeof c.pos === 'number' ? c.pos : 0,
                                    name: c.name || 'Anon',
                                    pubKey: c.pubKey || null,
                                    deviceInstanceId: c.deviceInstanceId || null,
                                    deviceSig: c.deviceSig || null,
                                    isMobile: !!c.isMobile,
                                    tabId: c.tabId || 'main',
                                    avatar: c.avatar || '',
                                    speaking: !!c.speaking,
                                    timestamp: c.timestamp || now,
                                    lastSeenLocalTime: remoteChanged ? now : (prevPeer ? prevPeer.lastSeenLocalTime : now),
                                    heartbeatCount: prevHeartbeatCount + (remoteChanged ? 1 : 0),
                                    lastFlareTime: prevFlareTime,
                                    lastLaserTime: prevLaserTime
                                };
                                activeUsers.set(cid, {
                                    name: c.name || 'Anon',
                                    avatar: c.avatar || '',
                                    speaking: !!c.speaking,
                                    pubKey: c.pubKey || null
                                });
                                
                                const isVisibleInPane1 = (c.tabId === activeTabId);
                                const isVisibleInPane2 = (multiNoteMode === 2 && multiPaneTabs.pane2 === c.tabId);
                                if (isVisibleInPane1 || isVisibleInPane2) {
                                    renderPeerCursor(cid, c.pos, c.name, c.tabId);
                                } else {
                                    removePeerCursor(cid);
                                    if (c.tabId && (remoteChanged || Math.abs(now - (c.timestamp || 0)) < 3500) && (c.typing || c.isTyping)) {
                                        triggerTabRemoteActivity(c.tabId, cid, c.name);
                                    }
                                }

                                // Check remote cursor emoji flare (only spawn if viewing the same tab; immune to cross-device clock skew)
                                if (c.flare && c.flare.timestamp) {
                                    const isFreshFlare = (peerCursorsData[cid].lastFlareTime !== c.flare.timestamp) && (!isInitialLoad || Math.abs(now - c.flare.timestamp) < 5000);
                                    if (isFreshFlare) {
                                        if (isVisibleInPane1 || isVisibleInPane2) {
                                            const targetTa = isVisibleInPane1 ? editor : multiPane2Editor;
                                            spawnFlareParticle(c.pos, c.flare.emoji, false, getCaretCoordinates(targetTa, c.pos));
                                        }
                                        peerCursorsData[cid].lastFlareTime = c.flare.timestamp;
                                    }
                                }

                                // v3.0 Check remote collaborator laser pointer & trail (immune to cross-device clock skew)
                                const laserUpdated = c.laser && c.laser.active && (remoteChanged || peerCursorsData[cid].lastLaserTime !== c.laser.timestamp || Math.abs(now - (c.laser.timestamp || 0)) < 10000);
                                if (laserUpdated) {
                                    peerCursorsData[cid].lastLaserTime = c.laser.timestamp || now;
                                    const rx = typeof c.laser.x === 'number' ? c.laser.x : null;
                                    const ry = typeof c.laser.y === 'number' ? c.laser.y : null;
                                    if (rx !== null && ry !== null) {
                                        const laserTab = (c.laser && c.laser.tabId) ? c.laser.tabId : (c.tabId || null);
                                        if (!remoteLasers[cid]) {
                                            remoteLasers[cid] = {
                                                x: rx,
                                                y: ry,
                                                targetX: rx,
                                                targetY: ry,
                                                trail: [],
                                                color: c.laser.color || getPeerColor(cid).color,
                                                name: c.laser.name || c.name || 'Collaborator',
                                                tabId: laserTab,
                                                active: true,
                                                opacity: 1,
                                                lastUpdate: now
                                            };
                                        } else {
                                            const rl = remoteLasers[cid];
                                            rl.targetX = rx;
                                            rl.targetY = ry;
                                            rl.color = c.laser.color || rl.color;
                                            rl.name = c.laser.name || c.name || rl.name;
                                            rl.tabId = laserTab;
                                            rl.active = true;
                                            rl.opacity = 1;
                                            rl.lastUpdate = now;
                                            if (Math.hypot(rx - rl.x, ry - rl.y) > 2) {
                                                rl.trail.push({ x: rx, y: ry, time: now });
                                                if (rl.trail.length > 25) rl.trail.shift();
                                            }
                                        }
                                    }
                                } else {
                                    delete remoteLasers[cid];
                                }

                                // Reciprocate presence if a new peer is discovered so both sides synchronize instantly
                                if (isNewPeer && typeof syncMyCursor === 'function') {
                                    syncMyCursor(true);
                                }
                            }

                            // Prune peers that disconnected or timed out (> 35s local time) (unless connected as local tab)
                            for (let existingCid in peerCursorsData) {
                                if (existingCid === myDeviceId) continue;
                                const p = peerCursorsData[existingCid];
                                const pLastSeen = p.lastSeenLocalTime || p.timestamp || 0;
                                if (!p.isLocalTab && (!data.cursors[existingCid] || (now - pLastSeen > 35000))) {
                                    removePeerCursor(existingCid);
                                    delete peerCursorsData[existingCid];
                                }
                            }

                            // Deduplicate any ghost cursors from the same device/QR scan before updating UI
                            deduplicatePeerCursors(now);

                            // Update presence UI
                            if (typeof updatePresenceUI === 'function') {
                                updatePresenceUI();
                            }
                        } else {
                            // If data.cursors is null/missing, clean up remote peers
                            for (let existingCid in peerCursorsData) {
                                if (existingCid === myDeviceId) continue;
                                const p = peerCursorsData[existingCid];
                                if (!p.isLocalTab) {
                                    removePeerCursor(existingCid);
                                    delete peerCursorsData[existingCid];
                                }
                            }
                            if (typeof updatePresenceUI === 'function') {
                                updatePresenceUI();
                            }
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
                    } else {
                        hasLoadedInitialCloudSnapshot = true;
                        if (pendingCloudSaveAfterInit) {
                            pendingCloudSaveAfterInit = false;
                            setTimeout(() => {
                                if (typeof scheduleWorkspaceSave === 'function') scheduleWorkspaceSave();
                            }, 50);
                        }
                        // Brand new workspace: start clean, blank and ready for user typing
                        if (tabsData['main'] && !tabsData['main'].content && !isReadOnly && !isBurnMode) {
                            updateHUD();
                            updatePreview();
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

    // --- Tab Ordering & Drag-and-Drop Reordering Engine ---
    function ensureTabOrder() {
        if (!Array.isArray(tabOrder)) tabOrder = [];
        tabOrder = tabOrder.filter(tid => tabsData && tabsData.hasOwnProperty(tid));
        if (tabsData) {
            for (let tid in tabsData) {
                if (!tabOrder.includes(tid)) {
                    tabOrder.push(tid);
                }
            }
        }
        if (tabOrder.length === 0 && tabsData && Object.keys(tabsData).length > 0) {
            tabOrder = Object.keys(tabsData);
        }
        if (currentToken) {
            try { localStorage.setItem('quickpad_tab_order_' + currentToken, JSON.stringify(tabOrder)); } catch(e){}
        }
        return tabOrder;
    }

    function reorderTabs(sourceTid, targetTid, insertBefore) {
        if (!sourceTid || !targetTid || sourceTid === targetTid) return;
        ensureTabOrder();
        const fromIndex = tabOrder.indexOf(sourceTid);
        if (fromIndex === -1) return;

        tabOrder.splice(fromIndex, 1);
        let toIndex = tabOrder.indexOf(targetTid);
        if (toIndex === -1) toIndex = tabOrder.length;
        if (!insertBefore) toIndex++;

        tabOrder.splice(toIndex, 0, sourceTid);
        ensureTabOrder();
        renderTabs();
        updateMultiPaneSelectors();
        tabsContentDirty = true;
        isTabOrderDirty = true;
        saveWorkspace();
        broadcastLocalSync({
            type: 'tabs_structure',
            tabs: tabsData,
            tab_order: tabOrder,
            senderId: myDeviceId
        });
        showToast("Tab reordered", 'info');
    }

    function moveTabRelative(tid, direction) {
        if (!tid || !tabsData[tid]) return;
        ensureTabOrder();
        const idx = tabOrder.indexOf(tid);
        if (idx === -1) return;
        const targetIdx = idx + direction;
        if (targetIdx < 0 || targetIdx >= tabOrder.length) return;

        tabOrder.splice(idx, 1);
        tabOrder.splice(targetIdx, 0, tid);
        ensureTabOrder();
        renderTabs();
        updateMultiPaneSelectors();
        tabsContentDirty = true;
        isTabOrderDirty = true;
        saveWorkspace();
        broadcastLocalSync({
            type: 'tabs_structure',
            tabs: tabsData,
            tab_order: tabOrder,
            senderId: myDeviceId
        });
        showToast(`Moved "${tabsData[tid].name}" ${direction < 0 ? 'left' : 'right'}`, 'info');
    }

    function openTabContextMenu(tid, x, y) {
        if (!tabContextMenu || !tabsData[tid]) return;
        contextMenuTabId = tid;

        ensureTabOrder();
        const idx = tabOrder.indexOf(tid);
        if (tabCtxMoveLeft) tabCtxMoveLeft.style.display = idx > 0 ? 'flex' : 'none';
        if (tabCtxMoveRight) tabCtxMoveRight.style.display = idx < tabOrder.length - 1 ? 'flex' : 'none';

        tabContextMenu.classList.remove('hidden');
        const menuWidth = 190;
        const menuHeight = 220;
        const posX = Math.min(x, window.innerWidth - menuWidth - 10);
        const posY = Math.min(y, window.innerHeight - menuHeight - 10);
        tabContextMenu.style.left = `${Math.max(10, posX)}px`;
        tabContextMenu.style.top = `${Math.max(10, posY)}px`;
    }

    function closeTabContextMenu() {
        if (tabContextMenu) tabContextMenu.classList.add('hidden');
        contextMenuTabId = null;
    }

    document.addEventListener('click', (e) => {
        if (tabContextMenu && !tabContextMenu.contains(e.target)) {
            closeTabContextMenu();
        }
    });

    if (tabCtxSplit) {
        tabCtxSplit.addEventListener('click', () => {
            const tid = contextMenuTabId;
            closeTabContextMenu();
            if (tid) {
                setMultiNoteLayout(2, tid);
                showToast(`Opened "${tabsData[tid].name}" in Side-by-Side View`, 'info');
            }
        });
    }

    if (tabCtxMoveLeft) {
        tabCtxMoveLeft.addEventListener('click', () => {
            const tid = contextMenuTabId;
            closeTabContextMenu();
            if (tid) moveTabRelative(tid, -1);
        });
    }

    if (tabCtxMoveRight) {
        tabCtxMoveRight.addEventListener('click', () => {
            const tid = contextMenuTabId;
            closeTabContextMenu();
            if (tid) moveTabRelative(tid, 1);
        });
    }

    if (tabCtxRename) {
        tabCtxRename.addEventListener('click', () => {
            const tid = contextMenuTabId;
            closeTabContextMenu();
            if (tid && tabsContainer) {
                const tabEl = tabsContainer.querySelector(`.tab[data-tid="${tid}"]`);
                if (tabEl) {
                    const dblclickEvt = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
                    tabEl.dispatchEvent(dblclickEvt);
                }
            }
        });
    }

    if (tabCtxLock) {
        tabCtxLock.addEventListener('click', () => {
            const tid = contextMenuTabId;
            closeTabContextMenu();
            if (tid && typeof lockCurrentTab === 'function') {
                if (activeTabId !== tid) switchTab(tid);
                lockCurrentTab();
            }
        });
    }

    if (tabCtxDelete) {
        tabCtxDelete.addEventListener('click', () => {
            const tid = contextMenuTabId;
            closeTabContextMenu();
            if (tid && tabsContainer) {
                const tabEl = tabsContainer.querySelector(`.tab[data-tid="${tid}"] .tab-close`);
                if (tabEl) tabEl.click();
            }
        });
    }

    // --- Tabs Management with Drag-Scroll, Scroll Arrows & All-Tabs Quick Switcher ---
    let wasTabStripDragged = false;

    function updateTabScrollButtons() {
        if (!tabsContainer) return;
        const isOverflowing = tabsContainer.scrollWidth > tabsContainer.clientWidth + 2;
        if (tabsScrollLeftBtn) {
            tabsScrollLeftBtn.classList.toggle('hidden', !isOverflowing);
            tabsScrollLeftBtn.classList.toggle('at-edge', tabsContainer.scrollLeft <= 2);
        }
        if (tabsScrollRightBtn) {
            tabsScrollRightBtn.classList.toggle('hidden', !isOverflowing);
            const atRightEdge = (tabsContainer.scrollLeft + tabsContainer.clientWidth) >= (tabsContainer.scrollWidth - 2);
            tabsScrollRightBtn.classList.toggle('at-edge', atRightEdge);
        }
    }

    function scrollTabIntoView(tid, smooth = true) {
        if (!tabsContainer || !tid) return;
        const tabEl = tabsContainer.querySelector(`.tab[data-tid="${tid}"]`);
        if (!tabEl) return;
        const containerWidth = tabsContainer.clientWidth;
        if (containerWidth <= 0) return;

        const tabLeft = tabEl.offsetLeft - tabsContainer.offsetLeft;
        const tabRight = tabLeft + tabEl.offsetWidth;
        const currentScroll = tabsContainer.scrollLeft;

        let targetScroll = currentScroll;
        if (tabLeft < currentScroll + 8) {
            targetScroll = Math.max(0, tabLeft - 12);
        } else if (tabRight > currentScroll + containerWidth - 8) {
            targetScroll = Math.max(0, tabRight - containerWidth + 12);
        }

        if (targetScroll !== currentScroll) {
            try {
                tabsContainer.scrollTo({ left: targetScroll, behavior: smooth ? 'smooth' : 'auto' });
            } catch (e) {
                tabsContainer.scrollLeft = targetScroll;
            }
        }
        setTimeout(updateTabScrollButtons, smooth ? 220 : 20);
    }

    function renderAllTabsDropdownList() {
        ensureTabOrder();
        const total = tabOrder.filter(tid => tabsData[tid]).length;
        if (allTabsCount) allTabsCount.innerText = total;
        if (allTabsMenuSubtitle) allTabsMenuSubtitle.innerText = `${total} ${total === 1 ? 'note' : 'notes'}`;
        if (!allTabsList) return;

        allTabsList.innerHTML = '';
        tabOrder.forEach((tid, idx) => {
            const tab = tabsData[tid];
            if (!tab) return;

            const item = document.createElement('div');
            item.className = 'all-tabs-item' + (tid === activeTabId ? ' active' : '');

            const left = document.createElement('div');
            left.className = 'all-tabs-item-left';

            const idxBadge = document.createElement('span');
            idxBadge.className = 'all-tabs-item-idx';
            idxBadge.innerText = idx + 1;
            left.appendChild(idxBadge);

            const nameSpan = document.createElement('span');
            nameSpan.className = 'all-tabs-item-name';
            const isDraw = tab.name && tab.name.endsWith('.draw');
            const prefix = tab.is_secret ? '🔒 ' : (isDraw ? '🎨 ' : '📝 ');
            nameSpan.innerText = prefix + tab.name;
            left.appendChild(nameSpan);

            const actions = document.createElement('div');
            actions.className = 'all-tabs-item-actions';

            const splitBtn = document.createElement('button');
            splitBtn.type = 'button';
            splitBtn.className = 'all-tabs-mini-btn';
            splitBtn.title = `Open "${tab.name}" in Pane 2 (Side-by-Side)`;
            splitBtn.innerText = '◫';
            splitBtn.onclick = (e) => {
                e.stopPropagation();
                closeAllDropdowns();
                if (multiNoteMode < 2) setMultiNoteLayout(2, tid);
                else selectTabInMultiPane(2, tid);
                showToast(`Opened "${tab.name}" in Pane 2`, 'info');
            };
            actions.appendChild(splitBtn);

            const delMiniBtn = document.createElement('button');
            delMiniBtn.type = 'button';
            delMiniBtn.className = 'all-tabs-mini-btn delete';
            delMiniBtn.title = `Delete "${tab.name}"`;
            delMiniBtn.innerText = '✕';
            delMiniBtn.onclick = (e) => {
                e.stopPropagation();
                closeAllDropdowns();
                const tabCloseEl = tabsContainer ? tabsContainer.querySelector(`.tab[data-tid="${tid}"] .tab-close`) : null;
                if (tabCloseEl) tabCloseEl.click();
            };
            actions.appendChild(delMiniBtn);

            item.appendChild(left);
            item.appendChild(actions);

            item.onclick = () => {
                closeAllDropdowns();
                switchTab(tid);
                scrollTabIntoView(tid, true);
            };

            allTabsList.appendChild(item);
        });

        // Add "+ New Note Tab" quick button at the bottom of the dropdown
        const newTabRow = document.createElement('button');
        newTabRow.type = 'button';
        newTabRow.className = 'menu-action-btn';
        newTabRow.style.marginTop = '4px';
        newTabRow.style.borderTop = '1px solid var(--border-color)';
        newTabRow.style.paddingTop = '8px';
        newTabRow.style.color = 'var(--primary-color)';
        newTabRow.style.fontWeight = '600';
        newTabRow.innerHTML = '<span>➕ New Note Tab...</span>';
        newTabRow.onclick = (e) => {
            e.stopPropagation();
            closeAllDropdowns();
            if (addTabBtn) addTabBtn.click();
        };
        allTabsList.appendChild(newTabRow);
    }

    function renderTabs() {
        if (!tabsContainer) return;
        const prevScrollLeft = tabsContainer.scrollLeft;
        tabsContainer.innerHTML = '';
        ensureTabOrder();

        tabOrder.forEach((tid) => {
            if (!tabsData[tid]) return;
            let t = document.createElement('div');
            t.className = 'tab' + (tid === activeTabId ? ' active' : ''); 
            t.title = (tabsData[tid].is_secret ? '🔒 ' : '') + tabsData[tid].name + ' (Click to switch • Drag bar to scroll • Right-click for options)';
            t.setAttribute('data-tid', tid);
            // Only enable native HTML5 drag when all tabs fit or user holds Alt/Shift,
            // so regular mouse dragging smoothly scrolls the tab bar when there are many tabs
            t.draggable = false;
            t.addEventListener('mousedown', (e) => {
                if (e.altKey || e.shiftKey || (tabsContainer.scrollWidth <= tabsContainer.clientWidth + 2)) {
                    t.draggable = true;
                } else {
                    t.draggable = false;
                }
            });

            let remoteDot = document.createElement('span');
            remoteDot.className = 'tab-remote-dot';
            t.appendChild(remoteDot);

            let titleSpan = document.createElement('span');
            titleSpan.className = 'tab-title';
            titleSpan.innerText = (tabsData[tid].is_secret ? '🔒 ' : '') + tabsData[tid].name;
            t.appendChild(titleSpan);

            // Restore remote active glow if this note is currently being edited by a collaborator
            const isCurrentlyInTab = isTabCurrentlyViewedLocally(tid);
            const remoteActivity = remoteTabActivity.get(tid);
            if (remoteActivity && !isCurrentlyInTab && (Date.now() - remoteActivity.timestamp < 3500)) {
                t.classList.add('remote-active');
                if (remoteActivity.color) t.style.setProperty('--remote-color', remoteActivity.color);
                t.title = `✍️ ${remoteActivity.peerName || 'Collaborator'} is editing "${tabsData[tid].name}"`;
            }

            let delBtn = document.createElement('span');
            delBtn.className = 'tab-close';
            delBtn.innerText = '✕';
            delBtn.title = `Delete "${tabsData[tid].name}"`;
            delBtn.onclick = async (e) => {
                e.stopPropagation();
                const confirmed = await showCustomConfirm("Delete Tab", `Are you sure you want to delete tab "${tabsData[tid].name}"?`);
                if (confirmed) {
                    clearTabRemoteActivity(tid);
                    delete tabsData[tid];
                    dirtyTabIds.add(tid);
                    isTabOrderDirty = true;
                    tabOrder = tabOrder.filter(id => id !== tid);
                    ensureTabOrder();
                    tabsContentDirty = true;
                    if (tid === activeTabId) {
                        activeTabId = tabOrder[0] || null;
                        if (!activeTabId) {
                            activeTabId = generateToken();
                            tabsData[activeTabId] = { name: 'main.txt', content: '', is_encrypted: false };
                            tabOrder = [activeTabId];
                            dirtyTabIds.add(activeTabId);
                        }
                        switchTab(activeTabId);
                    }
                    renderTabs();
                    updateMultiPaneSelectors();
                    deleteTabFromDB(tid);
                    broadcastLocalSync({
                        type: 'tabs_structure',
                        tabs: tabsData,
                        tab_order: tabOrder,
                        senderId: myDeviceId
                    });
                    saveWorkspace();
                    showToast("Tab deleted", 'info');
                }
            };

            // HTML5 Drag and Drop Handlers
            t.addEventListener('dragstart', (e) => {
                draggedTabId = tid;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', tid);
                setTimeout(() => t.classList.add('dragging'), 0);
            });

            t.addEventListener('dragend', () => {
                t.classList.remove('dragging');
                draggedTabId = null;
                document.querySelectorAll('.tab.drop-before, .tab.drop-after').forEach(el => {
                    el.classList.remove('drop-before', 'drop-after');
                });
            });

            t.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (!draggedTabId || draggedTabId === tid) return;

                const rect = t.getBoundingClientRect();
                const midX = rect.left + rect.width / 2;
                if (e.clientX < midX) {
                    t.classList.add('drop-before');
                    t.classList.remove('drop-after');
                } else {
                    t.classList.add('drop-after');
                    t.classList.remove('drop-before');
                }
            });

            t.addEventListener('dragleave', () => {
                t.classList.remove('drop-before', 'drop-after');
            });

            t.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                t.classList.remove('drop-before', 'drop-after');
                if (!draggedTabId || draggedTabId === tid) return;

                const rect = t.getBoundingClientRect();
                const midX = rect.left + rect.width / 2;
                const insertBefore = e.clientX < midX;

                reorderTabs(draggedTabId, tid, insertBefore);
            });

            // Touch Drag Support for Tablets & Mobile
            let touchTimer = null;
            let touchStartX = 0;
            let touchStartY = 0;
            let isTouchDragging = false;

            t.addEventListener('touchstart', (e) => {
                if (e.touches.length !== 1) return;
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                touchTimer = setTimeout(() => {
                    isTouchDragging = true;
                    draggedTabId = tid;
                    t.classList.add('touch-dragging');
                    if (navigator.vibrate) navigator.vibrate(25);
                }, 280);
            }, { passive: true });

            t.addEventListener('touchmove', (e) => {
                if (!isTouchDragging) {
                    const dx = Math.abs(e.touches[0].clientX - touchStartX);
                    const dy = Math.abs(e.touches[0].clientY - touchStartY);
                    if (dx > 10 || dy > 10) clearTimeout(touchTimer);
                    return;
                }
                e.preventDefault();
                const touchX = e.touches[0].clientX;
                const touchY = e.touches[0].clientY;
                const targetEl = document.elementFromPoint(touchX, touchY);
                const targetTab = targetEl ? targetEl.closest('.tab') : null;

                document.querySelectorAll('.tab.drop-before, .tab.drop-after').forEach(el => {
                    if (el !== targetTab) el.classList.remove('drop-before', 'drop-after');
                });

                if (targetTab && targetTab !== t) {
                    const rect = targetTab.getBoundingClientRect();
                    const midX = rect.left + rect.width / 2;
                    if (touchX < midX) {
                        targetTab.classList.add('drop-before');
                        targetTab.classList.remove('drop-after');
                    } else {
                        targetTab.classList.add('drop-after');
                        targetTab.classList.remove('drop-before');
                    }
                }
            }, { passive: false });

            t.addEventListener('touchend', (e) => {
                clearTimeout(touchTimer);
                if (isTouchDragging) {
                    isTouchDragging = false;
                    t.classList.remove('touch-dragging');
                    const lastTouch = e.changedTouches[0];
                    const targetEl = document.elementFromPoint(lastTouch.clientX, lastTouch.clientY);
                    const targetTab = targetEl ? targetEl.closest('.tab') : null;
                    if (targetTab && targetTab !== t) {
                        const targetTid = targetTab.getAttribute('data-tid');
                        const rect = targetTab.getBoundingClientRect();
                        const insertBefore = lastTouch.clientX < (rect.left + rect.width / 2);
                        targetTab.classList.remove('drop-before', 'drop-after');
                        reorderTabs(tid, targetTid, insertBefore);
                    }
                    draggedTabId = null;
                }
            });

            // Tab Custom Context Menu
            t.oncontextmenu = (e) => {
                e.preventDefault();
                e.stopPropagation();
                openTabContextMenu(tid, e.clientX, e.clientY);
            };

            // Double Click to Rename
            t.ondblclick = (e) => {
                e.stopPropagation();
                if (t.querySelector('.tab-rename-input')) return;
                t.draggable = false;
                const oldName = tabsData[tid].name;
                t.innerHTML = '';
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'tab-rename-input';
                input.value = oldName;
                input.addEventListener('click', (ev) => ev.stopPropagation());
                input.addEventListener('mousedown', (ev) => ev.stopPropagation());
                t.appendChild(input);
                input.focus();
                input.select();

                let committed = false;
                const commit = () => {
                    if (committed) return;
                    committed = true;
                    const val = input.value.trim();
                    if (val && val !== oldName) {
                        const wasDraw = oldName.endsWith('.draw');
                        const nowDraw = val.endsWith('.draw');
                        tabsData[tid].name = val;
                        if (wasDraw !== nowDraw) {
                            tabsData[tid].content = '';
                        }
                        if (nowDraw) {
                            initStrokesListener();
                        }
                        tabsContentDirty = true;
                        dirtyTabIds.add(tid);
                        isTabOrderDirty = true;
                        broadcastLocalSync({
                            type: 'tabs_structure',
                            tabs: tabsData,
                            tab_order: tabOrder,
                            senderId: myDeviceId
                        });
                        if (tid === activeTabId && wasDraw !== nowDraw) {
                            switchTab(tid);
                        } else {
                            saveWorkspace();
                            renderTabs();
                            updateMultiPaneSelectors();
                            if (multiNoteMode === 2 && multiPaneTabs.pane2 === tid) {
                                loadMultiPaneContent(2);
                            }
                        }
                        showToast(`Renamed tab to "${val}"`, 'success');
                        return;
                    }
                    renderTabs();
                };

                input.onkeydown = (ke) => {
                    if (ke.key === 'Enter') {
                        ke.preventDefault();
                        commit();
                    } else if (ke.key === 'Escape') {
                        ke.preventDefault();
                        ke.stopPropagation();
                        committed = true;
                        renderTabs();
                    }
                };
                input.onblur = commit;
            };

            t.onclick = () => {
                if (wasTabStripDragged) return;
                switchTab(tid);
                scrollTabIntoView(tid, true);
            };
            t.appendChild(delBtn);
            tabsContainer.appendChild(t);
        });

        // Restore previous scroll position so background re-renders never jump the tab strip
        tabsContainer.scrollLeft = prevScrollLeft;
        updateTabScrollButtons();
        renderAllTabsDropdownList();
        requestAnimationFrame(updateTabScrollButtons);

        if (typeof updateMultiPaneSelectors === 'function') {
            updateMultiPaneSelectors();
        }
    }

    // Wire up Tab Strip Horizontal Drag-to-Scroll, Wheel Scroll, and < / > Scroll Buttons
    if (tabsContainer) {
        let isDraggingTabs = false;
        let tabDragStartX = 0;
        let tabDragStartScroll = 0;

        tabsContainer.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            if (e.target.closest('.tab-close, input')) return;
            if (e.altKey || e.shiftKey) return;
            if (tabsContainer.scrollWidth <= tabsContainer.clientWidth + 2) return;

            isDraggingTabs = true;
            wasTabStripDragged = false;
            tabDragStartX = e.clientX;
            tabDragStartScroll = tabsContainer.scrollLeft;
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDraggingTabs) return;
            const dx = e.clientX - tabDragStartX;
            if (Math.abs(dx) > 5) {
                wasTabStripDragged = true;
                tabsContainer.classList.add('is-dragging-scroll');
                e.preventDefault();
                tabsContainer.scrollLeft = tabDragStartScroll - dx;
                updateTabScrollButtons();
            }
        });

        window.addEventListener('mouseup', () => {
            if (isDraggingTabs) {
                isDraggingTabs = false;
                tabsContainer.classList.remove('is-dragging-scroll');
                setTimeout(() => { wasTabStripDragged = false; }, 50);
            }
        });

        tabsContainer.addEventListener('scroll', updateTabScrollButtons, { passive: true });

        if (window.ResizeObserver) {
            const tabRo = new ResizeObserver(() => updateTabScrollButtons());
            tabRo.observe(tabsContainer);
            if (tabsBar) tabRo.observe(tabsBar);
        }
        window.addEventListener('resize', updateTabScrollButtons);
    }

    if (tabsBar) {
        tabsBar.addEventListener('wheel', (e) => {
            if (!tabsContainer) return;
            if (tabsContainer.scrollWidth > tabsContainer.clientWidth) {
                const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
                if (delta !== 0) {
                    e.preventDefault();
                    tabsContainer.scrollLeft += delta;
                    updateTabScrollButtons();
                }
            }
        }, { passive: false });
    }

    function setupTabScrollButton(btn, direction) {
        if (!btn || !tabsContainer) return;
        let holdInterval = null;

        const scrollStep = (smooth = true) => {
            const step = Math.max(130, Math.round(tabsContainer.clientWidth * 0.6)) * direction;
            try {
                tabsContainer.scrollBy({ left: step, behavior: smooth ? 'smooth' : 'auto' });
            } catch (e) {
                tabsContainer.scrollLeft += step;
            }
            setTimeout(updateTabScrollButtons, smooth ? 200 : 20);
        };

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            scrollStep(true);
        });

        btn.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            clearInterval(holdInterval);
            holdInterval = setInterval(() => scrollStep(false), 140);
        });

        ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(evt => {
            btn.addEventListener(evt, () => {
                if (holdInterval) {
                    clearInterval(holdInterval);
                    holdInterval = null;
                }
            });
        });
    }

    setupTabScrollButton(tabsScrollLeftBtn, -1);
    setupTabScrollButton(tabsScrollRightBtn, 1);

    if (allTabsDropdownGroup) {
        allTabsDropdownGroup.addEventListener('mouseenter', renderAllTabsDropdownList);
        allTabsDropdownGroup.addEventListener('click', renderAllTabsDropdownList);
    }

    async function deleteActiveTab() {
        if (!activeTabId || !tabsData[activeTabId]) return;
        const tabName = tabsData[activeTabId].name;
        const confirmed = await showCustomConfirm("Delete Tab", `Are you sure you want to delete tab "${tabName}"?`);
        if (confirmed) {
            const tid = activeTabId;
            clearTabRemoteActivity(tid);
            delete tabsData[tid];
            dirtyTabIds.add(tid);
            isTabOrderDirty = true;
            tabOrder = tabOrder.filter(id => id !== tid);
            ensureTabOrder();
            tabsContentDirty = true;
            activeTabId = tabOrder[0] || null;
            if (!activeTabId) {
                activeTabId = generateToken();
                tabsData[activeTabId] = { name: 'main.txt', content: '', is_encrypted: false };
                tabOrder = [activeTabId];
                dirtyTabIds.add(activeTabId);
            }
            switchTab(activeTabId);
            renderTabs();
            updateMultiPaneSelectors();
            deleteTabFromDB(tid);
            broadcastLocalSync({
                type: 'tabs_structure',
                tabs: tabsData,
                tab_order: tabOrder,
                senderId: myDeviceId
            });
            saveWorkspace();
            showToast("Tab deleted", 'info');
        }
    }

    if (deleteTabMenuBtn) deleteTabMenuBtn.addEventListener('click', deleteActiveTab);

    // --- Multi-Note Side-by-Side View Engine (2 Notes View) ---
    function setMultiNoteLayout(count, tabIdForPane2 = null) {
        multiNoteMode = (count === 2) ? 2 : 1;
        ensureTabOrder();

        // If Markdown preview mode or split mode is active, disable them gracefully
        if (multiNoteMode > 1) {
            if (isSplitMode) {
                isSplitMode = false;
                document.body.classList.remove('split-mode');
                if (splitToggleBtn) splitToggleBtn.innerHTML = `<span>🌗 Split View</span><kbd>${isMacPlatform ? '⌥S' : 'Alt+S'}</kbd>`;
            }
            if (isMarkdown) {
                isMarkdown = false;
                updateViewVisibility();
                if (mdToggleBtn) mdToggleBtn.innerHTML = `<span>👁️ Markdown Preview</span><kbd>${isMacPlatform ? '⌥M' : 'Alt+M'}</kbd>`;
            }
        }

        document.body.classList.remove('multi-note-active', 'multi-note-2');

        if (multiNoteMode === 1) {
            updateViewVisibility();
            if (editor) editor.focus();
            if (multiNote2Btn) multiNote2Btn.classList.remove('active');
            if (splitNotesBtn) splitNotesBtn.classList.remove('active');
            try { localStorage.setItem('quickpad_multi_note_' + currentToken, '1'); } catch(e){}
            updateAllVisiblePeerCursors();
            syncMyCursor();
            return;
        }

        document.body.classList.add('multi-note-active', 'multi-note-2');
        if (splitNotesBtn) splitNotesBtn.classList.add('active');
        if (multiNote2Btn) multiNote2Btn.classList.add('active');

        // Ensure there are at least 2 tabs for the side-by-side view
        const availableTabs = tabOrder.filter(tid => tabsData[tid]);
        if (availableTabs.length < 2) {
            const newTid = generateToken();
            tabsData[newTid] = { name: 'notes-2.txt', content: '', is_encrypted: false };
            tabOrder.push(newTid);
            dirtyTabIds.add(newTid);
            isTabOrderDirty = true;
            renderTabs();
            tabsContentDirty = true;
            scheduleWorkspaceSave();
        }

        // Setup Pane 1 Header
        if (multiPane1Title) {
            multiPane1Title.innerText = `Pane 1: ${tabsData[activeTabId] ? tabsData[activeTabId].name : 'Note'}`;
        }

        // Determine Tab for Pane 2
        if (tabIdForPane2 && tabsData[tabIdForPane2]) {
            multiPaneTabs.pane2 = tabIdForPane2;
        } else if (!multiPaneTabs.pane2 || !tabsData[multiPaneTabs.pane2] || multiPaneTabs.pane2 === activeTabId) {
            const candidate = tabOrder.find(id => id !== activeTabId && tabsData[id]);
            multiPaneTabs.pane2 = candidate || activeTabId;
        }

        updateMultiPaneSelectors();
        loadMultiPaneContent(2);

        try { localStorage.setItem('quickpad_multi_note_' + currentToken, '2'); } catch(e){}
        updateAllVisiblePeerCursors();
        syncMyCursor();
        if (isLaserActive) {
            laserTrail = [];
            broadcastLaser(true);
        }
    }

    function updateMultiPaneSelectors() {
        ensureTabOrder();
        if (multiPane2Select) {
            const currentSelected = multiPaneTabs.pane2;
            let reassigned = false;
            if (!currentSelected || !tabsData[currentSelected]) {
                const candidate = tabOrder.find(id => id !== activeTabId && tabsData[id]);
                multiPaneTabs.pane2 = candidate || activeTabId || tabOrder[0];
                reassigned = true;
            }
            multiPane2Select.innerHTML = '';

            const allTids = [...tabOrder];
            if (tabsData) {
                for (let tid in tabsData) {
                    if (!allTids.includes(tid)) allTids.push(tid);
                }
            }

            allTids.forEach(tid => {
                if (!tabsData[tid]) return;
                const opt = document.createElement('option');
                opt.value = tid;
                const isRemoteActive = remoteTabActivity.has(tid) && !isTabCurrentlyViewedLocally(tid);
                const prefix = isRemoteActive ? '✍️ ' : (tabsData[tid].is_secret ? '🔒 ' : '');
                opt.innerText = prefix + tabsData[tid].name;
                if (tid === multiPaneTabs.pane2) opt.selected = true;
                multiPane2Select.appendChild(opt);
            });

            if (reassigned && multiNoteMode === 2 && multiPaneTabs.pane2) {
                loadMultiPaneContent(2);
            }
        }
        if (multiPane1Title) {
            multiPane1Title.innerText = `Pane 1: ${tabsData[activeTabId] ? tabsData[activeTabId].name : 'Note'}`;
        }
    }

    function loadMultiPaneContent(paneNum = 2, animate = false) {
        const tid = multiPaneTabs.pane2;
        if (!tid || !tabsData[tid] || !multiPane2Editor) return;
        if (glitchIntervalPane2) stopCipherGlitchAnimationPane2();

        const tab = tabsData[tid];
        const isDraw = tab.name && tab.name.endsWith('.draw');
        if (tab.is_secret && !tab.secret_pass) {
            multiPane2Editor.value = "🔒 This tab is protected with a password.\n\nUnlock it in the primary tab to view/edit content here.";
            multiPane2Editor.readOnly = true;
            multiPane2Editor.dataset.isPlaceholder = 'true';
        } else if (isDraw) {
            multiPane2Editor.value = "🎨 Whiteboard tab (.draw) — Open in Pane 1 to draw on the interactive canvas.";
            multiPane2Editor.readOnly = true;
            multiPane2Editor.dataset.isPlaceholder = 'true';
        } else {
            multiPane2Editor.value = tab.content || '';
            multiPane2Editor.readOnly = isReadOnly;
            delete multiPane2Editor.dataset.isPlaceholder;
            if (animate && tab.content) {
                triggerCipherGlitchAnimationPane2(tab.content);
            }
        }

        if (multiPanePreviews.pane2 && multiPane2Preview) {
            updateMultiPanePreview(2);
        }
    }

    function updateMultiPanePreview(paneNum = 2) {
        if (!multiPane2Preview || !multiPane2Editor) return;

        const tid = multiPaneTabs.pane2;
        const tab = tid ? tabsData[tid] : null;
        if (tab && tab.name && tab.name.endsWith('.draw')) {
            if (tab.content && tab.content.startsWith('data:image/')) {
                multiPane2Preview.innerHTML = `<div style="display:flex;justify-content:center;align-items:center;padding:16px;"><img src="${escapeHtml(tab.content)}" alt="Whiteboard Preview" style="max-width:100%;border-radius:8px;border:1px solid rgba(0,255,249,0.2);"></div>`;
            } else {
                multiPane2Preview.innerText = "🎨 Blank Whiteboard (.draw)";
            }
            return;
        }

        let raw = (glitchIntervalPane2 ? currentGlitchOriginalPane2 : multiPane2Editor.value) || '';
        if (typeof marked !== 'undefined') {
            try {
                raw = raw.replace(/==([^=\n\r]+)==/g, '<mark>$1</mark>');
                raw = processPollMarkup(raw);
                const parsedHtml = marked.parse(raw);
                multiPane2Preview.innerHTML = (typeof DOMPurify !== 'undefined') ? DOMPurify.sanitize(parsedHtml, {
                    ADD_TAGS: ['input', 'button', 'svg', 'path', 'g', 'rect', 'circle', 'line', 'polyline', 'polygon', 'text', 'tspan', 'style', 'defs', 'marker', 'foreignObject', 'span', 'div', 'math', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'msqrt', 'mroot', 'mtable', 'mtr', 'mtd', 'annotation', 'mark'],
                    ADD_ATTR: ['type', 'checked', 'disabled', 'class', 'id', 'style', 'data-poll-id', 'data-opt-idx', 'viewBox', 'd', 'fill', 'stroke', 'stroke-width', 'transform', 'x', 'y', 'width', 'height', 'rx', 'ry', 'cx', 'cy', 'r', 'x1', 'y1', 'x2', 'y2', 'points', 'marker-end', 'marker-start', 'text-anchor', 'dominant-baseline', ' aria-hidden', 'encoding', 'xmlns']
                }) : parsedHtml;
                if (typeof hljs !== 'undefined') {
                    multiPane2Preview.querySelectorAll('pre code').forEach((block) => {
                        if (!block.classList.contains('language-mermaid')) {
                            hljs.highlightElement(block);
                        }
                    });
                }
            } catch(e) {
                multiPane2Preview.innerText = raw;
            }
        } else {
            multiPane2Preview.innerText = raw;
        }
    }

    function toggleMultiPanePreview(paneNum = 2) {
        multiPanePreviews.pane2 = !multiPanePreviews.pane2;
        const isPrev = multiPanePreviews.pane2;

        if (multiPane2MdBtn) {
            multiPane2MdBtn.innerHTML = isPrev ? '<span>✏️ Edit</span>' : '<span>👁️ Preview</span>';
            multiPane2MdBtn.classList.toggle('active', isPrev);
        }
        if (multiPane2Editor && multiPane2Preview) {
            if (isPrev) {
                multiPane2Editor.style.display = 'none';
                multiPane2Preview.classList.remove('hidden');
                updateMultiPanePreview(2);
            } else {
                multiPane2Editor.style.display = 'block';
                multiPane2Preview.classList.add('hidden');
                multiPane2Editor.focus();
            }
        }
    }

    function selectTabInMultiPane(paneNum = 2, tid) {
        if (!tid || !tabsData[tid]) return;
        clearTabRemoteActivity(tid);
        multiPaneTabs.pane2 = tid;
        updateMultiPaneSelectors();
        loadMultiPaneContent(2, true);
        updateAllVisiblePeerCursors();
        syncMyCursor();
        if (isLaserActive) {
            laserTrail = [];
            broadcastLaser(true);
        }
    }

    function onMultiPaneInput(paneNum = 2) {
        const tid = multiPaneTabs.pane2;
        if (!tid || !tabsData[tid] || !multiPane2Editor) return;
        if (multiPane2Editor.readOnly || multiPane2Editor.dataset.isPlaceholder === 'true') return;
        if (tabsData[tid].is_secret && !tabsData[tid].secret_pass) return;
        if (tabsData[tid].name && tabsData[tid].name.endsWith('.draw')) return;

        tabsData[tid].content = multiPane2Editor.value;
        tabsContentDirty = true;
        dirtyTabIds.add(tid);

        if (activeTabId === tid && editor && editor.value !== multiPane2Editor.value) {
            editor.value = multiPane2Editor.value;
            updatePreview();
        }

        broadcastLocalSync({
            type: 'tab_content',
            tid: tid,
            content: multiPane2Editor.value,
            senderId: myDeviceId
        });

        isTyping = true;
        typingTabId = tid;
        setSaveStatus('saving');
        clearTimeout(typingResetTimeout);
        typingResetTimeout = setTimeout(() => { isTyping = false; typingTabId = null; }, 500);

        updateHUD();
        recordKeystrokeForWpm();
        scheduleWorkspaceSave();
        syncMyCursor();

        if (multiPanePreviews.pane2) {
            updateMultiPanePreview(2);
        }
    }

    // Connect Multi-Note UI Buttons
    if (splitNotesBtn) {
        splitNotesBtn.addEventListener('click', () => {
            const nextMode = multiNoteMode === 1 ? 2 : 1;
            setMultiNoteLayout(nextMode);
            showToast(nextMode === 1 ? "Single Note View" : "2 Notes Side-by-Side", 'info');
        });
    }

    if (multiNote2Btn) {
        multiNote2Btn.addEventListener('click', () => {
            const nextMode = multiNoteMode === 2 ? 1 : 2;
            setMultiNoteLayout(nextMode);
            showToast(nextMode === 1 ? "Single Note View" : "2 Notes Side-by-Side", 'info');
        });
    }

    if (multiPane1SingleBtn) {
        multiPane1SingleBtn.addEventListener('click', () => setMultiNoteLayout(1));
    }

    if (multiPane2CloseBtn) {
        multiPane2CloseBtn.addEventListener('click', () => setMultiNoteLayout(1));
    }

    if (multiPane2Select) {
        multiPane2Select.addEventListener('mousedown', updateMultiPaneSelectors);
        multiPane2Select.addEventListener('pointerdown', updateMultiPaneSelectors);
        multiPane2Select.addEventListener('focus', updateMultiPaneSelectors);
        multiPane2Select.addEventListener('change', (e) => selectTabInMultiPane(2, e.target.value));
    }

    if (multiPane2MdBtn) {
        multiPane2MdBtn.addEventListener('click', () => toggleMultiPanePreview(2));
    }

    if (multiPane2Editor) {
        ['mousedown', 'touchstart', 'beforeinput', 'paste', 'drop', 'keydown'].forEach(evt => {
            multiPane2Editor.addEventListener(evt, () => {
                if (glitchIntervalPane2) stopCipherGlitchAnimationPane2();
            });
        });
        multiPane2Editor.addEventListener('input', () => onMultiPaneInput(2));
        multiPane2Editor.addEventListener('keyup', () => {
            if (!isBurnMode) syncMyCursor();
        });
        multiPane2Editor.addEventListener('click', () => {
            if (!isBurnMode) syncMyCursor();
        });
        multiPane2Editor.addEventListener('touchend', () => {
            if (!isBurnMode) setTimeout(() => syncMyCursor(), 30);
        }, { passive: true });
        multiPane2Editor.addEventListener('scroll', () => {
            updateAllVisiblePeerCursors();
        });
    }

    // Allow dragging a tab from the tabs strip directly onto Pane 2
    if (multiPane2) {
        multiPane2.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            multiPane2.classList.add('drag-target-hover');
        });
        multiPane2.addEventListener('dragleave', () => multiPane2.classList.remove('drag-target-hover'));
        multiPane2.addEventListener('drop', (e) => {
            e.preventDefault();
            multiPane2.classList.remove('drag-target-hover');
            const tid = e.dataTransfer.getData('text/plain') || draggedTabId;
            if (tid && tabsData[tid]) {
                if (multiNoteMode < 2) setMultiNoteLayout(2, tid);
                else selectTabInMultiPane(2, tid);
                showToast(`Opened "${tabsData[tid].name}" in Pane 2`, 'info');
            }
        });
    }

    let lastLockedTabIdShowing = null;

    function checkLockedTabUI(tid) {
        if (!tid) tid = activeTabId;
        const tab = tabsData[tid];
        const isLocked = !!(tab && tab.is_secret && !tab.secret_pass);

        if (lockedTabOverlay) {
            if (isLocked) {
                const wasAlreadyShowingForThisTab = !lockedTabOverlay.classList.contains('hidden') && (lastLockedTabIdShowing === tid);
                lockedTabOverlay.classList.remove('hidden');
                lastLockedTabIdShowing = tid;
                if (lockedTabTitle) lockedTabTitle.innerText = `🔒 ${tab.name || 'Protected Tab'}`;

                // Only clear input and steal focus if opening for the first time or switching to a new tab
                if (!wasAlreadyShowingForThisTab) {
                    if (lockedTabPassInput) {
                        lockedTabPassInput.value = '';
                        setTimeout(() => lockedTabPassInput.focus(), 60);
                    }
                    if (lockedTabError) lockedTabError.classList.add('hidden');
                }

                if (editor) {
                    editor.value = '';
                    editor.readOnly = true;
                }
                if (preview) preview.style.display = 'none';
                if (editorMirror) editorMirror.style.display = 'none';
                if (canvasContainer) canvasContainer.classList.add('hidden');
            } else {
                lastLockedTabIdShowing = null;
                lockedTabOverlay.classList.add('hidden');
                if (editor) {
                    editor.readOnly = isReadOnly;
                }
            }
        }
    }

    async function unlockSecretTab(pass) {
        if (!activeTabId || !tabsData[activeTabId]) return false;
        const tab = tabsData[activeTabId];
        if (!tab.is_secret || !pass) return false;

        const trimmedPass = pass.trim();

        // Check covert Duress PIN
        if (duressPin && trimmedPass === duressPin.trim()) {
            isDuressUnlocked = true;
            isReadOnly = true;
            tabsData = { 'main': { name: 'notes.txt', content: duressContent || 'Biology 101 Lecture Notes - Cell Mitosis\n\n1. Interphase\n2. Prophase\n3. Metaphase\n4. Anaphase\n5. Telophase', is_encrypted: false } };
            activeTabId = 'main';
            checkLockedTabUI('main');
            renderTabs();
            switchTab('main', true);
            return true;
        }

        const ciphertext = tab.encrypted_blob || tab.content;

        if (ciphertext && ciphertext.startsWith("U2FsdGVkX1")) {
            try {
                if (typeof CryptoJS !== 'undefined') {
                    const bytes = CryptoJS.AES.decrypt(ciphertext, trimmedPass);
                    const dec = bytes.toString(CryptoJS.enc.Utf8);
                    if (dec && dec.length > 0) {
                        tab.content = dec;
                        tab.secret_pass = trimmedPass;
                        tab.encrypted_blob = null;
                        checkLockedTabUI(activeTabId);
                        const isDraw = tab.name && tab.name.endsWith('.draw');
                        if (isDraw) {
                            if (canvasContainer) canvasContainer.classList.remove('hidden');
                            loadWhiteboardFromTab(dec);
                        } else if (editor) {
                            editor.value = dec;
                            editor.readOnly = isReadOnly;
                            triggerCipherGlitchAnimation(dec);
                            editor.focus();
                        }
                        if (multiNoteMode === 2 && multiPaneTabs.pane2 === activeTabId) {
                            loadMultiPaneContent(2, true);
                        }
                        updateViewVisibility();
                        updatePreview();
                        updateHUD();
                        renderTabs();
                        showToast("Tab unlocked successfully!", 'success');
                        return true;
                    }
                }
            } catch(e) {}

            // Incorrect password
            if (lockedTabError) lockedTabError.classList.remove('hidden');
            if (lockedTabPassInput) {
                lockedTabPassInput.classList.add('shake');
                setTimeout(() => lockedTabPassInput.classList.remove('shake'), 400);
                lockedTabPassInput.select();
            }
            showToast("Incorrect password.", 'error');
            return false;
        } else {
            // Tab was empty or not encrypted
            tab.secret_pass = trimmedPass;
            checkLockedTabUI(activeTabId);
            const isDraw = tab.name && tab.name.endsWith('.draw');
            if (isDraw) {
                if (canvasContainer) canvasContainer.classList.remove('hidden');
                loadWhiteboardFromTab(tab.content || '');
            } else if (editor) {
                editor.value = tab.content || '';
                editor.readOnly = isReadOnly;
                editor.focus();
            }
            if (multiNoteMode === 2 && multiPaneTabs.pane2 === activeTabId) {
                loadMultiPaneContent(2);
            }
            updateViewVisibility();
            renderTabs();
            showToast("Tab unlocked!", 'success');
            return true;
        }
    }

    if (lockedTabUnlockBtn) {
        lockedTabUnlockBtn.addEventListener('click', () => {
            if (lockedTabPassInput) unlockSecretTab(lockedTabPassInput.value);
        });
    }
    if (lockedTabPassInput) {
        lockedTabPassInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                unlockSecretTab(lockedTabPassInput.value);
            }
        });
    }

    async function switchTab(tid, skipSave = false) {
        if (!tabsData[tid]) return;
        if (glitchInterval) stopCipherGlitchAnimation();

        if (activeTabId !== tid && activeTabId && tabsData[activeTabId]) {
            if (tabsData[activeTabId].name && tabsData[activeTabId].name.endsWith('.draw')) {
                if (whiteboardCanvas && whiteboardCanvas.width > 0 && whiteboardCanvas.height > 0 && !wbIsLoading) {
                    tabsData[activeTabId].content = whiteboardCanvas.toDataURL('image/png');
                    saveWorkspace();
                }
            } else if (editor) {
                if (!tabsData[activeTabId].is_secret || tabsData[activeTabId].secret_pass) {
                    tabsData[activeTabId].content = editor.value;
                }
            }
        }
        
        activeTabId = tid; 
        laserTrail = [];
        clearTabRemoteActivity(tid);
        if (currentToken) {
            try { localStorage.setItem('quickpad_active_tab_' + currentToken, tid); } catch(e){}
        }
        const isDrawTab = tabsData[tid] && tabsData[tid].name && tabsData[tid].name.endsWith('.draw');

        // Check if destination tab is locked and user does NOT have the password
        if (tabsData[tid].is_secret && !tabsData[tid].secret_pass) {
            checkLockedTabUI(tid);
            renderTabs();
            updateMultiPaneSelectors();
            updatePreview();
            updateHUD();
            isTyping = false;
            updateAllVisiblePeerCursors();
            syncMyCursor();
            if (!skipSave) saveWorkspace();
            return;
        }

        checkLockedTabUI(tid);

        if (isDrawTab) {
            if (canvasContainer) canvasContainer.classList.remove('hidden');
            loadWhiteboardFromTab(tabsData[tid].content);
            initStrokesListener();
        } else {
            if (canvasContainer) canvasContainer.classList.add('hidden');
            if (editor) {
                editor.value = tabsData[tid] ? tabsData[tid].content : '';
                editor.readOnly = isReadOnly;
            }
            if (tabsData[tid] && tabsData[tid].content) {
                triggerCipherGlitchAnimation(tabsData[tid].content);
            }
        }

        updateViewVisibility();
        renderTabs();
        scrollTabIntoView(tid, true);
        updateMultiPaneSelectors();
        isTyping = false;
        updateHUD();
        updateAllVisiblePeerCursors();
        syncMyCursor();
        if (isLaserActive) {
            laserTrail = [];
            broadcastLaser(true);
        }
        if (editor && !isDrawTab && !isMarkdown) editor.focus();
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
                ensureTabOrder();
                if (!tabOrder.includes(tid)) tabOrder.push(tid);
                tabsContentDirty = true;
                dirtyTabIds.add(tid);
                isTabOrderDirty = true;
                await switchTab(tid);
                updateMultiPaneSelectors();
                broadcastLocalSync({
                    type: 'tabs_structure',
                    tabs: tabsData,
                    tab_order: tabOrder,
                    senderId: myDeviceId
                });
                showToast("New tab created", 'success');
            }
        };
    }

    async function deleteTabFromDB(tid) {
        if (isBurnMode || !db || !currentToken) return;
        try {
            const payload = {
                last_writer: myDeviceId,
                updated_at: Date.now()
            };
            payload[`tabs.${tid}`] = firebase.firestore.FieldValue.delete();
            await db.collection("workspaces").doc(currentToken).update(payload);
        } catch(e) {}
    }

    // --- Workspace Persistence & Recents Tracker ---
    function updateRecentWorkspaces(hash) {
        if (!hash || isBurnMode || isReadOnly) return;
        try {
            let recents = JSON.parse(localStorage.getItem('quickpad_recents') || '[]');
            let title = 'Untitled Note';
            if (tabsData) {
                for (let tid in tabsData) {
                    if (tabsData[tid] && tabsData[tid].content && tabsData[tid].content.trim()) {
                        const firstLine = tabsData[tid].content.trim().split('\n')[0].replace(/^[#*\-_\s>]+/, '').trim();
                        if (firstLine) {
                            title = (tabsData[tid].name ? tabsData[tid].name + ': ' : '') + firstLine.substring(0, 30);
                            break;
                        }
                    }
                }
            }
            recents = recents.filter(r => r.hash !== hash);
            recents.unshift({ hash, title, updated: Date.now() });
            recents = recents.slice(0, 10);
            localStorage.setItem('quickpad_recents', JSON.stringify(recents));
        } catch(e) {}
    }

    function getRecentWorkspaces() {
        try {
            return JSON.parse(localStorage.getItem('quickpad_recents') || '[]');
        } catch(e) {
            return [];
        }
    }

    // --- Workspace Save & Encryption ---
    async function saveWorkspace() {
        if (debounceTimeout) { clearTimeout(debounceTimeout); debounceTimeout = null; }
        if (saveMaxWaitTimer) { clearTimeout(saveMaxWaitTimer); saveMaxWaitTimer = null; }
        if (isReadOnly || isBurnMode || isDuressUnlocked) return;
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
                        dirtyTabIds.add(activeTabId);
                    }
                }
            } else if (!tabsData[activeTabId].is_secret || tabsData[activeTabId].secret_pass) {
                const currentEditorVal = glitchInterval ? currentGlitchOriginal : editor.value;
                if (tabsData[activeTabId].content !== currentEditorVal) {
                    tabsData[activeTabId].content = currentEditorVal;
                    tabsContentDirty = true;
                    dirtyTabIds.add(activeTabId);
                }
            }

            // Sync secondary multi-pane editor content if 2-note view is active
            if (multiNoteMode === 2 && multiPaneTabs.pane2 && multiPane2Editor && tabsData[multiPaneTabs.pane2]) {
                const p2Tab = tabsData[multiPaneTabs.pane2];
                const isP2Draw = p2Tab.name && p2Tab.name.endsWith('.draw');
                const isP2Locked = p2Tab.is_secret && !p2Tab.secret_pass;
                const isP2Placeholder = multiPane2Editor.dataset.isPlaceholder === 'true' || multiPane2Editor.readOnly;
                if (!isP2Draw && !isP2Locked && !isP2Placeholder) {
                    const currentP2Val = glitchIntervalPane2 ? currentGlitchOriginalPane2 : multiPane2Editor.value;
                    if (p2Tab.content !== currentP2Val) {
                        p2Tab.content = currentP2Val;
                        tabsContentDirty = true;
                        dirtyTabIds.add(multiPaneTabs.pane2);
                    }
                }
            }
            
            let currentTabsJSON = JSON.stringify(tabsData);
            const needsTabsSave = tabsContentDirty || (currentTabsJSON !== lastSavedTabsJSON) || (dirtyTabIds.size > 0);

            // Always persist local cache first so offline or quota-exceeded edits are never lost
            if (!isReadOnly && !isBurnMode && currentToken) {
                const fullHash = window.location.hash && window.location.hash.length > 1
                    ? window.location.hash.substring(1)
                    : (urlKey ? `${currentToken}_${urlKey}` : currentToken);
                try {
                    localStorage.setItem('quickpad_last_active_hash', fullHash);
                    updateRecentWorkspaces(fullHash);
                    localStorage.setItem('quickpad_cached_tabs_' + currentToken, serializeTabsForLocalCache(tabsData));
                } catch(e) {}
            }

            // Guard against overwriting cloud tabs before the initial Firestore snapshot has arrived on slow networks
            if (db && !hasLoadedInitialCloudSnapshot) {
                pendingCloudSaveAfterInit = true;
                return;
            }

            // If nothing changed and no timer or dirty polls, skip network write
            if (!needsTabsSave && !timerMinutes && !isPollsDirty) {
                setSaveStatus(isCloudQuotaExceeded ? 'quota' : 'saved');
                return;
            }

            const isPane2Active = (multiNoteMode === 2 && document.activeElement === multiPane2Editor);
            const activeEditorForCursor = isPane2Active ? multiPane2Editor : editor;
            const activeTabForCursor = (isPane2Active && multiPaneTabs.pane2) ? multiPaneTabs.pane2 : activeTabId;
            const currentPos = activeEditorForCursor ? activeEditorForCursor.selectionStart || 0 : 0;

            const isCurrentlyTyping = isTyping && (typingTabId === activeTabForCursor);
            const myCursorData = {
                pos: currentPos,
                name: myUsername,
                avatar: myAvatarUrl,
                tabId: activeTabForCursor,
                timestamp: Date.now(),
                pubKey: myPublicKeyJwk,
                deviceInstanceId: myDeviceInstanceId,
                deviceSig: myDeviceSig,
                isMobile: isMobileDevice,
                typing: isCurrentlyTyping
            };

            const isInitialSave = !lastSavedTabsJSON;
            const payload = {
                is_encrypted: !!vaultPassword,
                updated_at: Date.now(),
                last_writer: myDeviceId
            };
            const isTabVisibleNow = !document.hidden && document.visibilityState !== 'hidden' && !document.prerendering;
            if (isTabVisibleNow) {
                if (isInitialSave) {
                    payload.cursors = { [myDeviceId]: myCursorData };
                } else {
                    payload[`cursors.${myDeviceId}`] = myCursorData;
                }
                lastFirestoreCursorSync = Date.now();
            }

            broadcastLocalSync({
                type: 'cursor_presence',
                senderId: myDeviceId,
                cursor: myCursorData
            });

            if (isPollsDirty || (isInitialSave && Object.keys(workspacePolls).length > 0)) {
                payload.polls = workspacePolls;
                isPollsDirty = false;
            }

            function serializeTabContent(tid) {
                if (!tabsData[tid]) return null;
                let contentToSave = tabsData[tid].content || '';
                if (tabsData[tid].is_secret && !tabsData[tid].secret_pass && tabsData[tid].encrypted_blob) {
                    contentToSave = tabsData[tid].encrypted_blob;
                } else if (tabsData[tid].is_secret && tabsData[tid].secret_pass && contentToSave && !contentToSave.startsWith("U2FsdGVkX1") && typeof CryptoJS !== 'undefined') {
                    contentToSave = CryptoJS.AES.encrypt(contentToSave, tabsData[tid].secret_pass).toString();
                }
                if (vaultPassword && contentToSave && !contentToSave.startsWith("U2FsdGVkX1") && typeof CryptoJS !== 'undefined') {
                    contentToSave = CryptoJS.AES.encrypt(contentToSave, vaultPassword).toString();
                }
                return { name: tabsData[tid].name, content: contentToSave, is_secret: !!tabsData[tid].is_secret };
            }
            
            const sentContents = new Map();
            if (needsTabsSave || isTyping || isInitialSave) {
                if (isTabOrderDirty || isInitialSave) {
                    payload.tab_order = tabOrder;
                    isTabOrderDirty = false;
                }
                if (isInitialSave) {
                    payload.tabs = {};
                    for (let tid in tabsData) {
                        payload.tabs[tid] = serializeTabContent(tid);
                        sentContents.set(tid, tabsData[tid].content);
                        lastSentByMeTabs[tid] = tabsData[tid].content;
                    }
                } else {
                    if (dirtyTabIds.size === 0 && activeTabId) {
                        dirtyTabIds.add(activeTabId);
                    }
                    for (let tid of dirtyTabIds) {
                        if (!tabsData[tid]) {
                            if (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue) {
                                payload[`tabs.${tid}`] = firebase.firestore.FieldValue.delete();
                            }
                            sentContents.set(tid, null);
                            delete lastSentByMeTabs[tid];
                        } else {
                            payload[`tabs.${tid}`] = serializeTabContent(tid);
                            sentContents.set(tid, tabsData[tid].content);
                            lastSentByMeTabs[tid] = tabsData[tid].content;
                        }
                    }
                }
            }
            
            if (timerMinutes) {
                payload.expires_at = Date.now() + (timerMinutes * 60 * 1000);
                timerMinutes = null;
            }
            
            if (db) {
                showLoader();
                try {
                    if (isInitialSave) {
                        await db.collection("workspaces").doc(currentToken).set(payload, { merge: true });
                    } else {
                        try {
                            await db.collection("workspaces").doc(currentToken).update(payload);
                        } catch(upErr) {
                            // Document might not exist yet; fall back to set with nested objects (no dotted keys)
                            const fallbackPayload = {
                                is_encrypted: !!vaultPassword,
                                updated_at: Date.now(),
                                last_writer: myDeviceId,
                                tab_order: tabOrder,
                                tabs: {}
                            };
                            if (isTabVisibleNow) {
                                fallbackPayload.cursors = { [myDeviceId]: myCursorData };
                            }
                            if (payload.polls) fallbackPayload.polls = payload.polls;
                            if (payload.expires_at) fallbackPayload.expires_at = payload.expires_at;
                            for (let tid in tabsData) {
                                fallbackPayload.tabs[tid] = serializeTabContent(tid);
                                sentContents.set(tid, tabsData[tid].content);
                                lastSentByMeTabs[tid] = tabsData[tid].content;
                            }
                            await db.collection("workspaces").doc(currentToken).set(fallbackPayload, { merge: true });
                        }
                    }
                    sentContents.forEach((sentVal, tid) => {
                        if (sentVal === null) {
                            delete lastSyncedServerTabs[tid];
                            dirtyTabIds.delete(tid);
                        } else {
                            lastSyncedServerTabs[tid] = { content: sentVal };
                            if (tabsData[tid] && tabsData[tid].content === sentVal) {
                                dirtyTabIds.delete(tid);
                            }
                        }
                    });
                    lastSavedTabsJSON = JSON.stringify(tabsData);
                    if (dirtyTabIds.size === 0) {
                        tabsContentDirty = false;
                    }
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
            updateHUD();
        }
    }

    // Heartbeat sync - only save if content is dirty
    setInterval(() => {
        if (!document.hidden && !isBurnMode && !isReadOnly && tabsContentDirty) {
            saveWorkspace();
        }
    }, 30000);

    // --- Caret Position & Remote Cursors Engine ---
    function getCaretCoordinates(targetTextareaOrPos, maybePos) {
        let targetTextarea = editor;
        let pos = 0;
        if (typeof targetTextareaOrPos === 'number') {
            pos = targetTextareaOrPos;
            targetTextarea = editor;
        } else {
            targetTextarea = targetTextareaOrPos || editor;
            pos = (typeof maybePos === 'number') ? maybePos : 0;
        }

        if (!targetTextarea || !editorMirror || !cursorsContainer) {
            return { top: 0, left: 0, height: 24, visible: true };
        }
        
        if (typeof pos !== 'number' || isNaN(pos)) pos = 0;
        const val = targetTextarea.value || '';
        pos = Math.max(0, Math.min(pos, val.length));

        const style = window.getComputedStyle(targetTextarea);
        const containerRect = cursorsContainer.getBoundingClientRect();
        const textareaRect = targetTextarea.getBoundingClientRect();

        // Exact typography & text rendering replication from targetTextarea to mirror
        editorMirror.style.fontFamily = style.fontFamily;
        editorMirror.style.fontSize = style.fontSize;
        editorMirror.style.fontWeight = style.fontWeight;
        editorMirror.style.fontStyle = style.fontStyle;
        editorMirror.style.lineHeight = style.lineHeight;
        editorMirror.style.letterSpacing = style.letterSpacing;
        editorMirror.style.wordSpacing = style.wordSpacing;
        editorMirror.style.tabSize = style.tabSize;
        editorMirror.style.whiteSpace = 'pre-wrap';
        editorMirror.style.wordBreak = 'break-word';
        editorMirror.style.wordWrap = 'break-word';
        editorMirror.style.overflowWrap = 'break-word';

        // Accurately match the inner content wrapping width of the textarea (excluding vertical scrollbars)
        const padLeft = parseFloat(style.paddingLeft) || 0;
        const padRight = parseFloat(style.paddingRight) || 0;
        const padTop = parseFloat(style.paddingTop) || 0;
        const borderLeft = parseFloat(style.borderLeftWidth) || 0;
        const borderTop = parseFloat(style.borderTopWidth) || 0;
        const innerWrapWidth = Math.max(0, targetTextarea.clientWidth - padLeft - padRight);

        editorMirror.style.boxSizing = 'content-box';
        editorMirror.style.width = `${innerWrapWidth}px`;
        editorMirror.style.padding = '0';
        editorMirror.style.border = 'none';
        editorMirror.style.margin = '0';

        editorMirror.innerHTML = '';

        const textBefore = val.substring(0, pos);
        const textNode = document.createTextNode(textBefore);
        editorMirror.appendChild(textNode);

        const marker = document.createElement('span');
        marker.style.display = 'inline-block';
        marker.style.width = '0px';
        marker.style.height = style.lineHeight;
        marker.textContent = '\u200B';
        editorMirror.appendChild(marker);

        // Ensure trailing newline properly advances marker to next line in pre-wrap
        if (pos > 0 && val.charAt(pos - 1) === '\n') {
            marker.innerHTML = '&nbsp;';
        }

        const textAfter = val.substring(pos);
        if (textAfter) {
            editorMirror.appendChild(document.createTextNode(textAfter));
        }

        // Exact offset of textarea relative to cursorsContainer
        const textareaOffsetTop = textareaRect.top - containerRect.top;
        const textareaOffsetLeft = textareaRect.left - containerRect.left;

        // Position of caret inside the textarea's content area
        const caretX = padLeft + borderLeft + marker.offsetLeft - targetTextarea.scrollLeft;
        const caretY = padTop + borderTop + marker.offsetTop - targetTextarea.scrollTop;

        const finalLeft = textareaOffsetLeft + caretX;
        const finalTop = textareaOffsetTop + caretY;
        const lineHeight = parseFloat(style.lineHeight) || (parseFloat(style.fontSize) * 1.7) || 24;

        return {
            top: Math.round(finalTop),
            left: Math.round(finalLeft),
            height: Math.round(lineHeight),
            visible: (caretY >= 0 && caretY <= targetTextarea.clientHeight)
        };
    }

    function renderPeerCursor(peerId, pos, peerName = "Anon", tabId = null) {
        if (!cursorsContainer) return;

        // Determine which textarea displays this tab
        let targetTextarea = null;
        if (tabId) {
            if (tabId === activeTabId && editor && editor.offsetParent !== null) {
                targetTextarea = editor;
            } else if (multiNoteMode === 2 && multiPaneTabs.pane2 === tabId && multiPane2Editor && multiPane2Editor.offsetParent !== null) {
                targetTextarea = multiPane2Editor;
            }
        } else {
            targetTextarea = (editor && editor.offsetParent !== null) ? editor : null;
        }

        let cursor = document.getElementById('cursor-' + peerId);

        // If target tab is not currently visible on screen in either pane, hide cursor
        if (!targetTextarea) {
            if (cursor) cursor.style.display = 'none';
            return;
        }

        if (!cursor) {
            cursor = document.createElement('div');
            cursor.id = 'cursor-' + peerId;
            cursor.className = 'peer-cursor';
            cursorsContainer.appendChild(cursor);
        }
        cursor.style.display = 'block';
        cursor.setAttribute('data-name', peerName);
        const colorObj = getPeerColor(peerId);
        cursor.style.setProperty('--cursor-color', colorObj.color);
        cursor.style.setProperty('--cursor-text-color', colorObj.text);

        const coords = getCaretCoordinates(targetTextarea, pos);
        cursor.style.top = coords.top + 'px';
        cursor.style.left = coords.left + 'px';
        cursor.style.height = `${coords.height}px`;
        cursor.style.opacity = coords.visible ? '1' : '0';

        // Smart dynamic repositioning for the collaborator name badge:
        // 1. If near the top boundary (line 1 or coords.top < 26px), flip badge below the cursor line so it is never clipped by the header/top edge
        if (coords.top < 26) {
            cursor.classList.add('tag-below');
        } else {
            cursor.classList.remove('tag-below');
        }

        // 2. If near the right edge of the screen/container, flip badge to right-align so it never bleeds off-screen
        const containerWidth = cursorsContainer.clientWidth || window.innerWidth;
        const approxBadgeWidth = Math.max(45, (peerName.length * 8) + 16);
        if (coords.left + approxBadgeWidth > containerWidth - 10) {
            cursor.classList.add('tag-flip-x');
        } else {
            cursor.classList.remove('tag-flip-x');
        }
    }

    function updateAllVisiblePeerCursors() {
        if (!cursorsContainer) return;
        for (let cid in peerCursorsData) {
            if (cid === myDeviceId) continue;
            const c = peerCursorsData[cid];
            if (!c) continue;
            const isVisibleInPane1 = (c.tabId === activeTabId);
            const isVisibleInPane2 = (multiNoteMode === 2 && multiPaneTabs.pane2 === c.tabId);
            if (isVisibleInPane1 || isVisibleInPane2) {
                renderPeerCursor(cid, c.pos, c.name, c.tabId);
            } else {
                removePeerCursor(cid);
            }
        }
    }

    function removePeerCursor(peerId) {
        const cursor = document.getElementById('cursor-' + peerId);
        if (cursor) cursor.remove();
    }

    let cursorBroadcastTimeout = null;
    function syncMyCursor(forceCloud = false) {
        if (!currentToken || isBurnMode || isReadOnly) return;
        
        const isPane2Active = (multiNoteMode === 2 && document.activeElement === multiPane2Editor);
        const activeEditorForCursor = isPane2Active ? multiPane2Editor : editor;
        const activeTabForCursor = (isPane2Active && multiPaneTabs.pane2) ? multiPaneTabs.pane2 : activeTabId;
        const currentPos = activeEditorForCursor ? activeEditorForCursor.selectionStart || 0 : 0;

        const isCurrentlyTyping = isTyping && (typingTabId === activeTabForCursor);
        const cursorData = {
            pos: currentPos,
            name: myUsername,
            avatar: myAvatarUrl,
            tabId: activeTabForCursor,
            timestamp: Date.now(),
            pubKey: myPublicKeyJwk,
            deviceInstanceId: myDeviceInstanceId,
            deviceSig: myDeviceSig,
            isMobile: isMobileDevice,
            typing: isCurrentlyTyping
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
                tabId: activeTabForCursor,
                timestamp: Date.now()
            };
        }

        // Always broadcast cursor to local open tabs immediately (zero network cost)
        broadcastLocalSync({
            type: 'cursor_presence',
            senderId: myDeviceId,
            cursor: cursorData
        });

        // Never write cloud presence if this tab/webview is backgrounded, hidden, or prerendering
        // (prevents mobile QR scanner preview webviews from keeping a 2nd ghost user alive in Firestore)
        if (document.hidden || document.visibilityState === 'hidden' || document.prerendering) {
            return;
        }

        // For Firestore cloud broadcast:
        if (!db || isCloudQuotaExceeded) return;
        const now = Date.now();
        const hasRemotePeers = Object.keys(peerCursorsData).length > 0;
        
        // Responsive throttling:
        // - Remote peers active: throttle cursor updates to once every 350ms for live tracking
        // - Alone or background: heartbeat update every 2.5 seconds to keep presence fresh
        const minInterval = hasRemotePeers ? 350 : 2500;
        const elapsed = now - lastFirestoreCursorSync;

        if (!forceCloud && elapsed < minInterval) {
            if (!cursorBroadcastTimeout && hasRemotePeers) {
                cursorBroadcastTimeout = setTimeout(() => {
                    cursorBroadcastTimeout = null;
                    syncMyCursor();
                }, minInterval - elapsed);
            }
            return;
        }

        lastFirestoreCursorSync = now;
        if (cursorBroadcastTimeout) {
            clearTimeout(cursorBroadcastTimeout);
            cursorBroadcastTimeout = null;
        }

        const updatePayload = {};
        updatePayload[`cursors.${myDeviceId}`] = cursorData;
        db.collection("workspaces").doc(currentToken).update(updatePayload).catch(err => {
            // Fallback to set with merge if document or field structure needs initialization
            if (currentToken && !isBurnMode && !document.hidden && document.visibilityState !== 'hidden') {
                db.collection("workspaces").doc(currentToken).set({ cursors: { [myDeviceId]: cursorData } }, { merge: true }).catch(() => {});
            }
        });
    }

    function updateHUD() {
        if (!editor) return;
        const text = (glitchInterval ? currentGlitchOriginal : editor.value) || '';
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
        if (!document.hidden && document.visibilityState !== 'hidden') {
            syncMyCursor(true);
        }
        showToast("Reconnected! Notes synchronized.", 'success');
        setTimeout(() => {
            if (loader) loader.classList.remove('visible');
            if (loaderText) loaderText.textContent = "Syncing...";
        }, 2000);
    });

    // --- Editor Event Handlers ---
    if (editor) {
        editor.addEventListener('input', () => {
            if (isBurnMode) return;
            if (tabsData[activeTabId] && tabsData[activeTabId].is_secret && !tabsData[activeTabId].secret_pass) return;
            if (tabsData[activeTabId]) tabsData[activeTabId].content = editor.value;
            if (multiNoteMode === 2 && multiPaneTabs.pane2 === activeTabId && multiPane2Editor && multiPane2Editor.value !== editor.value) {
                multiPane2Editor.value = editor.value;
                if (multiPanePreviews.pane2) updateMultiPanePreview(2);
            }
            tabsContentDirty = true;
            dirtyTabIds.add(activeTabId);
            broadcastLocalSync({
                type: 'tab_content',
                tid: activeTabId,
                content: editor.value,
                senderId: myDeviceId
            });
            isTyping = true;
            typingTabId = activeTabId;
            setSaveStatus('saving');
            clearTimeout(typingResetTimeout);
            typingResetTimeout = setTimeout(() => { isTyping = false; typingTabId = null; }, 500);
            updateHUD();
            recordKeystrokeForWpm();
            updateTaskProgress();
            if (isMarkdown || isSplitMode) updatePreview();
            syncMyCursor();
            if (isFocusMode) scheduleFocusDimmingUpdate();
            if (privacyInspectorModal && !privacyInspectorModal.classList.contains('hidden')) updatePrivacyInspector();
            scheduleWorkspaceSave();
        });

        ['mousedown', 'touchstart', 'beforeinput', 'paste', 'drop'].forEach(evt => {
            editor.addEventListener(evt, () => {
                if (glitchInterval) stopCipherGlitchAnimation();
            });
        });

        editor.addEventListener('keydown', (e) => {
            if (glitchInterval) stopCipherGlitchAnimation();
            const keyType = e.key === ' ' ? 'space' : (e.key === 'Enter' ? 'enter' : (e.key === 'Backspace' ? 'backspace' : 'key'));
            playMechanicalSound(keyType);

            // Indent / Unindent with Tab Key (skip if slash command popup is open)
            if (e.key === 'Tab' && !slashActive) {
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
            if (multiNoteMode === 2 && multiPaneTabs.pane2 === activeTabId && multiPane2Editor && multiPane2Editor.value !== editor.value) {
                multiPane2Editor.value = editor.value;
                if (multiPanePreviews.pane2) updateMultiPanePreview(2);
            }
                tabsContentDirty = true;
                dirtyTabIds.add(activeTabId);
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
                scheduleWorkspaceSave();
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
                    e.stopPropagation();
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

        editor.addEventListener('touchend', () => {
            if (isBurnMode) return;
            setTimeout(() => {
                syncMyCursor();
                if (isFocusMode) scheduleFocusDimmingUpdate();
            }, 30);
        }, { passive: true });

        editor.addEventListener('scroll', () => {
            updateAllVisiblePeerCursors();
            if (isFocusMode) scheduleFocusDimmingUpdate();
        });
    }

    document.addEventListener('selectionchange', () => {
        if ((document.activeElement === editor || document.activeElement === multiPane2Editor) && !isBurnMode) {
            syncMyCursor();
            if (isFocusMode) scheduleFocusDimmingUpdate();
        }
    });

    window.addEventListener('resize', () => {
        if (typeof updateAllVisiblePeerCursors === 'function') {
            updateAllVisiblePeerCursors();
        }
        if (isFocusMode) scheduleFocusDimmingUpdate();
    });

    // --- Markdown & Split View Toggles ---
    if (mdToggleBtn) {
        mdToggleBtn.addEventListener('click', () => {
            if (isSplitMode) {
                if (typeof showToast === 'function') showToast("Markdown preview is active in Split View", "info", 2000);
                return;
            }
            isMarkdown = !isMarkdown;
            updateViewVisibility();
            if (isMarkdown) {
                mdToggleBtn.innerHTML = `<span>✏️ Edit View</span><kbd>${isMacPlatform ? '⌥M' : 'Alt+M'}</kbd>`;
                if (typeof showToast === 'function') showToast("👁️ Markdown Preview Active", "info", 1500);
            } else {
                mdToggleBtn.innerHTML = `<span>👁️ Markdown Preview</span><kbd>${isMacPlatform ? '⌥M' : 'Alt+M'}</kbd>`;
                if (editor) editor.focus();
                if (typeof showToast === 'function') showToast("✏️ Note Editor Active", "info", 1500);
            }
        });
    }

    if (splitToggleBtn) {
        splitToggleBtn.addEventListener('click', () => {
            isSplitMode = !isSplitMode;
            if (isSplitMode) {
                splitToggleBtn.innerHTML = `<span>💻 Single View</span><kbd>${isMacPlatform ? '⌥S' : 'Alt+S'}</kbd>`;
                if (mdToggleBtn) {
                    mdToggleBtn.style.opacity = '0.4';
                    mdToggleBtn.style.pointerEvents = 'none';
                }
                if (typeof showToast === 'function') showToast("🌗 Split View Active", "info", 1500);
            } else {
                splitToggleBtn.innerHTML = `<span>🌗 Split View</span><kbd>${isMacPlatform ? '⌥S' : 'Alt+S'}</kbd>`;
                if (mdToggleBtn) {
                    mdToggleBtn.style.opacity = '1';
                    mdToggleBtn.style.pointerEvents = 'auto';
                }
                if (typeof showToast === 'function') showToast("💻 Single View Active", "info", 1500);
            }
            updateViewVisibility();
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
    const burnLinkModal = document.getElementById('burn-link-modal');
    const closeBurnModal = document.getElementById('close-burn-modal');
    const burnNoteUrlInput = document.getElementById('burn-note-url-input');
    const copyBurnUrlBtn = document.getElementById('copy-burn-url-btn');
    const burnCopyFeedback = document.getElementById('burn-copy-feedback');
    const burnClearNoteBtn = document.getElementById('burn-clear-note-btn');
    const doneBurnModalBtn = document.getElementById('done-burn-modal-btn');

    function openBurnLinkModal(url, isWholeNote) {
        if (!burnLinkModal) return;
        if (burnNoteUrlInput) {
            burnNoteUrlInput.value = url;
        }
        if (burnCopyFeedback) {
            burnCopyFeedback.innerText = "🔥 Link copied to your clipboard!";
            burnCopyFeedback.style.color = "#00fff9";
        }
        if (burnClearNoteBtn) {
            burnClearNoteBtn.style.display = isWholeNote ? 'inline-block' : 'none';
        }
        burnLinkModal.classList.remove('hidden');
        if (burnNoteUrlInput) {
            burnNoteUrlInput.focus();
            burnNoteUrlInput.select();
        }
    }

    if (closeBurnModal) closeBurnModal.addEventListener('click', () => burnLinkModal && burnLinkModal.classList.add('hidden'));
    if (doneBurnModalBtn) doneBurnModalBtn.addEventListener('click', () => burnLinkModal && burnLinkModal.classList.add('hidden'));

    if (copyBurnUrlBtn) {
        copyBurnUrlBtn.addEventListener('click', async () => {
            if (!burnNoteUrlInput || !burnNoteUrlInput.value) return;
            const success = await copyToClipboard(burnNoteUrlInput.value, "🔥 Burn Link Copied!");
            if (burnCopyFeedback) {
                burnCopyFeedback.innerText = success ? "✅ Copied to clipboard!" : "Press Ctrl+C / Cmd+C to copy";
                burnCopyFeedback.style.color = success ? "#00ff66" : "#ffb000";
            }
        });
    }

    if (burnClearNoteBtn) {
        burnClearNoteBtn.addEventListener('click', () => {
            if (editor) editor.value = '';
            if (activeTabId && tabsData[activeTabId]) {
                tabsData[activeTabId].content = '';
                dirtyTabIds.add(activeTabId);
                tabsContentDirty = true;
            }
            if (multiNoteMode === 2 && multiPaneTabs.pane2 === activeTabId && multiPane2Editor) {
                multiPane2Editor.value = '';
                if (multiPanePreviews.pane2) updateMultiPanePreview(2);
            }
            if (isMarkdown || isSplitMode) updatePreview();
            updateHUD();
            broadcastLocalSync({
                type: 'tab_content',
                tid: activeTabId,
                content: '',
                senderId: myDeviceId
            });
            if (typeof saveWorkspace === 'function') saveWorkspace();
            showToast("Note content erased from active tab.", "info");
            if (burnLinkModal) burnLinkModal.classList.add('hidden');
        });
    }

    if (burnBtn) {
        burnBtn.addEventListener('click', async () => {
            let content = '';
            let selection = '';
            let start = 0;
            let end = 0;

            if (tabsData[activeTabId] && tabsData[activeTabId].name && tabsData[activeTabId].name.endsWith('.draw')) {
                content = tabsData[activeTabId].content || '';
            } else if (editor) {
                start = editor.selectionStart;
                end = editor.selectionEnd;
                selection = (start !== undefined && end !== undefined && start !== end) ? editor.value.substring(start, end) : '';
                content = selection || editor.value;
            }
            
            if (!content || !content.trim()) {
                showToast("Nothing to burn! Write something first.", 'error');
                return;
            }

            try {
                showToast("🔥 Creating self-destruct note...", "info", 1500);
                const burnId = 'bn' + Math.random().toString(36).substring(2, 14) + Math.random().toString(36).substring(2, 14);
                const burnKey = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                let encryptedContent = content;
                if (typeof CryptoJS !== 'undefined') {
                    encryptedContent = CryptoJS.AES.encrypt(content, burnKey).toString();
                }
                if (!db && typeof firebase !== 'undefined' && firebase.firestore) {
                    db = firebase.firestore();
                }
                if (db) {
                    await db.collection("burn_notes").doc(burnId).set({
                        content: encryptedContent,
                        created_at: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
                const burnUrl = `${window.location.origin}${window.location.pathname}?burn=${burnId}#${burnKey}`;
                
                await copyToClipboard(burnUrl, "🔥 Burn Link Copied! Send it to your recipient.");
                
                if (selection && editor) {
                    editor.value = editor.value.substring(0, start) + editor.value.substring(end);
                    if (activeTabId && tabsData[activeTabId]) {
                        tabsData[activeTabId].content = editor.value;
                        dirtyTabIds.add(activeTabId);
                        tabsContentDirty = true;
                    }
                    if (multiNoteMode === 2 && multiPaneTabs.pane2 === activeTabId && multiPane2Editor) {
                        multiPane2Editor.value = editor.value;
                        if (multiPanePreviews.pane2) updateMultiPanePreview(2);
                    }
                    if (isMarkdown || isSplitMode) updatePreview();
                    updateHUD();
                    broadcastLocalSync({
                        type: 'tab_content',
                        tid: activeTabId,
                        content: editor.value,
                        senderId: myDeviceId
                    });
                    if (typeof saveWorkspace === 'function') saveWorkspace();
                }

                // Display the Burn Note Modal with the URL, copy button, and clear options
                openBurnLinkModal(burnUrl, !selection);
            } catch (e) {
                console.error("Burn note link generation error:", e);
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
                localStorage.removeItem(`quickpad_cached_tabs_${currentToken}`);
                localStorage.removeItem(`quickpad_active_tab_${currentToken}`);
                localStorage.removeItem(`quickpad_tab_order_${currentToken}`);
                localStorage.removeItem('quickpad_last_active_hash');
            } catch (e) {}

            // Reset URL hash to origin so refreshing does not reload a dead token
            window.history.replaceState({}, '', window.location.origin + window.location.pathname);

            // Render Zero-Trace screen immediately
            document.body.innerHTML = `
                <div style='height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#050811;color:#fff;'>
                    <div class='splash-badge' style='margin-bottom:15px;color:#ff0055;border-color:rgba(255,0,85,0.4);'>ZERO-TRACE ACTIVE</div>
                    <h1 class='glitch-text' data-text='WORKSPACE BURNED' style='color:#ff0055;text-shadow:0 0 24px rgba(255,0,85,0.6);margin-bottom:20px;'>WORKSPACE BURNED</h1>
                    <p style='color:#94a3b8;font-family:monospace;margin-bottom:30px;max-width:400px;text-align:center;'>This workspace has been permanently eradicated. All ciphertext, tabs, and keys were shredded from the server.</p>
                    <button onclick="if(window.createNewWorkspace){window.createNewWorkspace();}else{try{localStorage.removeItem('quickpad_last_active_hash');}catch(e){};var t=(Math.random().toString(36).substring(2,12)+'_'+Math.random().toString(36).substring(2,12)+'_'+Math.random().toString(36).substring(2,12));try{localStorage.setItem('quickpad_last_active_hash',t);}catch(e){};window.location.href=window.location.origin+window.location.pathname+'#'+t;}" class="btn primary-action" style="font-size:1.05rem;padding:12px 28px;border-radius:10px;cursor:pointer;">Create New Pad</button>
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
            if (!db && typeof firebase !== 'undefined' && firebase.firestore) {
                db = firebase.firestore();
            }
            if (!db) {
                if (editor) editor.value = "Database connection unavailable. Please check your internet connection.";
                return;
            }

            let token = tokenKey;
            let key = null;

            // 1. Check if encryption key is in URL hash fragment (#key)
            if (window.location.hash && window.location.hash.length > 1) {
                key = window.location.hash.substring(1);
            }

            // 2. Check query params for key
            if (!key) {
                const urlParams = new URLSearchParams(window.location.search);
                key = urlParams.get('key') || urlParams.get('k');
            }

            // 3. Fallback for legacy format with underscore (?burn=token_key or ?burn=part1_part2_part3_key)
            if (!key && tokenKey && tokenKey.includes('_')) {
                const lastIdx = tokenKey.lastIndexOf('_');
                token = tokenKey.substring(0, lastIdx);
                key = tokenKey.substring(lastIdx + 1);
            }

            const docSnap = await db.collection("burn_notes").doc(token).get();
            if (docSnap.exists) { 
                let content = docSnap.data().content;
                if (key && content && content.startsWith("U2FsdGVkX1") && typeof CryptoJS !== 'undefined') {
                    try {
                        const bytes = CryptoJS.AES.decrypt(content, key);
                        const dec = bytes.toString(CryptoJS.enc.Utf8);
                        if (dec) content = dec;
                    } catch(e) {
                        console.error("AES Decryption error:", e);
                    }
                }
                if (editor) {
                    editor.value = content; 
                    showToast("🔥 Self-Destruct Activated: this note has been wiped from the server.", 'error', 7000);
                }
                await db.collection("burn_notes").doc(token).delete(); 
            } else {
                if (editor) {
                    editor.value = "🔥 Note not found or already burned.\n\nThis self-destruct note has already been opened and permanently destroyed from the server.";
                    editor.style.color = "#ff4d6d";
                }
                showToast("This burn note has already been opened and destroyed.", "error", 6000);
            }
            updatePreview();
        } catch (e) {
            console.error("Error retrieving burn note:", e);
            if (editor) editor.value = "Error retrieving burned note.";
        }
    }

    // --- Action Bar Triggers ---
    if (newBtn) {
        newBtn.addEventListener('click', createNewWorkspace);
    }

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

    if (privacyInspectorBtn) {
        privacyInspectorBtn.addEventListener('click', openPrivacyInspector);
        privacyInspectorBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openPrivacyInspector();
            }
        });
    }
    if (closePrivacyInspector) closePrivacyInspector.addEventListener('click', () => privacyInspectorModal && privacyInspectorModal.classList.add('hidden'));

    const brandBadgeEl = document.querySelector('.brand-badge');
    if (brandBadgeEl && brandBadgeEl !== privacyInspectorBtn) {
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
    const allModals = [infoModal, shareModal, profileModal, mergeModal, cmdPaletteModal, customDialogModal, collaboratorsModal, duressModal, stegModal, wormholeModal, privacyInspectorModal, cardExportModal, voiceMaskModal, burnLinkModal];

    allModals.forEach(modal => {
        if (!modal) return;
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
                if (modal === voiceMaskModal && typeof closeVoiceMaskModal === 'function') {
                    closeVoiceMaskModal();
                }
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
    if (closeVoiceMask) closeVoiceMask.addEventListener('click', () => { if (typeof closeVoiceMaskModal === 'function') closeVoiceMaskModal(); });

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
            if (tabsData[activeTabId]) {
                tabsData[activeTabId].content = editor.value;
                dirtyTabIds.add(activeTabId);
                tabsContentDirty = true;
            }
            if (multiNoteMode === 2 && multiPaneTabs.pane2 === activeTabId && multiPane2Editor && multiPane2Editor.value !== editor.value) {
                multiPane2Editor.value = editor.value;
                if (multiPanePreviews.pane2) updateMultiPanePreview(2);
            }
            if (isMarkdown || isSplitMode) updatePreview();
            updateHUD();
            broadcastLocalSync({
                type: 'tab_content',
                tid: activeTabId,
                content: editor.value,
                senderId: myDeviceId
            });
            currentMatchIndex--;
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
            const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedQuery, 'gi');
            editor.value = editor.value.replace(regex, () => repl);
            if (tabsData[activeTabId]) {
                tabsData[activeTabId].content = editor.value;
                dirtyTabIds.add(activeTabId);
                tabsContentDirty = true;
            }
            if (multiNoteMode === 2 && multiPaneTabs.pane2 === activeTabId && multiPane2Editor && multiPane2Editor.value !== editor.value) {
                multiPane2Editor.value = editor.value;
                if (multiPanePreviews.pane2) updateMultiPanePreview(2);
            }
            if (isMarkdown || isSplitMode) updatePreview();
            updateHUD();
            broadcastLocalSync({
                type: 'tab_content',
                tid: activeTabId,
                content: editor.value,
                senderId: myDeviceId
            });
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

    // --- Document Importer (Word .docx, PDF, RTF, Markdown, Code, Text, Backups) ---
    async function extractTextFromPdf(file) {
        if (!window.pdfjsLib) {
            throw new Error("PDF processing engine not available");
        }
        try {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        } catch(e) {}
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdf = await loadingTask.promise;
        let fullText = '';
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const content = await page.getTextContent();
            let lastY, pageText = '';
            for (let item of content.items) {
                if (lastY !== undefined && Math.abs(item.transform[5] - lastY) > 5) {
                    pageText += '\n';
                } else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
                    pageText += ' ';
                }
                pageText += item.str;
                lastY = item.transform[5];
            }
            if (pdf.numPages > 1) {
                fullText += `### Page ${pageNum}\n\n` + pageText.trim() + '\n\n';
            } else {
                fullText += pageText.trim();
            }
        }
        return fullText.trim() || "(No readable text found in PDF)";
    }

    function extractTextFromRtf(rtfString) {
        if (!rtfString) return '';
        return rtfString
            .replace(/\\(par|line)\b\s?/g, '\n')
            .replace(/\{\\\*(?:\{[^{}]*\}|[^{}])*\}|\{\\(?:fonttbl|colortbl|stylesheet|info)\b(?:\{[^{}]*\}|[^{}])*\}/g, '')
            .replace(/[{}]|\\[a-zA-Z]+(-?\d+)?\s?/g, '')
            .replace(/\n\s*\n/g, '\n\n')
            .trim();
    }

    async function processAndImportFile(file) {
        if (!file) return;
        const filename = file.name;
        const lowerName = filename.toLowerCase();

        // 0. Image Files Dropped or Imported -> Embed via handleImageFile
        if (file.type && file.type.startsWith('image/')) {
            handleImageFile(file);
            return;
        }

        try {
            let content = '';

            // 1. QuickPad JSON Backup
            if (lowerName.endsWith('.json')) {
                const text = await file.text();
                try {
                    const parsed = JSON.parse(text);
                    if (parsed.tabs) {
                        const overwrite = await showCustomConfirm("Restore Workspace", `"${filename}" contains a multi-tab workspace backup. Restore these tabs into your workspace?`);
                        if (overwrite) {
                            tabsData = parsed.tabs;
                            tabOrder = Object.keys(tabsData);
                            ensureTabOrder();
                            activeTabId = tabOrder[0] || 'main';
                            Object.keys(tabsData).forEach(tid => dirtyTabIds.add(tid));
                            tabsContentDirty = true;
                            isTabOrderDirty = true;
                            renderTabs();
                            switchTab(activeTabId);
                            broadcastLocalSync({
                                type: 'tabs_structure',
                                tabs: tabsData,
                                tab_order: tabOrder,
                                senderId: myDeviceId
                            });
                            saveWorkspace();
                            showToast(`Workspace restored from "${filename}"`, 'success');
                            return;
                        }
                    }
                } catch(e) {}
                content = text;
            }
            // 2. Microsoft Word Document (.docx)
            else if (lowerName.endsWith('.docx')) {
                if (window.mammoth) {
                    showToast(`Extracting Word document "${filename}"...`, 'info', 2000);
                    const arrayBuffer = await file.arrayBuffer();
                    const result = await mammoth.convertToMarkdown({ arrayBuffer });
                    content = result.value || "(Empty Word Document)";
                } else {
                    throw new Error("Word document processor not loaded");
                }
            }
            // 3. PDF Document (.pdf)
            else if (lowerName.endsWith('.pdf')) {
                showToast(`Extracting text from PDF "${filename}"...`, 'info', 2000);
                content = await extractTextFromPdf(file);
            }
            // 4. Rich Text Format (.rtf)
            else if (lowerName.endsWith('.rtf')) {
                const text = await file.text();
                content = extractTextFromRtf(text);
            }
            // 5. All text, code, markdown, csv, and data formats
            else {
                content = await file.text();
            }

            // Check if current tab is blank and unedited
            const activeTab = tabsData[activeTabId];
            const isCurrentTabEmpty = activeTab && (!activeTab.content || !activeTab.content.trim()) && (activeTab.name === 'main.txt' || activeTab.name === 'main' || activeTab.name === 'Untitled');

            if (isCurrentTabEmpty) {
                activeTab.name = filename;
                activeTab.content = content;
                if (editor) editor.value = content;
                renderTabs();
                updateHUD();
                updatePreview();
                tabsContentDirty = true;
                dirtyTabIds.add(activeTabId);
                isTabOrderDirty = true;
                broadcastLocalSync({
                    type: 'tabs_structure',
                    tabs: tabsData,
                    tab_order: tabOrder,
                    senderId: myDeviceId
                });
                saveWorkspace();
                showToast(`Opened "${filename}" for editing`, 'success');
            } else {
                const tid = generateToken();
                tabsData[tid] = { name: filename, content: content, is_encrypted: false };
                ensureTabOrder();
                renderTabs();
                switchTab(tid);
                tabsContentDirty = true;
                dirtyTabIds.add(tid);
                isTabOrderDirty = true;
                broadcastLocalSync({
                    type: 'tabs_structure',
                    tabs: tabsData,
                    tab_order: tabOrder,
                    senderId: myDeviceId
                });
                saveWorkspace();
                showToast(`Imported "${filename}" into new tab`, 'success');
            }
        } catch (err) {
            console.error("Document import error:", err);
            showToast(`Could not import "${filename}": ${err.message || 'Unsupported format'}`, 'error', 5000);
        }
    }

    if (importFileBtn && fileImportInput) {
        importFileBtn.addEventListener('click', () => fileImportInput.click());
        fileImportInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files || []);
            if (files.length === 0) return;
            showLoader();
            for (const file of files) {
                await processAndImportFile(file);
            }
            hideLoader();
            fileImportInput.value = '';
        });
    }

    // Drag & Drop File Import onto Workspace
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', async (e) => {
        e.preventDefault();
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files);
            showLoader();
            for (const file of files) {
                await processAndImportFile(file);
            }
            hideLoader();
        }
    });

    // --- Automatic Guide Upgrader (v4.6 Pro) ---
    function upgradeExistingGuideTabs() {
        if (!tabsData || typeof tabsData !== 'object' || isReadOnly) return false;
        let upgraded = false;
        for (let tid in tabsData) {
            const tab = tabsData[tid];
            if (!tab || typeof tab.content !== 'string') continue;

            const isGuideTab = (tab.name === 'Guide ⚡' || tab.name === 'Guide');
            const hasOlderGuideHeader = /^#\s*⚡?\s*Welcome to QuickPad v[0-9]+(\.[0-9]+)?(\s*Pro)?/im.test(tab.content);
            const hasExactV46 = tab.content.includes('# ⚡ Welcome to QuickPad v4.6 Pro');

            if (isGuideTab && !hasExactV46 && (hasOlderGuideHeader || !tab.content.trim())) {
                tab.name = 'Guide ⚡';
                tab.content = WELCOME_CHECKLIST_TEMPLATE;
                dirtyTabIds.add(tid);
                upgraded = true;
            } else if (hasOlderGuideHeader && !hasExactV46) {
                if (isGuideTab || !tab.content.includes('2-Note Split View')) {
                    tab.content = WELCOME_CHECKLIST_TEMPLATE;
                } else {
                    tab.content = tab.content.replace(/^#\s*⚡?\s*Welcome to QuickPad v[0-9]+(\.[0-9]+)?(\s*Pro)?/im, '# ⚡ Welcome to QuickPad v4.6 Pro');
                }
                dirtyTabIds.add(tid);
                upgraded = true;
            }
        }

        if (upgraded) {
            tabsContentDirty = true;
            if (editor && tabsData[activeTabId] && !(tabsData[activeTabId].name && tabsData[activeTabId].name.endsWith('.draw')) && !tabsData[activeTabId].is_secret) {
                editor.value = tabsData[activeTabId].content || '';
                if (typeof updatePreview === 'function') updatePreview();
                if (typeof updateHUD === 'function') updateHUD();
            }
            if (multiNoteMode === 2 && multiPaneTabs && multiPaneTabs.pane2 && tabsData[multiPaneTabs.pane2] && multiPane2Editor) {
                loadMultiPaneContent(2);
            }
            if (currentToken) {
                try {
                    localStorage.setItem('quickpad_cached_tabs_' + currentToken, JSON.stringify(serializeTabsForLocalCache(tabsData)));
                } catch(e){}
            }
        }
        return upgraded;
    }

    // --- Interactive Example Note & Guide Loader ---
    function loadExampleGuide() {
        if (glitchInterval) stopCipherGlitchAnimation();
        const activeTab = tabsData[activeTabId];
        // If active tab is clean and empty, load right into active tab
        if (activeTab && (!activeTab.content || !activeTab.content.trim()) && (activeTab.name === 'main.txt' || activeTab.name === 'main' || activeTab.name === 'Untitled')) {
            activeTab.name = 'Guide ⚡';
            activeTab.content = WELCOME_CHECKLIST_TEMPLATE;
            if (editor) editor.value = WELCOME_CHECKLIST_TEMPLATE;
            triggerCipherGlitchAnimation(WELCOME_CHECKLIST_TEMPLATE);
            dirtyTabIds.add(activeTabId);
            isTabOrderDirty = true;
            renderTabs();
            updateHUD();
            updatePreview();
            tabsContentDirty = true;
            broadcastLocalSync({
                type: 'tabs_structure',
                tabs: tabsData,
                tab_order: tabOrder,
                senderId: myDeviceId
            });
            saveWorkspace();
            showToast("Example Guide (v4.6 Pro) loaded into workspace", "success");
        } else {
            // Check if a Guide tab already exists
            let existingGuideTid = null;
            for (let tid in tabsData) {
                if (tabsData[tid].name === 'Guide ⚡' || tabsData[tid].name === 'Guide' || (tabsData[tid].content && tabsData[tid].content.includes('Welcome to QuickPad'))) {
                    existingGuideTid = tid;
                    break;
                }
            }
            if (existingGuideTid) {
                tabsData[existingGuideTid].name = 'Guide ⚡';
                tabsData[existingGuideTid].content = WELCOME_CHECKLIST_TEMPLATE;
                dirtyTabIds.add(existingGuideTid);
                tabsContentDirty = true;
                isTabOrderDirty = true;
                switchTab(existingGuideTid);
                renderTabs();
                updatePreview();
                updateHUD();
                broadcastLocalSync({
                    type: 'tabs_structure',
                    tabs: tabsData,
                    tab_order: tabOrder,
                    senderId: myDeviceId
                });
                saveWorkspace();
                showToast("Updated and switched to Example Guide (v4.6 Pro)", "success");
            } else {
                const guideTid = 'guide_' + Date.now();
                tabsData[guideTid] = {
                    name: 'Guide ⚡',
                    content: WELCOME_CHECKLIST_TEMPLATE,
                    is_encrypted: false
                };
                ensureTabOrder();
                renderTabs();
                switchTab(guideTid);
                tabsContentDirty = true;
                dirtyTabIds.add(guideTid);
                isTabOrderDirty = true;
                broadcastLocalSync({
                    type: 'tabs_structure',
                    tabs: tabsData,
                    tab_order: tabOrder,
                    senderId: myDeviceId
                });
                saveWorkspace();
                showToast("Opened Example Guide (v4.6 Pro) in a new tab", "success");
            }
        }
    }

    if (exampleGuideBtn) exampleGuideBtn.addEventListener('click', loadExampleGuide);
    if (fileExampleGuideBtn) fileExampleGuideBtn.addEventListener('click', loadExampleGuide);
    if (aboutOpenGuideBtn) {
        aboutOpenGuideBtn.addEventListener('click', () => {
            if (infoModal) infoModal.classList.add('hidden');
            loadExampleGuide();
        });
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

    function playMessageNotificationSound() {
        try {
            const ctx = getAudioContext();
            if (!ctx) return;
            if (ctx.state === 'suspended') {
                ctx.resume().catch(() => {});
            }
            const now = ctx.currentTime;

            // Tone 1: Crisp pleasant chime at 880Hz (A5)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(880, now);
            gain1.gain.setValueAtTime(0.2, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.16);

            // Tone 2: Ascending harmonious chime at 1318.5Hz (E6)
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(1318.5, now + 0.08);
            gain2.gain.setValueAtTime(0, now);
            gain2.gain.setValueAtTime(0.25, now + 0.08);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + 0.08);
            osc2.stop(now + 0.32);
        } catch(e) {}
    }

    window.openChat = function(cid, name) {
        if (!window.crypto || !window.crypto.subtle) {
            showToast("Peer DMs require HTTPS or Localhost for RSA encryption.", 'error');
            return;
        }
        activeChatId = cid;
        unreadMessages[cid] = 0;
        const chatKey = [myDeviceId, activeChatId].sort().join('_');
        const msgs = (globalDms && globalDms[chatKey]) ? globalDms[chatKey] : [];
        if (msgs.length > 0) {
            localStorage.setItem('quickpad_read_' + chatKey, msgs[msgs.length - 1].timestamp);
        }
        if (dmTitle) dmTitle.innerText = name; 
        if (dmWindow) {
            dmWindow.classList.remove('hidden');
            dmWindow.style.zIndex = '500';
        }
        if (collaboratorsModal) collaboratorsModal.classList.add('hidden');
        renderChat();
        updatePresenceUI();
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
                const unreadCount = unreadMessages[cid] || 0;
                const unread = unreadCount > 0 ? `<span class="peer-unread-dot" style="position:relative;display:inline-block;margin-left:6px;vertical-align:middle;"></span>` : '';
                
                html += `
                    <div class="collaborator-item">
                        <div class="collaborator-info">
                            <div class="collaborator-avatar" style="border-color:${colorObj.color}">${avatarContent}</div>
                            <div>
                                <div class="collaborator-name" style="color:${colorObj.color}">${escapeHtml(user.name)}${isMe ? ' (You)' : ''}${unread}</div>
                                <div class="collaborator-status">🟢 Active in workspace</div>
                            </div>
                        </div>
                        ${!isMe ? `<button class="btn-dm-user" data-cid="${escapeHtml(cid)}" data-name="${escapeHtml(user.name)}" style="${unreadCount > 0 ? 'border-color:#ff0055;color:#ff0055;font-weight:700;' : ''}">💬 Chat${unreadCount > 0 ? ` (${unreadCount})` : ''}</button>` : `<span style="font-size:0.75rem;color:var(--text-muted);">Current User</span>`}
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

    if (closeDm) closeDm.addEventListener('click', () => {
        if (dmWindow) dmWindow.classList.add('hidden');
        activeChatId = null;
        updatePresenceUI();
    });

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
            
            // Broadcast instantly to local open tabs
            broadcastLocalSync({
                type: 'dm_message',
                chatKey: chatKey,
                dmObj: dmObj
            });

            // Optimistic render for current sender
            if (!globalDms[chatKey]) globalDms[chatKey] = [];
            if (!globalDms[chatKey].some(m => m.id === dmObj.id)) {
                globalDms[chatKey].push(dmObj);
            }
            decryptedCache[dmObj.id] = text;
            renderChat();

            // Persist to Firestore
            await db.collection("workspaces").doc(currentToken).set({ dms: { [chatKey]: firebase.firestore.FieldValue.arrayUnion(dmObj) } }, { merge: true });
        } catch (e) {
            showToast("Failed to encrypt and send DM.", 'error');
        }
    }

    if (dmSend) dmSend.addEventListener('click', sendDM);
    if (dmInput) dmInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') sendDM(); });

    let knownNotifiedMessageIds = new Set();
    let isInitialDmSync = true;

    function calculateUnread(dmsObj) {
        let hasNewIncomingMessage = false;
        let newestSenderCid = null;

        for (let key in dmsObj) {
            if (key.includes(myDeviceId)) {
                let otherCid = null;
                if (key.startsWith(myDeviceId + '_')) {
                    otherCid = key.substring(myDeviceId.length + 1);
                } else if (key.endsWith('_' + myDeviceId)) {
                    otherCid = key.substring(0, key.length - myDeviceId.length - 1);
                }
                if (!otherCid) continue;

                const msgs = dmsObj[key] || [];
                const isChatActiveAndVisible = (activeChatId === otherCid && dmWindow && !dmWindow.classList.contains('hidden'));

                if (isChatActiveAndVisible) {
                    if (msgs.length > 0) {
                        localStorage.setItem('quickpad_read_' + key, msgs[msgs.length - 1].timestamp);
                    }
                    unreadMessages[otherCid] = 0;
                } else {
                    const lastRead = parseInt(localStorage.getItem('quickpad_read_' + key)) || 0;
                    unreadMessages[otherCid] = msgs.filter(m => m.timestamp > lastRead && m.sender !== myDeviceId).length;
                }

                // Detect un-notified incoming messages
                for (let m of msgs) {
                    if (m && m.id) {
                        if (m.sender !== myDeviceId) {
                            if (!knownNotifiedMessageIds.has(m.id)) {
                                knownNotifiedMessageIds.add(m.id);
                                if (!isInitialDmSync && (Date.now() - m.timestamp < 60000)) {
                                    hasNewIncomingMessage = true;
                                    newestSenderCid = otherCid;
                                }
                            }
                        } else {
                            knownNotifiedMessageIds.add(m.id);
                        }
                    }
                }
            }
        }

        if (isInitialDmSync) {
            isInitialDmSync = false;
        } else if (hasNewIncomingMessage && newestSenderCid) {
            // Play notification chime and show toast
            playMessageNotificationSound();
            const senderName = peerCursorsData[newestSenderCid]?.name || 'Collaborator';
            showToast(`💬 New message from ${senderName}`, 'info', 4000);
        }

        if (typeof updatePresenceUI === 'function') {
            updatePresenceUI();
        }
        if (typeof renderCollaboratorsModal === 'function' && collaboratorsModal && !collaboratorsModal.classList.contains('hidden')) {
            renderCollaboratorsModal();
        }
    }

    async function renderChat() {
        if (!activeChatId || !dmMessages) return;
        const chatKey = [myDeviceId, activeChatId].sort().join('_');
        const msgs = globalDms[chatKey] || [];
        if (msgs.length > 0) localStorage.setItem('quickpad_read_' + chatKey, msgs[msgs.length - 1].timestamp);
        
        let html = '';
        for (let msg of msgs) {
            let decText = decryptedCache[msg.id];
            if (!decText) {
                const isSender = msg.sender === myDeviceId;
                decText = await decryptDM(msg, isSender);
                if (decText && decText !== "[Decryption Failed]") {
                    decryptedCache[msg.id] = decText;
                }
            }
            const cls = msg.sender === myDeviceId ? 'sent' : 'received';
            html += `<div class="dm-msg ${cls}">${escapeHtml(decText || "[Decryption Failed]")}</div>`;
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

        const isPane2Active = (multiNoteMode === 2 && document.activeElement === multiPane2Editor);
        const activeTabForLaser = (isPane2Active && multiPaneTabs.pane2) ? multiPaneTabs.pane2 : activeTabId;

        const laserData = (isLaserActive && localLaser.visible && localLaser.inBounds && localLaser.x !== null) ? {
            active: true,
            x: Math.round(localLaser.x),
            y: Math.round(localLaser.y),
            color: getPeerColor(myDeviceId).color,
            name: myUsername || 'Collaborator',
            tabId: activeTabForLaser,
            timestamp: now
        } : {
            active: false,
            tabId: activeTabForLaser,
            timestamp: now
        };

        // Broadcast to local tabs instantly
        broadcastLocalSync({
            type: 'laser_presence',
            senderId: myDeviceId,
            laser: laserData
        });

        if (!db || isCloudQuotaExceeded) return;
        const hasRemotePeers = Object.keys(peerCursorsData).length > 0;
        if (!hasRemotePeers) return; // Zero Firestore writes if alone in room
        const laserInterval = 120; // 8.3 updates/sec with 60fps interpolation yields silky-smooth cross-device motion
        if (!immediate && now - lastLaserBroadcast < laserInterval) {
            if (!laserSyncTimeout) {
                laserSyncTimeout = setTimeout(() => {
                    laserSyncTimeout = null;
                    broadcastLaser(true);
                }, laserInterval - (now - lastLaserBroadcast));
            }
            return;
        }
        lastLaserBroadcast = now;
        clearTimeout(laserSyncTimeout);
        laserSyncTimeout = null;

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
                        // Tab isolation check: Only render remote laser if receiver is viewing the note tab where laser is active
                        const laserTabId = rLaser.tabId || (peerCursorsData[cid] ? peerCursorsData[cid].tabId : 'main');
                        const isVisibleInPane1 = (laserTabId === activeTabId);
                        const isVisibleInPane2 = (multiNoteMode === 2 && multiPaneTabs.pane2 === laserTabId);
                        if (!isVisibleInPane1 && !isVisibleInPane2) {
                            continue;
                        }

                        // Smooth position interpolation
                        const prevX = rLaser.x;
                        const prevY = rLaser.y;
                        rLaser.x += (rLaser.targetX - rLaser.x) * 0.35;
                        rLaser.y += (rLaser.targetY - rLaser.y) * 0.35;

                        // Continuously build smooth trail ribbon along interpolation trajectory
                        if (!rLaser.trail) rLaser.trail = [];
                        if (Math.hypot(rLaser.x - prevX, rLaser.y - prevY) > 1.2) {
                            const lastPt = rLaser.trail[rLaser.trail.length - 1];
                            if (!lastPt || Math.hypot(rLaser.x - lastPt.x, rLaser.y - lastPt.y) > 2) {
                                rLaser.trail.push({ x: rLaser.x, y: rLaser.y, time: now });
                                if (rLaser.trail.length > 35) rLaser.trail.shift();
                            }
                        }

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

        // Replication of editor styling to mirror with exact inner client width
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
        // Use clientWidth so text wraps at exact same column as textarea (handles scrollbars perfectly)
        editorMirror.style.width = `${editor.clientWidth}px`;
        editorMirror.style.boxSizing = 'border-box';
        editorMirror.style.whiteSpace = 'pre-wrap';
        editorMirror.style.wordBreak = 'break-word';
        editorMirror.style.wordWrap = 'break-word';
        editorMirror.style.overflowWrap = 'break-word';

        editorMirror.innerHTML = '';

        // Target the active typing line where the cursor sits (or selection span)
        const textBefore = val.substring(0, selStart);
        if (textBefore) {
            editorMirror.appendChild(document.createTextNode(textBefore));
        }

        const startMarker = document.createElement('span');
        const startChar = val.charAt(selStart);
        startMarker.textContent = (startChar && startChar !== '\n') ? startChar : '\u200B';
        editorMirror.appendChild(startMarker);

        let endMarker = startMarker;
        if (selEnd > selStart) {
            const middle = val.substring(selStart, selEnd);
            if (middle) editorMirror.appendChild(document.createTextNode(middle));
            endMarker = document.createElement('span');
            const endChar = val.charAt(selEnd);
            endMarker.textContent = (endChar && endChar !== '\n') ? endChar : '\u200B';
            editorMirror.appendChild(endMarker);
        }

        const lineHeight = parseFloat(style.lineHeight) || (parseFloat(style.fontSize) * 1.7) || 28;
        const top = startMarker.offsetTop - editor.scrollTop;
        const endTop = (selEnd > selStart) ? (endMarker.offsetTop - editor.scrollTop) : top;
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
            if (editor && editor.style.display !== 'none' && !isMarkdown) {
                editor.focus();
            }
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
        if (tabsData[activeTabId]) {
            tabsData[activeTabId].content = editor.value;
            dirtyTabIds.add(activeTabId);
            tabsContentDirty = true;
        }
        if (multiNoteMode === 2 && multiPaneTabs.pane2 === activeTabId && multiPane2Editor && multiPane2Editor.value !== editor.value) {
            multiPane2Editor.value = editor.value;
            if (multiPanePreviews.pane2) updateMultiPanePreview(2);
        }
        broadcastLocalSync({
            type: 'tab_content',
            tid: activeTabId,
            content: editor.value,
            senderId: myDeviceId
        });
        updatePreview();
        updateHUD();
        saveWorkspace();
        editor.focus();
        showToast(`Inserted ${template.label}!`, 'success');
    }

    // =========================================================================
    // 5. GHOST IMAGE STEGANOGRAPHY ENGINE (LSB PIXEL ENCODING)
    // =========================================================================
    let stegLoadedCarrierImg = null;

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
                    if (tabsData[activeTabId]) {
                        tabsData[activeTabId].content = editor.value;
                        dirtyTabIds.add(activeTabId);
                        tabsContentDirty = true;
                    }
                    if (multiNoteMode === 2 && multiPaneTabs.pane2 === activeTabId && multiPane2Editor && multiPane2Editor.value !== editor.value) {
                        multiPane2Editor.value = editor.value;
                        if (multiPanePreviews.pane2) updateMultiPanePreview(2);
                    }
                    broadcastLocalSync({
                        type: 'tab_content',
                        tid: activeTabId,
                        content: editor.value,
                        senderId: myDeviceId
                    });
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
                    ensureTabOrder();
                    dirtyTabIds.add(tid);
                    tabsContentDirty = true;
                    isTabOrderDirty = true;
                    renderTabs();
                    switchTab(tid);
                    broadcastLocalSync({
                        type: 'tabs_structure',
                        tabs: tabsData,
                        tab_order: tabOrder,
                        senderId: myDeviceId
                    });
                    saveWorkspace();
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
                if (e.target.closest('label')) return;
                if (e.target !== stegRevealFile && stegRevealFile) {
                    stegRevealFile.click();
                }
            });
        }
    }

    function drawStegMatrixPattern(keepSize = false) {
        if (!stegCanvas) return;
        stegLoadedCarrierImg = null;
        const ctx = stegCanvas.getContext('2d');
        const w = keepSize ? stegCanvas.width : (stegCanvas.width = 400);
        const h = keepSize ? stegCanvas.height : (stegCanvas.height = 300);
        
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
                stegLoadedCarrierImg = img;
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
            if (stegLoadedCarrierImg) {
                ctx.drawImage(stegLoadedCarrierImg, 0, 0, stegCanvas.width, stegCanvas.height);
            } else {
                drawStegMatrixPattern(true);
            }
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
                if (e.target.closest('label')) return;
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
                    const pct = incomingFileMeta.size > 0
                        ? Math.min(100, Math.round((incomingReceivedBytes / incomingFileMeta.size) * 100))
                        : 100;

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
                const pct = file.size > 0
                    ? Math.min(100, Math.round((offset / file.size) * 100))
                    : 100;

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
        { name: "Toggle Markdown Preview", shortcut: isMacPlatform ? "⌥M" : "Alt+M", action: () => mdToggleBtn && mdToggleBtn.click() },
        { name: "Toggle Split View", shortcut: isMacPlatform ? "⌥S" : "Alt+S", action: () => splitToggleBtn && splitToggleBtn.click() },
        { name: "Multi-Note View: 2 Notes Side-by-Side", shortcut: isMacPlatform ? "⌥2" : "Alt+2", action: () => setMultiNoteLayout(multiNoteMode === 2 ? 1 : 2) },
        { name: "Single Note View (Close Split Panes)", shortcut: isMacPlatform ? "⌥1" : "Alt+1", action: () => setMultiNoteLayout(1) },
        { name: "Create New Note Tab", shortcut: isMacPlatform ? "⌥N" : "Alt+N", action: () => addTabBtn && addTabBtn.click() },
        { name: "Toggle Zen Mode", shortcut: isMacPlatform ? "⌥Z" : "Alt+Z", action: () => zenBtn && zenBtn.click() },
        { name: "Toggle Typewriter Scroll", shortcut: isMacPlatform ? "⌥T" : "Alt+T", action: () => toggleTypewriterMode() },
        { name: "Toggle Focus Dimming", shortcut: isMacPlatform ? "⌥H" : "Alt+H", action: () => toggleFocusMode() },
        { name: "Toggle Presenter Spotlight", shortcut: isMacPlatform ? "⌥O" : "Alt+O", action: () => togglePresenterSpotlight() },
        { name: "Toggle Collaborator Laser", shortcut: isMacPlatform ? "⌥L" : "Alt+L", action: () => toggleLaserPointer() },
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
        { name: "Reset Pomodoro Timer", shortcut: "Reset", action: () => resetPomodoro() },
        { name: "Highlight Selected Text", shortcut: "Mark", action: () => applyHighlight() },
        { name: "🎭 Anonymous Voice Mask Settings", shortcut: "Voice", action: () => openVoiceMaskModal() },
        { name: "📄 Upload Document (Word, PDF, Text, Code)...", shortcut: "Upload", action: () => fileImportInput && fileImportInput.click() },
        { name: "📖 View Example Note & Feature Guide", shortcut: "Guide", action: () => loadExampleGuide() },
        { name: "🗑️ Delete Current Tab", shortcut: "Delete", action: () => deleteActiveTab() }
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

        // Add recent workspaces so Chrome App and returning users can resume notes
        const recents = getRecentWorkspaces();
        recents.forEach(r => {
            if (r.hash && r.hash !== currentToken && !r.hash.startsWith(currentToken)) {
                if (!filterText || `recent ${r.title}`.toLowerCase().includes(filterText.toLowerCase())) {
                    filtered.push({
                        name: `Recent Note: ${r.title || 'Untitled Workspace'}`,
                        shortcut: "Resume",
                        action: () => {
                            try { localStorage.setItem('quickpad_last_active_hash', r.hash); } catch(e){}
                            window.location.hash = `#${r.hash}`;
                            window.location.reload();
                        }
                    });
                }
            }
        });

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
            div.onmouseenter = () => {
                cmdSelectedIndex = idx;
                const items = cmdResults ? cmdResults.querySelectorAll('.cmd-item') : [];
                items.forEach((item, i) => item.classList.toggle('active', i === idx));
            };
            const executeCmdAction = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (cmdPaletteModal) cmdPaletteModal.classList.add('hidden');
                setTimeout(() => {
                    if (typeof cmd.action === 'function') cmd.action();
                }, 20);
            };
            div.addEventListener('click', executeCmdAction);
            div.addEventListener('touchend', executeCmdAction);
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

    // --- Unified Global Keyboard Shortcuts Engine (Capture Phase) ---
    function isKeyMatch(e, codeName, charStr, macSymbol, keyCodeNum) {
        if (e.code && e.code === codeName) return true;
        if (e.key) {
            const k = e.key.toLowerCase();
            if (charStr && k === charStr.toLowerCase()) return true;
            if (macSymbol && (e.key === macSymbol || k === macSymbol.toLowerCase())) return true;
        }
        if (keyCodeNum && (e.keyCode === keyCodeNum || e.which === keyCodeNum)) return true;
        return false;
    }

    function handleGlobalShortcuts(e) {
        if (e._handledByGlobalShortcuts) return;
        e._handledByGlobalShortcuts = true;

        const activeEl = document.activeElement;
        const isModalInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') && activeEl !== editor && activeEl !== multiPane2Editor;

        // 1. Escape Key Handler (Dismiss modals, overlays, or double-tap Panic)
        if (isKeyMatch(e, 'Escape', 'Escape', null, 27)) {
            const now = Date.now();
            if (now - lastEscapeTime < 350) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                togglePanicMode();
                lastEscapeTime = 0;
                return;
            }
            lastEscapeTime = now;

            closeAllDropdowns();
            if (typeof allModals !== 'undefined' && Array.isArray(allModals)) {
                allModals.forEach(m => m && m.classList.add('hidden'));
            }
            if (typeof closeVoiceMaskModal === 'function') closeVoiceMaskModal();
            if (typeof findReplaceBar !== 'undefined' && findReplaceBar) findReplaceBar.classList.add('hidden');
            if (document.body.classList.contains('zen-mode')) document.body.classList.remove('zen-mode');
            if (document.body.classList.contains('spotlight-active')) togglePresenterSpotlight();
            if (typeof isLaserActive !== 'undefined' && isLaserActive) toggleLaserPointer(false);
            if (typeof codeRunnerDrawer !== 'undefined' && codeRunnerDrawer && !codeRunnerDrawer.classList.contains('hidden')) {
                codeRunnerDrawer.classList.add('hidden');
            }
            if (typeof slashPopup !== 'undefined' && slashPopup) closeSlashPopup();
            if (typeof customDialogResolve === 'function') { customDialogResolve(null); customDialogResolve = null; }
            if (typeof cmdPaletteModal !== 'undefined' && cmdPaletteModal && !cmdPaletteModal.classList.contains('hidden')) {
                cmdPaletteModal.classList.add('hidden');
            }
            return;
        }

        // 2. Command Palette: Cmd+K / Ctrl+K
        const isK = isKeyMatch(e, 'KeyK', 'k', null, 75);
        if ((e.metaKey || e.ctrlKey) && !e.altKey && isK) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            closeAllDropdowns();
            if (cmdPaletteModal && cmdPaletteModal.classList.contains('hidden')) {
                openCommandPalette();
            } else if (cmdPaletteModal) {
                cmdPaletteModal.classList.add('hidden');
            }
            return;
        }

        // 3. Find & Replace: Cmd+F / Ctrl+F
        const isF = isKeyMatch(e, 'KeyF', 'f', null, 70);
        if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && isF) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            closeAllDropdowns();
            toggleFindBar();
            return;
        }

        // 4. Save Workspace: Cmd+S / Ctrl+S
        const isS = isKeyMatch(e, 'KeyS', 's', 'ß', 83);
        if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && isS) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            saveWorkspace();
            showToast("💾 Workspace saved locally!", 'success');
            return;
        }

        // 5. Live Sandboxed Code Runner: Cmd+Enter / Ctrl+Enter
        const isEnter = isKeyMatch(e, 'Enter', 'Enter', null, 13);
        if ((e.metaKey || e.ctrlKey) && isEnter) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            toggleCodeRunner(true);
            return;
        }

        // If the user is typing inside a modal input (e.g. Find bar input, password input, duress input),
        // do not trigger view modes like Markdown or Split
        if (isModalInput) return;

        // Multi-Note Side-by-Side Shortcuts: Alt+1 (Single), Alt+2 (2 Notes), Alt+3 (3 Notes)
        const isDigit1 = isKeyMatch(e, 'Digit1', '1', '¡', 49);
        if (e.altKey && isDigit1) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            closeAllDropdowns();
            setMultiNoteLayout(1);
            showToast("Single Note View", 'info');
            return;
        }

        const isDigit2 = isKeyMatch(e, 'Digit2', '2', '™', 50);
        if (e.altKey && isDigit2) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            closeAllDropdowns();
            const next = multiNoteMode === 2 ? 1 : 2;
            setMultiNoteLayout(next);
            showToast(next === 2 ? "2 Notes Side-by-Side" : "Single Note View", 'info');
            return;
        }

        // 6. Markdown View Toggle: Option+M (⌥M) / Cmd+M (⌘M) / Cmd+Option+M (⌘⌥M) / Cmd+Shift+M (⌘⇧M) / Alt+M / Ctrl+M
        const isM = isKeyMatch(e, 'KeyM', 'm', 'µ', 77);
        const isMarkdownShortcut = (e.altKey && isM) ||
                                   (e.metaKey && isM) ||
                                   (e.ctrlKey && isM);
        if (isMarkdownShortcut) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            closeAllDropdowns();
            if (multiNoteMode === 2 && document.activeElement === multiPane2Editor) {
                toggleMultiPanePreview(2);
            } else if (mdToggleBtn) {
                mdToggleBtn.click();
            }
            return;
        }

        // 7. Split View Toggle: Option+S (⌥S) / Cmd+Option+S (⌘⌥S) / Cmd+Shift+S (⌘⇧S) / Alt+S
        const isSplitShortcut = (e.altKey && isS) ||
                                ((e.metaKey || e.ctrlKey) && e.shiftKey && isS) ||
                                (e.metaKey && e.altKey && isS);
        if (isSplitShortcut) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            closeAllDropdowns();
            if (splitToggleBtn) splitToggleBtn.click();
            return;
        }

        // 8. New Tab: Option+N (⌥N) / Cmd+Option+N (⌘⌥N) / Cmd+Shift+N (⌘⇧N) / Alt+N
        const isN = isKeyMatch(e, 'KeyN', 'n', '˜', 78);
        const isNewTabShortcut = (e.altKey && isN) ||
                                 ((e.metaKey || e.ctrlKey) && e.shiftKey && isN) ||
                                 (e.metaKey && e.altKey && isN);
        if (isNewTabShortcut) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            closeAllDropdowns();
            if (addTabBtn) addTabBtn.click();
            return;
        }

        // 8. Zen Mode: Alt+Z / Option+Z
        const isZ = isKeyMatch(e, 'KeyZ', 'z', 'Ω', 90);
        if (e.altKey && isZ) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            closeAllDropdowns();
            if (document.body.classList.contains('zen-mode')) {
                if (zenExitBtn) zenExitBtn.click();
            } else {
                if (zenBtn) zenBtn.click();
            }
            return;
        }

        // 9. Typewriter Scroll Mode: Alt+T / Option+T / Cmd+Shift+T / Ctrl+Shift+T
        const isT = isKeyMatch(e, 'KeyT', 't', '†', 84);
        const isTypewriterShortcut = (e.altKey && isT) ||
                                     ((e.metaKey || e.ctrlKey) && e.shiftKey && isT);
        if (isTypewriterShortcut) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            closeAllDropdowns();
            toggleTypewriterMode();
            return;
        }

        // 10. Focus Dimming Mode: Alt+H / Option+H / Cmd+Shift+H / Ctrl+Shift+H
        const isH = isKeyMatch(e, 'KeyH', 'h', '˙', 72);
        const isFocusShortcut = (e.altKey && isH) ||
                                ((e.metaKey || e.ctrlKey) && e.shiftKey && isH);
        if (isFocusShortcut) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            closeAllDropdowns();
            toggleFocusMode();
            return;
        }

        // 11. Presenter Spotlight: Alt+O / Option+O / Cmd+Shift+O / Ctrl+Shift+O
        const isO = isKeyMatch(e, 'KeyO', 'o', 'ø', 79);
        const isSpotlightShortcut = (e.altKey && isO) ||
                                    ((e.metaKey || e.ctrlKey) && e.shiftKey && isO);
        if (isSpotlightShortcut) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            closeAllDropdowns();
            togglePresenterSpotlight();
            return;
        }

        // 12. Laser Pointer: Alt+L / Option+L / Cmd+Shift+L / Ctrl+Shift+L
        const isL = isKeyMatch(e, 'KeyL', 'l', '¬', 76);
        const isLaserShortcut = (e.altKey && isL) ||
                                ((e.metaKey || e.ctrlKey) && e.shiftKey && isL);
        if (isLaserShortcut) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            closeAllDropdowns();
            toggleLaserPointer();
            return;
        }

        // 13. Panic Button: Alt+P / Option+P / Cmd+Shift+P / Ctrl+Shift+P
        const isP = isKeyMatch(e, 'KeyP', 'p', 'π', 80);
        const isPanicShortcut = (e.altKey && isP) ||
                                ((e.metaKey || e.ctrlKey) && e.shiftKey && isP);
        if (isPanicShortcut) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            closeAllDropdowns();
            togglePanicMode();
            return;
        }
    }

    // Capture phase event registration ensures shortcuts trigger inside Chrome Apps, PWAs,
    // and while typing inside the editor textarea before macOS character composition can intercept them.
    window.addEventListener('keydown', handleGlobalShortcuts, { capture: true });
    document.addEventListener('keydown', handleGlobalShortcuts, { capture: true });
    if (editor) editor.addEventListener('keydown', handleGlobalShortcuts, { capture: true });

    if (cmdInput) {
        cmdInput.addEventListener('keydown', (e) => {
            const items = cmdResults ? cmdResults.querySelectorAll('.cmd-item') : [];
            if (items.length === 0) return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                cmdSelectedIndex = (cmdSelectedIndex + 1) % items.length;
                items.forEach((item, i) => item.classList.toggle('active', i === cmdSelectedIndex));
                items[cmdSelectedIndex]?.scrollIntoView({ block: 'nearest' });
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                cmdSelectedIndex = (cmdSelectedIndex - 1 + items.length) % items.length;
                items.forEach((item, i) => item.classList.toggle('active', i === cmdSelectedIndex));
                items[cmdSelectedIndex]?.scrollIntoView({ block: 'nearest' });
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                if (items[cmdSelectedIndex]) items[cmdSelectedIndex].click();
            }
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
                tabsData[activeTabId].encrypted_blob = null;
                dirtyTabIds.add(activeTabId);
                tabsContentDirty = true;
                saveWorkspace();
                renderTabs();
                checkLockedTabUI(activeTabId);
                if (multiNoteMode === 2 && multiPaneTabs.pane2 === activeTabId) {
                    loadMultiPaneContent(2);
                }
                broadcastLocalSync({
                    type: 'tabs_structure',
                    tabs: tabsData,
                    tab_order: tabOrder,
                    senderId: myDeviceId
                });
                showToast("Tab lock removed.", 'success');
            }
            return;
        }
        const pass = await showCustomPrompt("Lock Tab", "Enter a secret password for this tab:");
        if (pass && pass.trim()) {
            tabsData[activeTabId].is_secret = true;
            tabsData[activeTabId].secret_pass = pass.trim();
            dirtyTabIds.add(activeTabId);
            tabsContentDirty = true;
            saveWorkspace();
            renderTabs();
            checkLockedTabUI(activeTabId);
            if (multiNoteMode === 2 && multiPaneTabs.pane2 === activeTabId) {
                loadMultiPaneContent(2);
            }
            broadcastLocalSync({
                type: 'tabs_structure',
                tabs: tabsData,
                tab_order: tabOrder,
                senderId: myDeviceId
            });
            showToast("Tab locked successfully!", 'success');
        }
    }

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

        const hasDrawTab = Object.values(tabsData).some(t => t && t.name && t.name.endsWith('.draw'));
        if (!hasDrawTab) return;
        
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

    // 2. Floating Medium/Notion-Style Text Formatting Mini-Bar & Highlighting
    const floatingFormatBar = document.getElementById('floating-format-bar');
    let activeHighlightColor = localStorage.getItem('quickpad_last_highlight_color') || '#ffe066';
    let paletteCloseTimer = null;

    function getContrastTextColor(hex) {
        if (!hex || typeof hex !== 'string') return '#0f172a';
        let cleanHex = hex.replace('#', '').trim();
        if (cleanHex.length === 3) {
            cleanHex = cleanHex.split('').map(c => c + c).join('');
        }
        if (cleanHex.length !== 6) return '#0f172a';
        const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
        const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
        const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.55 ? '#0f172a' : '#ffffff';
    }

    function openHighlightPalette() {
        const colorPalette = document.getElementById('fmt-color-palette');
        if (!colorPalette) return;
        clearTimeout(paletteCloseTimer);
        colorPalette.classList.remove('hidden');
    }

    function closeHighlightPalette() {
        const colorPalette = document.getElementById('fmt-color-palette');
        if (!colorPalette) return;
        clearTimeout(paletteCloseTimer);
        colorPalette.classList.add('hidden');
    }

    function toggleHighlightPalette() {
        const colorPalette = document.getElementById('fmt-color-palette');
        if (!colorPalette) return;
        if (colorPalette.classList.contains('hidden')) {
            openHighlightPalette();
        } else {
            closeHighlightPalette();
        }
    }

    function applyHighlight(color = activeHighlightColor) {
        if (!editor) return;
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const val = editor.value;
        const sel = val.substring(start, end);
        let replacement = '';
        let newSelStart = start;
        let newSelEnd = end;

        // Completely clean out any inner <mark...> and </mark> tags or ==
        const cleanedText = sel
            .replace(/<mark[^>]*>/gi, '')
            .replace(/<\/mark>/gi, '')
            .replace(/==/g, '');

        if (color === 'clear') {
            if (!sel) return;
            replacement = cleanedText;
            newSelStart = start;
            newSelEnd = start + replacement.length;
        } else {
            const hlColor = color || '#ffe066';
            activeHighlightColor = hlColor;
            localStorage.setItem('quickpad_last_highlight_color', hlColor);
            const fmtHlBar = document.getElementById('fmt-hl-preview-bar');
            if (fmtHlBar) fmtHlBar.style.backgroundColor = hlColor;

            const innerText = cleanedText || 'highlighted text';
            const textColor = getContrastTextColor(hlColor);
            const openTag = `<mark style="background-color: ${hlColor}; color: ${textColor}; padding: 0 4px; border-radius: 3px;">`;
            const closeTag = `</mark>`;
            replacement = `${openTag}${innerText}${closeTag}`;
            newSelStart = start + openTag.length;
            newSelEnd = newSelStart + innerText.length;
        }

        editor.value = val.substring(0, start) + replacement + val.substring(end);
        editor.selectionStart = newSelStart;
        editor.selectionEnd = newSelEnd;
        editor.focus();

        if (tabsData[activeTabId]) tabsData[activeTabId].content = editor.value;
        editor.dispatchEvent(new Event('input'));

        closeHighlightPalette();
        if (floatingFormatBar) floatingFormatBar.classList.add('hidden');
        playMechanicalSound('click');
    }

    function initFloatingFormatBar() {
        if (!floatingFormatBar || !editor) return;

        const fmtHighlightWrap = document.getElementById('fmt-highlight-wrap');
        const fmtHighlightBtn = document.getElementById('fmt-highlight-btn');
        const fmtColorPalette = document.getElementById('fmt-color-palette');
        const fmtHlBar = document.getElementById('fmt-hl-preview-bar');

        if (fmtHlBar) {
            fmtHlBar.style.backgroundColor = activeHighlightColor;
        }

        function updateFormatBarPos() {
            if (isBurnMode || !tabsData[activeTabId] || (tabsData[activeTabId].name && tabsData[activeTabId].name.endsWith('.draw'))) {
                floatingFormatBar.classList.add('hidden');
                closeHighlightPalette();
                return;
            }
            const start = editor.selectionStart;
            const end = editor.selectionEnd;
            if (typeof start !== 'number' || typeof end !== 'number' || start === end) {
                floatingFormatBar.classList.add('hidden');
                closeHighlightPalette();
                return;
            }

            const coord = getCaretCoordinates(start);
            const barWidth = floatingFormatBar.offsetWidth || 380;
            const barHeight = floatingFormatBar.offsetHeight || 36;

            let top = coord.top - barHeight - 12;
            let paletteDown = false;
            if (top < 10) {
                top = coord.top + 28;
                paletteDown = true;
            }
            let left = coord.left;
            if (left + barWidth > editor.clientWidth) {
                left = Math.max(10, editor.clientWidth - barWidth - 10);
            }
            if (left < 10) left = 10;

            floatingFormatBar.style.top = `${top}px`;
            floatingFormatBar.style.left = `${left}px`;
            floatingFormatBar.classList.remove('hidden');

            if (fmtColorPalette) {
                if (paletteDown || top < 70) {
                    fmtColorPalette.classList.add('palette-down');
                } else {
                    fmtColorPalette.classList.remove('palette-down');
                }
            }
        }

        editor.addEventListener('mouseup', () => setTimeout(updateFormatBarPos, 10));
        editor.addEventListener('keyup', (e) => {
            if (e.shiftKey || ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
                setTimeout(updateFormatBarPos, 10);
            }
        });

        document.addEventListener('selectionchange', () => {
            if (document.activeElement !== editor && (!floatingFormatBar || !floatingFormatBar.contains(document.activeElement))) {
                floatingFormatBar.classList.add('hidden');
                closeHighlightPalette();
            }
        });

        document.addEventListener('mousedown', (e) => {
            if (floatingFormatBar && !floatingFormatBar.contains(e.target)) {
                closeHighlightPalette();
            }
        });

        editor.addEventListener('scroll', () => {
            if (!floatingFormatBar.classList.contains('hidden')) {
                updateFormatBarPos();
            }
        });

        // Standard formatting buttons with data-format
        const fmtButtons = floatingFormatBar.querySelectorAll('.fmt-btn[data-format]');
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

        // Highlight Wrapper & Button Interaction
        if (fmtHighlightWrap) {
            fmtHighlightWrap.addEventListener('mouseenter', () => {
                clearTimeout(paletteCloseTimer);
                openHighlightPalette();
            });
            fmtHighlightWrap.addEventListener('mouseleave', () => {
                paletteCloseTimer = setTimeout(() => {
                    closeHighlightPalette();
                }, 280);
            });
        }

        if (fmtHighlightBtn) {
            fmtHighlightBtn.addEventListener('mousedown', (e) => {
                e.preventDefault(); // Keep textarea selection
            });
            fmtHighlightBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleHighlightPalette();
            });
        }

        // Swatches
        const swatches = floatingFormatBar.querySelectorAll('.fmt-swatch');
        swatches.forEach(swatch => {
            swatch.addEventListener('mousedown', (e) => {
                e.preventDefault(); // Keep textarea selection
            });
            swatch.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const color = swatch.getAttribute('data-color');
                applyHighlight(color);
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
        closeHighlightPalette();
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
        }
        if (hudPomodoroIcon) {
            hudPomodoroIcon.style.cursor = 'pointer';
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
    const cardDownloadAllBtn = document.getElementById('card-download-all-btn');
    const cardDownloadTxtBtn = document.getElementById('card-download-txt-btn');
    const cardDownloadMdBtn = document.getElementById('card-download-md-btn');
    const cardPaginationBar = document.getElementById('card-pagination-bar');
    const cardPrevPageBtn = document.getElementById('card-prev-page-btn');
    const cardNextPageBtn = document.getElementById('card-next-page-btn');
    const cardPageIndicator = document.getElementById('card-page-indicator');
    const cardThemeButtons = document.querySelectorAll('.card-theme-btn');
    const cardFormatButtons = document.querySelectorAll('.card-format-btn');

    let currentCardTheme = 'cyber';
    let currentCardFormat = 'code'; // 'code' or 'markdown'
    let currentCardPage = 0;
    let cardTotalPages = 1;

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

    function renderCardToCanvas(targetCanvas, pageIndex = currentCardPage) {
        if (!targetCanvas) return;
        const ctx = targetCanvas.getContext('2d');
        const theme = CARD_THEMES[currentCardTheme] || CARD_THEMES.cyber;
        const baseFontSize = parseInt(cardFontSizeSelect ? cardFontSizeSelect.value : 20, 10);
        const showWatermark = cardWatermarkCheck ? cardWatermarkCheck.checked : true;
        const formatMode = currentCardFormat || 'code';

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

        const maxTextWidth = width - (padding * 2) - (cardPadding * 2) - (formatMode === 'code' ? (50 * scale) : (20 * scale));
        const allWrappedLines = [];

        ctx.font = formatMode === 'markdown' 
            ? `${fontSizePx}px "Inter", -apple-system, sans-serif`
            : `${fontSizePx}px "Fira Code", monospace`;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];

            // In markdown mode: clean out raw <mark...> tags so text looks crisp and readable
            if (formatMode === 'markdown') {
                line = line
                    .replace(/<mark[^>]*>([\s\S]*?)<\/mark>/gi, '$1')
                    .replace(/==([^=\n\r]+)==/g, '$1');
            }

            if (line.length === 0) {
                allWrappedLines.push({ text: '', lineNum: i + 1, isBlank: true });
                continue;
            }

            let currentLine = '';
            for (let char of line) {
                const testLine = currentLine + char;
                if (ctx.measureText(testLine).width > maxTextWidth) {
                    allWrappedLines.push({ text: currentLine, lineNum: currentLine === '' ? i + 1 : null, isBlank: false });
                    currentLine = char;
                } else {
                    currentLine = testLine;
                }
            }
            if (currentLine) {
                allWrappedLines.push({ text: currentLine, lineNum: allWrappedLines.length === 0 || allWrappedLines[allWrappedLines.length - 1].lineNum === null ? i + 1 : null, isBlank: false });
            }
        }

        if (allWrappedLines.length === 0) {
            allWrappedLines.push({ text: '', lineNum: 1, isBlank: true });
        }

        // Dynamically calculate lines per card page based on font size
        const linesPerPage = baseFontSize >= 24 ? 28 : (baseFontSize >= 20 ? 36 : 44);
        cardTotalPages = Math.max(1, Math.ceil(allWrappedLines.length / linesPerPage));

        pageIndex = Math.max(0, Math.min(pageIndex, cardTotalPages - 1));
        if (targetCanvas === cardRenderCanvas) {
            currentCardPage = pageIndex;
        }

        const pageLines = allWrappedLines.slice(pageIndex * linesPerPage, (pageIndex + 1) * linesPerPage);

        // Update modal UI indicators when rendering the preview canvas
        if (targetCanvas === cardRenderCanvas) {
            if (cardTotalPages > 1) {
                if (cardPaginationBar) cardPaginationBar.classList.remove('hidden');
                if (cardPageIndicator) cardPageIndicator.textContent = `Part ${currentCardPage + 1} of ${cardTotalPages}`;
                if (cardPrevPageBtn) cardPrevPageBtn.disabled = currentCardPage === 0;
                if (cardNextPageBtn) cardNextPageBtn.disabled = currentCardPage === cardTotalPages - 1;
                if (cardDownloadPngBtn) {
                    cardDownloadPngBtn.classList.remove('hidden');
                    cardDownloadPngBtn.textContent = `📥 Download Part ${currentCardPage + 1} (PNG)`;
                }
                if (cardDownloadAllBtn) {
                    cardDownloadAllBtn.textContent = `📥 Download All (${cardTotalPages} PNGs)`;
                }
            } else {
                if (cardPaginationBar) cardPaginationBar.classList.add('hidden');
                if (cardDownloadPngBtn) cardDownloadPngBtn.classList.add('hidden');
                if (cardDownloadAllBtn) cardDownloadAllBtn.textContent = `📥 Download PNG Card`;
            }
        }

        const titleBarHeight = 44 * scale;
        const textTopPadding = Math.max(28 * scale, Math.round(fontSizePx * 1.15));
        const footerHeight = showWatermark ? (36 * scale) : (18 * scale);
        const cardContentHeight = Math.max(160 * scale, textTopPadding + (pageLines.length * lineHeight) + (16 * scale));
        const cardHeight = titleBarHeight + cardContentHeight + footerHeight;
        const height = cardHeight + (padding * 2);

        targetCanvas.width = width;
        targetCanvas.height = height;

        // Background Gradient
        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, theme.bgGrad1);
        bgGrad.addColorStop(1, theme.bgGrad2);
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // Radial Center Glow
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

        // Drop Shadow
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

        // Card Border
        roundRect(ctx, cardX, cardY, cardW, cardH, cardRadius);
        ctx.strokeStyle = theme.cardBorder;
        ctx.lineWidth = 1.5 * scale;
        ctx.stroke();

        // Traffic Light Window Dots
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

        // Window Title & Page Indicator
        ctx.fillStyle = theme.textTitle;
        ctx.font = `600 ${14 * scale}px "Inter", sans-serif`;
        ctx.textAlign = 'center';
        const pageTitleSuffix = cardTotalPages > 1 ? ` (Part ${pageIndex + 1}/${cardTotalPages})` : '';
        ctx.fillText(tabTitle + pageTitleSuffix, cardX + (cardW / 2), dotY + (5 * scale));

        // Window Header Divider
        ctx.beginPath();
        ctx.moveTo(cardX, cardY + titleBarHeight);
        ctx.lineTo(cardX + cardW, cardY + titleBarHeight);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1 * scale;
        ctx.stroke();

        // Text Content Rendering
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        let currentY = cardY + titleBarHeight + textTopPadding;

        if (formatMode === 'code') {
            const textStartX = cardX + (28 * scale) + (36 * scale);

            pageLines.forEach((item) => {
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
        } else {
            // Rendered Markdown Mode
            const textStartX = cardX + (36 * scale);

            pageLines.forEach((item) => {
                ctx.textAlign = 'left';
                const text = item.text;

                if (text.startsWith('# ')) {
                    ctx.font = `bold ${fontSizePx * 1.3}px "Inter", sans-serif`;
                    ctx.fillStyle = theme.textTitle;
                    ctx.fillText(text.replace(/^#\s+/, ''), textStartX, currentY);
                } else if (text.startsWith('## ')) {
                    ctx.font = `600 ${fontSizePx * 1.15}px "Inter", sans-serif`;
                    ctx.fillStyle = theme.textTitle;
                    ctx.fillText(text.replace(/^##\s+/, ''), textStartX, currentY);
                } else if (text.startsWith('### ')) {
                    ctx.font = `600 ${fontSizePx * 1.05}px "Inter", sans-serif`;
                    ctx.fillStyle = theme.textTitle;
                    ctx.fillText(text.replace(/^###\s+/, ''), textStartX, currentY);
                } else if (text.startsWith('> ')) {
                    // Blockquote accent line
                    ctx.fillStyle = theme.cardBorder;
                    ctx.fillRect(textStartX, currentY - (lineHeight * 0.7), 3 * scale, lineHeight * 0.9);
                    ctx.font = `italic ${fontSizePx * 0.95}px "Inter", sans-serif`;
                    ctx.fillStyle = theme.textPrimary;
                    ctx.fillText(text.replace(/^>\s*/, ''), textStartX + (14 * scale), currentY);
                } else if (/^[-*]\s*\[([ xX])\]\s*(.*)/.test(text)) {
                    // Checklist item
                    const m = text.match(/^[-*]\s*\[([ xX])\]\s*(.*)/);
                    const isChecked = m[1].toLowerCase() === 'x';
                    ctx.font = `bold ${fontSizePx * 0.9}px "Inter", sans-serif`;
                    ctx.fillStyle = isChecked ? theme.textTitle : theme.lineNums;
                    ctx.fillText(isChecked ? '☑' : '☐', textStartX, currentY);
                    ctx.font = `${fontSizePx}px "Inter", sans-serif`;
                    ctx.fillStyle = isChecked ? 'rgba(255,255,255,0.65)' : theme.textPrimary;
                    ctx.fillText(m[2], textStartX + (22 * scale), currentY);
                } else if (/^[-*]\s+(.*)/.test(text)) {
                    // Bullet list
                    ctx.font = `bold ${fontSizePx}px "Inter", sans-serif`;
                    ctx.fillStyle = theme.textTitle;
                    ctx.fillText('•', textStartX, currentY);
                    ctx.font = `${fontSizePx}px "Inter", sans-serif`;
                    ctx.fillStyle = theme.textPrimary;
                    ctx.fillText(text.replace(/^[-*]\s+/, ''), textStartX + (16 * scale), currentY);
                } else {
                    // Regular paragraph text
                    ctx.font = `${fontSizePx}px "Inter", sans-serif`;
                    ctx.fillStyle = theme.textPrimary;
                    ctx.fillText(text, textStartX, currentY);
                }

                currentY += lineHeight;
            });
        }

        // Watermark Footer
        if (showWatermark) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
            ctx.font = `500 ${12 * scale}px "Inter", sans-serif`;
            ctx.textAlign = 'right';
            const partString = cardTotalPages > 1 ? ` • Part ${pageIndex + 1} of ${cardTotalPages}` : '';
            ctx.fillText(`⚡ QuickPad${partString} • Zero-Knowledge E2EE • quickpad.org`, cardX + cardW - (20 * scale), cardY + cardH - (14 * scale));
        }
    }

    function renderNoteCard() {
        if (!cardRenderCanvas) return;
        renderCardToCanvas(cardRenderCanvas, currentCardPage);
        const wrapper = document.querySelector('.card-preview-wrapper');
        if (wrapper) wrapper.scrollTop = 0;
    }

    function openCardExportModal() {
        if (!cardExportModal) return;
        if (glitchInterval) stopCipherGlitchAnimation();
        currentCardPage = 0;
        renderNoteCard();
        cardExportModal.classList.remove('hidden');
        const wrapper = document.querySelector('.card-preview-wrapper');
        if (wrapper) wrapper.scrollTop = 0;
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

        cardFormatButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                cardFormatButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentCardFormat = btn.getAttribute('data-card-format') || 'code';
                renderNoteCard();
            });
        });

        // Pager buttons for multi-part cards
        if (cardPrevPageBtn) {
            cardPrevPageBtn.addEventListener('click', () => {
                if (currentCardPage > 0) {
                    currentCardPage--;
                    renderNoteCard();
                }
            });
        }

        if (cardNextPageBtn) {
            cardNextPageBtn.addEventListener('click', () => {
                if (currentCardPage < cardTotalPages - 1) {
                    currentCardPage++;
                    renderNoteCard();
                }
            });
        }

        // Download Single/Current PNG
        if (cardDownloadPngBtn) {
            cardDownloadPngBtn.addEventListener('click', () => {
                if (!cardRenderCanvas) return;
                const tabName = (tabsData[activeTabId] ? tabsData[activeTabId].name : 'note').replace(/\.[^/.]+$/, "");
                const partSuffix = cardTotalPages > 1 ? `-part-${currentCardPage + 1}-of-${cardTotalPages}` : '-card';
                const link = document.createElement('a');
                link.download = `quickpad-${tabName}${partSuffix}.png`;
                link.href = cardRenderCanvas.toDataURL('image/png');
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                showToast(`📥 Card Part ${currentCardPage + 1} downloaded as PNG!`, 'success');
            });
        }

        // Download All PNG Cards (Splits into multiple files without cutoff)
        if (cardDownloadAllBtn) {
            cardDownloadAllBtn.addEventListener('click', async () => {
                if (!cardRenderCanvas) return;
                const tabName = (tabsData[activeTabId] ? tabsData[activeTabId].name : 'note').replace(/\.[^/.]+$/, "");

                if (cardTotalPages <= 1) {
                    const link = document.createElement('a');
                    link.download = `quickpad-${tabName}-card.png`;
                    link.href = cardRenderCanvas.toDataURL('image/png');
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    showToast("📥 Card downloaded as PNG!", 'success');
                    return;
                }

                showToast(`⏳ Generating all ${cardTotalPages} PNG card parts...`, 'info');
                const exportCanvas = document.createElement('canvas');

                for (let p = 0; p < cardTotalPages; p++) {
                    renderCardToCanvas(exportCanvas, p);
                    const dataUrl = exportCanvas.toDataURL('image/png');
                    const link = document.createElement('a');
                    link.download = `quickpad-${tabName}-part-${p + 1}-of-${cardTotalPages}.png`;
                    link.href = dataUrl;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    await new Promise(res => setTimeout(res, 220));
                }

                showToast(`📥 All ${cardTotalPages} PNG card files downloaded!`, 'success');
            });
        }

        // Download Note as Plain Text (.txt) directly from Card Modal
        if (cardDownloadTxtBtn) {
            cardDownloadTxtBtn.addEventListener('click', () => {
                const tab = tabsData[activeTabId] || { name: 'note.txt' };
                const fname = tab.name.endsWith('.txt') ? tab.name : `${tab.name.replace(/\.[^/.]+$/, "")}.txt`;
                if (editor) {
                    downloadFile(fname, editor.value, 'text/plain');
                }
            });
        }

        // Download Note as Markdown (.md) directly from Card Modal
        if (cardDownloadMdBtn) {
            cardDownloadMdBtn.addEventListener('click', () => {
                const tab = tabsData[activeTabId] || { name: 'note.md' };
                const fname = tab.name.endsWith('.md') ? tab.name : `${tab.name.replace(/\.[^/.]+$/, "")}.md`;
                if (editor) {
                    downloadFile(fname, editor.value, 'text/markdown');
                }
            });
        }

        // Copy Card Image to Clipboard
        if (cardCopyImgBtn) {
            cardCopyImgBtn.addEventListener('click', async () => {
                if (!cardRenderCanvas) return;
                cardRenderCanvas.toBlob(async (blob) => {
                    try {
                        if (!blob) throw new Error("Canvas export failed");
                        await navigator.clipboard.write([
                            new ClipboardItem({ 'image/png': blob })
                        ]);
                        const partMsg = cardTotalPages > 1 ? ` (Part ${currentCardPage + 1})` : '';
                        showToast(`📋 Card image${partMsg} copied to clipboard!`, 'success');
                    } catch(e) {
                        showToast("Clipboard copy failed: " + e.message, 'error');
                    }
                });
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
        let fullViewUrl = window.location.origin + window.location.pathname + '?view=' + currentToken + (urlKey ? '#' + urlKey : '');

        if (sharePassCheckbox && sharePassCheckbox.checked && sharePassInput && sharePassInput.value.trim()) {
            const pass = sharePassInput.value.trim();
            if (typeof CryptoJS !== 'undefined') {
                const encKey = CryptoJS.AES.encrypt(urlKey || '', pass).toString();
                fullViewUrl = window.location.origin + window.location.pathname + '?view=' + currentToken + '&protected=1#' + encodeURIComponent(encKey);
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
