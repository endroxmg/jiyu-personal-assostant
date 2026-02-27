/* ============================================
   JIYU — Main App Controller
   ============================================ */

const JiyuApp = (() => {
    // DOM Elements
    const $ = (id) => document.getElementById(id);

    const loginScreen = $('login-screen');
    const chatScreen = $('chat-screen');
    const guestBtn = $('guest-btn');
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

    // --- Init ---
    function init() {
        JiyuAuth.init();
        bindEvents();
        updateVoiceUI();

        // Check if user is logged in
        if (JiyuAuth.isLoggedIn()) {
            showChatScreen();
        } else {
            showLoginScreen();
        }

        // Pre-load voices
        if (window.speechSynthesis) {
            window.speechSynthesis.getVoices();
        }
    }

    // --- Event Binding ---
    function bindEvents() {
        // Login
        guestBtn.addEventListener('click', () => {
            JiyuAuth.loginAsGuest();
            showChatScreen();
        });

        // Chat
        sendBtn.addEventListener('click', handleSend);
        userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        });

        // Auto-resize textarea
        userInput.addEventListener('input', () => {
            userInput.style.height = 'auto';
            userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
        });

        // Mic
        micBtn.addEventListener('click', toggleMic);
        JiyuVoice.onListeningChange((listening) => {
            micBtn.classList.toggle('listening', listening);
        });

        // Voice toggle
        voiceToggleBtn.addEventListener('click', toggleVoiceOutput);

        // Settings
        settingsBtn.addEventListener('click', openSettings);
        settingsCloseBtn.addEventListener('click', closeSettings);
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) closeSettings();
        });
        saveSettingsBtn.addEventListener('click', saveSettings);
        clearDataBtn.addEventListener('click', clearAllData);

        // Key visibility toggles
        toggleGeminiKey.addEventListener('click', () => {
            const inp = geminiKeyInput;
            inp.type = inp.type === 'password' ? 'text' : 'password';
        });
        toggleElevenLabsKey.addEventListener('click', () => {
            const inp = elevenLabsKeyInput;
            inp.type = inp.type === 'password' ? 'text' : 'password';
        });

        // ElevenLabs key change → load voices
        elevenLabsKeyInput.addEventListener('change', async () => {
            const key = elevenLabsKeyInput.value.trim();
            if (key) {
                JiyuMemory.setElevenLabsKey(key);
                await loadElevenLabsVoices();
            }
        });

        // Voice engine radios
        document.querySelectorAll('input[name="voice-engine"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                JiyuMemory.setVoiceEngine(e.target.value);
            });
        });

        // Onboarding
        nameSubmitBtn.addEventListener('click', handleNameSubmit);
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleNameSubmit();
        });

        // Sign out
        signoutBtn.addEventListener('click', () => {
            JiyuAuth.signOut();
            showLoginScreen();
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

        // Show sign out for Google users
        const user = JiyuAuth.getCurrentUser();
        if (user && user.provider === 'google') {
            signoutBtn.style.display = 'flex';
        }

        // Load conversation history
        loadMessages();

        // Check onboarding
        if (!JiyuMemory.isOnboardingDone()) {
            showOnboarding();
        } else {
            // Greet returning user
            const name = JiyuMemory.getUserName();
            const convos = JiyuMemory.getConversations();
            if (convos.length === 0 && name) {
                addJiyuMessage(getGreeting(name));
            }
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
        if (!name) {
            nameInput.style.borderColor = '#ef4444';
            nameInput.focus();
            return;
        }

        JiyuMemory.setUserName(name);
        JiyuMemory.setOnboardingDone();
        onboardingModal.style.display = 'none';

        // Jiyu's first greeting
        const greeting = `Heyy ${name}! 🎉 I'm so happy to meet you! I'm Jiyu — think of me as your AI best friend. I'm here to chat, help, brainstorm, vent with, or just hang out. No judgement, no formalities, just us.\n\nSo, what's on your mind? 💜`;
        addJiyuMessage(greeting);
        JiyuMemory.saveMessage('assistant', greeting);
        JiyuVoice.speak(greeting);
    }

    // --- Messages ---
    function loadMessages() {
        messagesContainer.innerHTML = '';
        const history = JiyuMemory.getConversations();
        history.forEach(msg => {
            renderMessage(msg.role === 'user' ? 'user' : 'jiyu', msg.content, false);
        });
        scrollToBottom();
    }

    function renderMessage(type, content, animate = true) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${type}`;
        if (!animate) msgDiv.style.animation = 'none';

        const avatar = document.createElement('div');
        avatar.className = 'msg-avatar';

        if (type === 'jiyu') {
            avatar.textContent = 'J';
        } else {
            const name = JiyuMemory.getUserName();
            avatar.textContent = name ? name[0].toUpperCase() : 'U';
        }

        const bubble = document.createElement('div');
        bubble.className = 'msg-bubble';

        if (type === 'jiyu') {
            bubble.innerHTML = formatMarkdown(content);
        } else {
            bubble.textContent = content;
        }

        msgDiv.appendChild(avatar);
        msgDiv.appendChild(bubble);
        messagesContainer.appendChild(msgDiv);

        if (animate) scrollToBottom();
    }

    function addJiyuMessage(content) {
        renderMessage('jiyu', content, true);
    }

    function addUserMessage(content) {
        renderMessage('user', content, true);
    }

    // --- Send ---
    async function handleSend() {
        const text = userInput.value.trim();
        if (!text || isProcessing) return;

        // Stop any ongoing voice
        JiyuVoice.stopCurrentAudio();

        // Add user message
        addUserMessage(text);
        JiyuMemory.saveMessage('user', text);
        userInput.value = '';
        userInput.style.height = 'auto';

        // Show typing
        isProcessing = true;
        showTyping(true);

        try {
            const history = JiyuMemory.getRecentHistory(20);
            // Remove latest message (we just added it) to avoid duplication in API context
            const contextHistory = history.slice(0, -1);
            const response = await JiyuGemini.sendMessage(text, contextHistory);

            showTyping(false);
            addJiyuMessage(response);
            JiyuMemory.saveMessage('assistant', response);

            // Voice output
            JiyuVoice.speak(response);
        } catch (error) {
            showTyping(false);
            const errMsg = `Oops, something went wrong 😅 — ${error.message}`;
            addJiyuMessage(errMsg);
            showToast(error.message, 'error');
        }

        isProcessing = false;
        userInput.focus();
    }

    // --- Typing Indicator ---
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
                userInput.style.height = 'auto';
                userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
                if (isFinal) {
                    handleSend();
                }
            });
        }
    }

    function toggleVoiceOutput() {
        const enabled = !JiyuMemory.isVoiceEnabled();
        JiyuMemory.setVoiceEnabled(enabled);
        updateVoiceUI();

        if (!enabled) {
            JiyuVoice.stopCurrentAudio();
        }

        showToast(enabled ? 'Voice responses enabled 🔊' : 'Voice responses muted 🔇', 'success');
    }

    function updateVoiceUI() {
        const enabled = JiyuMemory.isVoiceEnabled();
        const onIcon = document.getElementById('voice-on-icon');
        const offIcon = document.getElementById('voice-off-icon');

        if (enabled) {
            onIcon.style.display = 'block';
            offIcon.style.display = 'none';
            voiceToggleBtn.classList.add('active');
        } else {
            onIcon.style.display = 'none';
            offIcon.style.display = 'block';
            voiceToggleBtn.classList.remove('active');
        }
    }

    // --- Settings ---
    function openSettings() {
        geminiKeyInput.value = JiyuMemory.getGeminiKey();
        elevenLabsKeyInput.value = JiyuMemory.getElevenLabsKey();
        userNameSettings.value = JiyuMemory.getUserName();

        // Set voice engine radio
        const engine = JiyuMemory.getVoiceEngine();
        document.querySelectorAll('input[name="voice-engine"]').forEach(r => {
            r.checked = r.value === engine;
        });

        // Load voices if key exists
        if (JiyuMemory.getElevenLabsKey()) {
            loadElevenLabsVoices();
        }

        settingsModal.style.display = 'flex';
    }

    function closeSettings() {
        settingsModal.style.display = 'none';
    }

    async function loadElevenLabsVoices() {
        const select = elevenLabsVoiceSelect;
        select.innerHTML = '<option value="">Loading voices...</option>';
        select.disabled = true;

        const voices = await JiyuVoice.fetchElevenLabsVoices();

        if (voices.length === 0) {
            select.innerHTML = '<option value="">No voices found (check API key)</option>';
            return;
        }

        select.innerHTML = '';
        const currentVoice = JiyuMemory.getElevenLabsVoice();

        voices.forEach(voice => {
            const opt = document.createElement('option');
            opt.value = voice.voice_id;
            opt.textContent = `${voice.name} — ${voice.labels?.accent || ''} ${voice.labels?.gender || ''}`.trim();
            if (voice.voice_id === currentVoice) opt.selected = true;
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
        showToast('Settings saved! ✨', 'success');
    }

    function clearAllData() {
        if (confirm('This will clear ALL data — conversations, settings, everything. Are you sure?')) {
            JiyuMemory.clearAll();
            messagesContainer.innerHTML = '';
            closeSettings();
            showToast('All data cleared', 'success');
            setTimeout(() => {
                showLoginScreen();
            }, 1000);
        }
    }

    // --- Helpers ---
    function scrollToBottom() {
        requestAnimationFrame(() => {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        });
    }

    function formatMarkdown(text) {
        return text
            // Code blocks
            .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            // Inline code
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            // Bold
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            // Italic
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            // Headers
            .replace(/^### (.+)$/gm, '<strong>$1</strong>')
            .replace(/^## (.+)$/gm, '<strong>$1</strong>')
            .replace(/^# (.+)$/gm, '<strong>$1</strong>')
            // Unordered lists
            .replace(/^[*-] (.+)$/gm, '• $1')
            // Ordered lists (keep as-is)
            // Links
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:var(--purple-400)">$1</a>')
            // Line breaks
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            // Wrap in paragraph
            .replace(/^(.+)$/, '<p>$1</p>')
            // Clean empty paragraphs
            .replace(/<p><\/p>/g, '');
    }

    function getGreeting(name) {
        const hour = new Date().getHours();
        const greetings = {
            morning: [
                `Good morning, ${name}! ☀️ Ready to take on the day?`,
                `Morning ${name}! 🌅 Hope you slept well. What's the plan today?`,
                `Hey ${name}! Rise and shine ✨ What can I help you with?`,
            ],
            afternoon: [
                `Hey ${name}! 👋 How's your day going so far?`,
                `What's up ${name}! Hope you're having an awesome day 💜`,
                `Heyy ${name}! Good to see you back 😊 What's on your mind?`,
            ],
            evening: [
                `Hey ${name}! 🌙 How was your day? I'm all ears.`,
                `Evening ${name}! 💜 Winding down or just getting started?`,
                `Hey ${name}! Good evening ✨ What's going on?`,
            ],
        };

        let timeKey = 'afternoon';
        if (hour < 12) timeKey = 'morning';
        else if (hour >= 18) timeKey = 'evening';

        const options = greetings[timeKey];
        return options[Math.floor(Math.random() * options.length)];
    }

    function showToast(message, type = '') {
        // Remove existing toast
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // --- Boot ---
    document.addEventListener('DOMContentLoaded', init);

    return { init };
})();
