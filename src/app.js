/* ============================================
   JIYU — Main App Controller v4
   Loading screen · Auto-new-chat · Conversations
   ============================================ */

const JiyuApp = (() => {
    const $ = (id) => document.getElementById(id);

    // DOM
    const loadingScreen = $('loading-screen');
    const loginScreen = $('login-screen');
    const chatScreen = $('chat-screen');
    const guestBtn = $('guest-btn');
    const sidebar = $('sidebar');
    const sidebarToggle = $('sidebar-toggle');
    const newChatBtn = $('new-chat-btn');
    const sidebarChats = $('sidebar-chats');
    const welcomeState = $('welcome-state');
    const welcomeGreeting = $('welcome-greeting');
    const messagesContainer = $('messages');
    const chatContainer = $('chat-container');
    const userInput = $('user-input');
    const sendBtn = $('send-btn');
    const micBtn = $('mic-btn');
    const typingIndicator = $('typing-indicator');
    const voiceToggleBtn = $('voice-toggle-btn');
    const settingsBtn = $('settings-btn');
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
    let currentChatId = null;

    function init() {
        JiyuAuth.init();
        bindEvents();
        updateVoiceUI();
        playLoadingScreen();
        if (window.speechSynthesis) window.speechSynthesis.getVoices();
    }

    // --- Loading Screen ---
    function playLoadingScreen() {
        setTimeout(() => {
            loadingScreen.classList.add('done');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                if (JiyuAuth.isLoggedIn()) {
                    showChatScreen();
                } else {
                    showLoginScreen();
                }
            }, 600);
        }, 2800);
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

        userInput.addEventListener('input', () => {
            userInput.style.height = 'auto';
            userInput.style.height = Math.min(userInput.scrollHeight, 140) + 'px';
            sendBtn.disabled = !userInput.value.trim();
        });

        // Suggestion chips
        document.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const msg = chip.dataset.msg;
                if (msg) { userInput.value = msg; sendBtn.disabled = false; handleSend(); }
            });
        });

        // Mic
        micBtn.addEventListener('click', toggleMic);
        JiyuVoice.onListeningChange((listening) => micBtn.classList.toggle('listening', listening));

        // Voice toggle
        voiceToggleBtn.addEventListener('click', toggleVoiceOutput);

        // Settings
        settingsBtn.addEventListener('click', openSettings);
        settingsCloseBtn.addEventListener('click', closeSettings);
        settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) closeSettings(); });
        saveSettingsBtn.addEventListener('click', saveSettings);
        clearDataBtn.addEventListener('click', clearAllData);

        // Key toggles
        toggleGeminiKey.addEventListener('click', () => { geminiKeyInput.type = geminiKeyInput.type === 'password' ? 'text' : 'password'; });
        toggleElevenLabsKey.addEventListener('click', () => { elevenLabsKeyInput.type = elevenLabsKeyInput.type === 'password' ? 'text' : 'password'; });

        // ElevenLabs voice load
        elevenLabsKeyInput.addEventListener('change', async () => {
            if (elevenLabsKeyInput.value.trim()) {
                JiyuMemory.setElevenLabsKey(elevenLabsKeyInput.value.trim());
                await loadElevenLabsVoices();
            }
        });

        document.querySelectorAll('input[name="voice-engine"]').forEach(r => {
            r.addEventListener('change', (e) => JiyuMemory.setVoiceEngine(e.target.value));
        });

        // Onboarding
        nameSubmitBtn.addEventListener('click', handleNameSubmit);
        nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleNameSubmit(); });

        // Mobile close sidebar
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
    }

    function showChatScreen() {
        loginScreen.classList.remove('active');
        chatScreen.classList.add('active');

        if (window.innerWidth <= 768) sidebar.classList.add('collapsed');

        if (!JiyuMemory.isOnboardingDone()) {
            showOnboarding();
        } else {
            // Auto-start a new conversation every session
            startNewChat();
            updateWelcomeGreeting();
        }

        renderSidebarChats();
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

        startNewChat();
        updateWelcomeGreeting();

        const greeting = `Heyyy ${name}! 😊 I'm Jiyu — your AI bestie. Ask me anything, vent, brainstorm, or just chat. I'm all yours!\n\nSo, what's up?`;
        hideWelcomeState();
        addJiyuMessage(greeting);
        saveCurrentMessage('assistant', greeting);
        JiyuVoice.speak(greeting);
    }

    function updateWelcomeGreeting() {
        const name = JiyuMemory.getUserName();
        if (name && welcomeGreeting) {
            welcomeGreeting.textContent = `Heyyy ${name}, what's up? ✨`;
        }
    }

    // --- Conversations ---
    function generateChatId() {
        return 'chat_' + Date.now();
    }

    function startNewChat() {
        currentChatId = generateChatId();
        messagesContainer.innerHTML = '';
        showWelcomeState();
        updateWelcomeGreeting();
        renderSidebarChats();
    }

    function saveCurrentMessage(role, content) {
        JiyuMemory.saveMessage(role, content, currentChatId);
    }

    function renderSidebarChats() {
        const allChats = JiyuMemory.getAllChatIds();
        sidebarChats.innerHTML = '';

        if (allChats.length === 0) {
            sidebarChats.innerHTML = '<p class="sb-empty">No conversations yet</p>';
            return;
        }

        allChats.reverse().forEach(chatId => {
            const msgs = JiyuMemory.getConversationsById(chatId);
            if (msgs.length === 0) return;

            const firstUserMsg = msgs.find(m => m.role === 'user');
            const label = firstUserMsg ? firstUserMsg.content.substring(0, 35) + (firstUserMsg.content.length > 35 ? '...' : '') : 'New chat';

            const item = document.createElement('div');
            item.className = `sb-chat-item ${chatId === currentChatId ? 'active' : ''}`;
            item.textContent = label;
            item.addEventListener('click', () => loadChat(chatId));
            sidebarChats.appendChild(item);
        });
    }

    function loadChat(chatId) {
        currentChatId = chatId;
        messagesContainer.innerHTML = '';
        hideWelcomeState();

        const msgs = JiyuMemory.getConversationsById(chatId);
        msgs.forEach(msg => {
            renderMessage(msg.role === 'user' ? 'user' : 'jiyu', msg.content, false);
        });

        renderSidebarChats();
        scrollToBottom();
    }

    // --- Messages ---
    function showWelcomeState() { if (welcomeState) welcomeState.style.display = 'flex'; }
    function hideWelcomeState() { if (welcomeState) welcomeState.style.display = 'none'; }

    function renderMessage(type, content, animate = true) {
        const div = document.createElement('div');
        div.className = `message ${type}`;
        if (!animate) div.style.animation = 'none';

        const header = document.createElement('div');
        header.className = 'msg-header';

        const dot = document.createElement('span');
        dot.className = 'msg-dot';

        const name = document.createElement('span');
        name.className = 'msg-name';
        name.textContent = type === 'jiyu' ? 'Jiyu' : (JiyuMemory.getUserName() || 'You');

        header.appendChild(dot);
        header.appendChild(name);

        const body = document.createElement('div');
        body.className = 'msg-body';
        body.innerHTML = type === 'jiyu' ? formatMarkdown(content) : escapeHtml(content);

        div.appendChild(header);
        div.appendChild(body);
        messagesContainer.appendChild(div);

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
        saveCurrentMessage('user', text);
        renderSidebarChats();

        userInput.value = '';
        userInput.style.height = 'auto';
        sendBtn.disabled = true;

        isProcessing = true;
        showTyping(true);

        try {
            const history = JiyuMemory.getRecentHistoryById(currentChatId, 20);
            const contextHistory = history.slice(0, -1);
            const response = await JiyuGemini.sendMessage(text, contextHistory);

            showTyping(false);
            addJiyuMessage(response);
            saveCurrentMessage('assistant', response);
            renderSidebarChats();
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
                showToast('Voice input not supported', 'error');
                return;
            }
            JiyuVoice.startListening((text, isFinal) => {
                userInput.value = text;
                sendBtn.disabled = !text.trim();
                userInput.style.height = 'auto';
                userInput.style.height = Math.min(userInput.scrollHeight, 140) + 'px';
                if (isFinal) handleSend();
            });
        }
    }

    function toggleVoiceOutput() {
        const enabled = !JiyuMemory.isVoiceEnabled();
        JiyuMemory.setVoiceEnabled(enabled);
        updateVoiceUI();
        if (!enabled) JiyuVoice.stopCurrentAudio();
        showToast(enabled ? 'Voice on' : 'Voice off', 'success');
    }

    function updateVoiceUI() {
        const enabled = JiyuMemory.isVoiceEnabled();
        $('voice-on-icon').style.display = enabled ? 'block' : 'none';
        $('voice-off-icon').style.display = enabled ? 'none' : 'block';
        voiceToggleBtn.classList.toggle('active', enabled);
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
        if (voices.length === 0) { select.innerHTML = '<option value="">No voices</option>'; return; }
        select.innerHTML = '';
        const cur = JiyuMemory.getElevenLabsVoice();
        voices.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.voice_id;
            opt.textContent = `${v.name} — ${v.labels?.accent || ''} ${v.labels?.gender || ''}`.trim();
            if (v.voice_id === cur) opt.selected = true;
            select.appendChild(opt);
        });
        select.disabled = false;
    }

    function saveSettings() {
        const gk = geminiKeyInput.value.trim();
        const ek = elevenLabsKeyInput.value.trim();
        const un = userNameSettings.value.trim();
        const ve = document.querySelector('input[name="voice-engine"]:checked')?.value || 'browser';
        const sv = elevenLabsVoiceSelect.value;

        if (gk) JiyuMemory.setGeminiKey(gk);
        if (ek) JiyuMemory.setElevenLabsKey(ek);
        if (un) { JiyuMemory.setUserName(un); updateWelcomeGreeting(); }
        JiyuMemory.setVoiceEngine(ve);
        if (sv) JiyuMemory.setElevenLabsVoice(sv);

        closeSettings();
        showToast('Saved', 'success');
    }

    function clearAllData() {
        if (confirm('Clear all data?')) {
            JiyuMemory.clearAll();
            messagesContainer.innerHTML = '';
            closeSettings();
            showToast('Data cleared', 'success');
            setTimeout(() => { loginScreen.classList.add('active'); chatScreen.classList.remove('active'); }, 600);
        }
    }

    // --- Helpers ---
    function scrollToBottom() {
        requestAnimationFrame(() => { chatContainer.scrollTop = chatContainer.scrollHeight; });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
        setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 2200);
    }

    document.addEventListener('DOMContentLoaded', init);
    return { init };
})();
