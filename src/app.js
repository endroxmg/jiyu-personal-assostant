/* ============================================
   JIYU — Main App Controller v3
   ============================================ */

const JiyuApp = (() => {
    const $ = (id) => document.getElementById(id);

    // DOM
    const loginScreen = $('login-screen');
    const chatScreen = $('chat-screen');
    const guestBtn = $('guest-btn');
    const sidebar = $('sidebar');
    const sidebarToggle = $('sidebar-toggle');
    const newChatBtn = $('new-chat-btn');
    const welcomeState = $('welcome-state');
    const messagesContainer = $('messages');
    const chatContainer = $('chat-container');
    const userInput = $('user-input');
    const sendBtn = $('send-btn');
    const micBtn = $('mic-btn');
    const typingIndicator = $('typing-indicator');
    const voiceToggleBtn = $('voice-toggle-btn');
    const settingsBtn = $('settings-btn');
    const signoutBtn = $('signout-btn');
    const onboardingModal = $('onboarding-modal');
    const settingsModal = $('settings-modal');
    const nameInput = $('name-input');
    const nameSubmitBtn = $('name-submit-btn');
    const settingsCloseBtn = $('settings-close-btn');
    const saveSettingsBtn = $('save-settings-btn');
    const clearDataBtn = $('clear-data-btn');
    const geminiKeyInput = $('gemini-key-input');
    const elevenLabsKeyInput = $('elevenlabs-key-input');
    const elevenLabsVoiceSelect = $('elevenlabs-voice-select');
    const userNameSettings = $('user-name-settings');
    const toggleGeminiKey = $('toggle-gemini-key');
    const toggleElevenLabsKey = $('toggle-elevenlabs-key');

    let isProcessing = false;

    function init() {
        JiyuAuth.init();
        bindEvents();
        updateVoiceUI();

        if (JiyuAuth.isLoggedIn()) {
            showChatScreen();
        } else {
            showLoginScreen();
        }

        if (window.speechSynthesis) window.speechSynthesis.getVoices();
    }

    function bindEvents() {
        // Login
        guestBtn.addEventListener('click', () => { JiyuAuth.loginAsGuest(); showChatScreen(); });

        // Sidebar
        sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
        newChatBtn.addEventListener('click', startNewChat);

        // Chat
        sendBtn.addEventListener('click', handleSend);
        userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
        });

        // Auto-resize + send button state
        userInput.addEventListener('input', () => {
            userInput.style.height = 'auto';
            userInput.style.height = Math.min(userInput.scrollHeight, 160) + 'px';
            sendBtn.disabled = !userInput.value.trim();
        });

        // Suggestion chips
        document.querySelectorAll('.suggestion-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const msg = chip.dataset.msg;
                if (msg) {
                    userInput.value = msg;
                    sendBtn.disabled = false;
                    handleSend();
                }
            });
        });

        // Mic
        micBtn.addEventListener('click', toggleMic);
        JiyuVoice.onListeningChange((listening) => { micBtn.classList.toggle('listening', listening); });

        // Voice toggle
        voiceToggleBtn.addEventListener('click', toggleVoiceOutput);

        // Settings
        settingsBtn.addEventListener('click', openSettings);
        settingsCloseBtn.addEventListener('click', closeSettings);
        settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) closeSettings(); });
        saveSettingsBtn.addEventListener('click', saveSettings);
        clearDataBtn.addEventListener('click', clearAllData);

        // Key toggles
        toggleGeminiKey.addEventListener('click', () => {
            geminiKeyInput.type = geminiKeyInput.type === 'password' ? 'text' : 'password';
        });
        toggleElevenLabsKey.addEventListener('click', () => {
            elevenLabsKeyInput.type = elevenLabsKeyInput.type === 'password' ? 'text' : 'password';
        });

        // ElevenLabs voice load
        elevenLabsKeyInput.addEventListener('change', async () => {
            if (elevenLabsKeyInput.value.trim()) {
                JiyuMemory.setElevenLabsKey(elevenLabsKeyInput.value.trim());
                await loadElevenLabsVoices();
            }
        });

        // Voice engine radios
        document.querySelectorAll('input[name="voice-engine"]').forEach(r => {
            r.addEventListener('change', (e) => JiyuMemory.setVoiceEngine(e.target.value));
        });

        // Onboarding
        nameSubmitBtn.addEventListener('click', handleNameSubmit);
        nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleNameSubmit(); });

        // Sign out
        signoutBtn.addEventListener('click', () => { JiyuAuth.signOut(); showLoginScreen(); });

        // Close sidebar on mobile when clicking outside
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && !sidebar.classList.contains('collapsed') &&
                !sidebar.contains(e.target) && e.target !== sidebarToggle && !sidebarToggle.contains(e.target)) {
                sidebar.classList.add('collapsed');
            }
        });
    }

    // --- Screens ---
    function showLoginScreen() {
        loginScreen.classList.add('active');
        chatScreen.classList.remove('active');
        messagesContainer.innerHTML = '';
    }

    function showChatScreen() {
        loginScreen.classList.remove('active');
        chatScreen.classList.add('active');

        const user = JiyuAuth.getCurrentUser();
        if (user && user.provider === 'google') signoutBtn.style.display = 'flex';

        // Collapse sidebar on mobile
        if (window.innerWidth <= 768) sidebar.classList.add('collapsed');

        loadMessages();

        if (!JiyuMemory.isOnboardingDone()) {
            showOnboarding();
        }

        userInput.focus();
    }

    // --- Onboarding ---
    function showOnboarding() {
        onboardingModal.style.display = 'flex';
        setTimeout(() => nameInput.focus(), 300);
    }

    function handleNameSubmit() {
        const name = nameInput.value.trim();
        if (!name) { nameInput.style.borderColor = '#f87171'; nameInput.focus(); return; }

        JiyuMemory.setUserName(name);
        JiyuMemory.setOnboardingDone();
        onboardingModal.style.display = 'none';

        const greeting = `Heyy ${name}! 🎉 I'm so happy to meet you! I'm Jiyu — think of me as your AI best friend. I'm here to chat, help, brainstorm, vent with, or just hang out. No judgement, no formalities, just us.\n\nSo, what's on your mind? 💜`;
        hideWelcomeState();
        addJiyuMessage(greeting);
        JiyuMemory.saveMessage('assistant', greeting);
        JiyuVoice.speak(greeting);
    }

    // --- Messages ---
    function loadMessages() {
        messagesContainer.innerHTML = '';
        const history = JiyuMemory.getConversations();

        if (history.length === 0) {
            showWelcomeState();
            return;
        }

        hideWelcomeState();
        history.forEach(msg => {
            renderMessage(msg.role === 'user' ? 'user' : 'jiyu', msg.content, false);
        });
        scrollToBottom();
    }

    function showWelcomeState() { if (welcomeState) welcomeState.style.display = 'flex'; }
    function hideWelcomeState() { if (welcomeState) welcomeState.style.display = 'none'; }

    function renderMessage(type, content, animate = true) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${type}`;
        if (!animate) msgDiv.style.animation = 'none';

        const sender = document.createElement('div');
        sender.className = 'msg-sender';
        const dot = document.createElement('span');
        dot.className = 'msg-sender-dot';
        sender.appendChild(dot);
        const label = document.createTextNode(type === 'jiyu' ? ' Jiyu' : ` ${JiyuMemory.getUserName() || 'You'}`);
        sender.appendChild(label);

        const body = document.createElement('div');
        body.className = 'msg-body';

        if (type === 'jiyu') {
            body.innerHTML = formatMarkdown(content);
        } else {
            body.textContent = content;
        }

        msgDiv.appendChild(sender);
        msgDiv.appendChild(body);
        messagesContainer.appendChild(msgDiv);

        if (animate) scrollToBottom();
    }

    function addJiyuMessage(content) { renderMessage('jiyu', content, true); }
    function addUserMessage(content) { renderMessage('user', content, true); }

    // --- Send ---
    async function handleSend() {
        const text = userInput.value.trim();
        if (!text || isProcessing) return;

        JiyuVoice.stopCurrentAudio();
        hideWelcomeState();

        addUserMessage(text);
        JiyuMemory.saveMessage('user', text);
        userInput.value = '';
        userInput.style.height = 'auto';
        sendBtn.disabled = true;

        isProcessing = true;
        showTyping(true);

        try {
            const history = JiyuMemory.getRecentHistory(20);
            const contextHistory = history.slice(0, -1);
            const response = await JiyuGemini.sendMessage(text, contextHistory);

            showTyping(false);
            addJiyuMessage(response);
            JiyuMemory.saveMessage('assistant', response);
            JiyuVoice.speak(response);
        } catch (error) {
            showTyping(false);
            const errMsg = `Something went wrong — ${error.message}`;
            addJiyuMessage(errMsg);
            showToast(error.message, 'error');
        }

        isProcessing = false;
        userInput.focus();
    }

    function startNewChat() {
        JiyuMemory.clearConversations();
        messagesContainer.innerHTML = '';
        showWelcomeState();
        showToast('New chat started', 'success');
    }

    // --- Typing ---
    function showTyping(show) {
        typingIndicator.style.display = show ? 'flex' : 'none';
        if (show) scrollToBottom();
    }

    // --- Voice ---
    function toggleMic() {
        if (JiyuVoice.isListening) {
            JiyuVoice.stopListening();
        } else {
            if (!JiyuVoice.isRecognitionSupported()) {
                showToast('Voice input not supported in this browser', 'error');
                return;
            }
            JiyuVoice.startListening((text, isFinal) => {
                userInput.value = text;
                sendBtn.disabled = !text.trim();
                userInput.style.height = 'auto';
                userInput.style.height = Math.min(userInput.scrollHeight, 160) + 'px';
                if (isFinal) handleSend();
            });
        }
    }

    function toggleVoiceOutput() {
        const enabled = !JiyuMemory.isVoiceEnabled();
        JiyuMemory.setVoiceEnabled(enabled);
        updateVoiceUI();
        if (!enabled) JiyuVoice.stopCurrentAudio();
        showToast(enabled ? 'Voice enabled' : 'Voice muted', 'success');
    }

    function updateVoiceUI() {
        const enabled = JiyuMemory.isVoiceEnabled();
        const onIcon = document.getElementById('voice-on-icon');
        const offIcon = document.getElementById('voice-off-icon');
        if (enabled) { onIcon.style.display = 'block'; offIcon.style.display = 'none'; voiceToggleBtn.classList.add('active'); }
        else { onIcon.style.display = 'none'; offIcon.style.display = 'block'; voiceToggleBtn.classList.remove('active'); }
    }

    // --- Settings ---
    function openSettings() {
        geminiKeyInput.value = JiyuMemory.getGeminiKey();
        elevenLabsKeyInput.value = JiyuMemory.getElevenLabsKey();
        userNameSettings.value = JiyuMemory.getUserName();

        const engine = JiyuMemory.getVoiceEngine();
        document.querySelectorAll('input[name="voice-engine"]').forEach(r => r.checked = r.value === engine);

        if (JiyuMemory.getElevenLabsKey()) loadElevenLabsVoices();

        settingsModal.style.display = 'flex';
    }

    function closeSettings() { settingsModal.style.display = 'none'; }

    async function loadElevenLabsVoices() {
        const select = elevenLabsVoiceSelect;
        select.innerHTML = '<option value="">Loading...</option>';
        select.disabled = true;
        const voices = await JiyuVoice.fetchElevenLabsVoices();
        if (voices.length === 0) { select.innerHTML = '<option value="">No voices found</option>'; return; }
        select.innerHTML = '';
        const currentVoice = JiyuMemory.getElevenLabsVoice();
        voices.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.voice_id;
            opt.textContent = `${v.name} — ${v.labels?.accent || ''} ${v.labels?.gender || ''}`.trim();
            if (v.voice_id === currentVoice) opt.selected = true;
            select.appendChild(opt);
        });
        select.disabled = false;
    }

    function saveSettings() {
        const geminiKey = geminiKeyInput.value.trim();
        const elevenLabsKey = elevenLabsKeyInput.value.trim();
        const userName = userNameSettings.value.trim();
        const voiceEngine = document.querySelector('input[name="voice-engine"]:checked')?.value || 'browser';
        const selectedVoice = elevenLabsVoiceSelect.value;

        if (geminiKey) JiyuMemory.setGeminiKey(geminiKey);
        if (elevenLabsKey) JiyuMemory.setElevenLabsKey(elevenLabsKey);
        if (userName) JiyuMemory.setUserName(userName);
        JiyuMemory.setVoiceEngine(voiceEngine);
        if (selectedVoice) JiyuMemory.setElevenLabsVoice(selectedVoice);

        closeSettings();
        showToast('Settings saved', 'success');
    }

    function clearAllData() {
        if (confirm('Clear all data including conversations and settings?')) {
            JiyuMemory.clearAll();
            messagesContainer.innerHTML = '';
            closeSettings();
            showToast('All data cleared', 'success');
            setTimeout(() => showLoginScreen(), 800);
        }
    }

    // --- Helpers ---
    function scrollToBottom() {
        requestAnimationFrame(() => { chatContainer.scrollTop = chatContainer.scrollHeight; });
    }

    function formatMarkdown(text) {
        return text
            .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/^### (.+)$/gm, '<strong>$1</strong>')
            .replace(/^## (.+)$/gm, '<strong>$1</strong>')
            .replace(/^# (.+)$/gm, '<strong>$1</strong>')
            .replace(/^[*-] (.+)$/gm, '• $1')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/^(.+)$/, '<p>$1</p>')
            .replace(/<p><\/p>/g, '');
    }

    function showToast(message, type = '') {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 2500);
    }

    document.addEventListener('DOMContentLoaded', init);
    return { init };
})();
