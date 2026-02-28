/* ============================================
   JIYU — Memory System (localStorage)
   Supports per-chat conversations
   ============================================ */

const JiyuMemory = (() => {
    const KEYS = {
        userName: 'jiyu_user_name',
        conversations: 'jiyu_conversations', // legacy
        chatIndex: 'jiyu_chat_index', // array of chat IDs
        preferences: 'jiyu_preferences',
        geminiKey: 'jiyu_gemini_key',
        elevenLabsKey: 'jiyu_elevenlabs_key',
        elevenLabsVoice: 'jiyu_elevenlabs_voice',
        voiceEngine: 'jiyu_voice_engine',
        voiceEnabled: 'jiyu_voice_enabled',
        authUser: 'jiyu_auth_user',
        onboardingDone: 'jiyu_onboarding_done',
    };

    const MAX_MESSAGES_PER_CHAT = 200;
    const MAX_CHATS = 50;

    // --- User Name ---
    function getUserName() { return localStorage.getItem(KEYS.userName) || ''; }
    function setUserName(name) { localStorage.setItem(KEYS.userName, name.trim()); }

    // --- Chat Index ---
    function getAllChatIds() {
        try { return JSON.parse(localStorage.getItem(KEYS.chatIndex)) || []; }
        catch { return []; }
    }

    function addChatId(chatId) {
        const ids = getAllChatIds();
        if (!ids.includes(chatId)) {
            ids.push(chatId);
            while (ids.length > MAX_CHATS) {
                const old = ids.shift();
                localStorage.removeItem('jiyu_chat_' + old);
            }
            localStorage.setItem(KEYS.chatIndex, JSON.stringify(ids));
        }
    }

    // --- Per-Chat Conversations ---
    function getConversationsById(chatId) {
        try { return JSON.parse(localStorage.getItem('jiyu_chat_' + chatId)) || []; }
        catch { return []; }
    }

    function saveMessage(role, content, chatId) {
        if (!chatId) return;
        addChatId(chatId);
        const msgs = getConversationsById(chatId);
        msgs.push({ role, content, timestamp: Date.now() });
        while (msgs.length > MAX_MESSAGES_PER_CHAT) msgs.shift();
        localStorage.setItem('jiyu_chat_' + chatId, JSON.stringify(msgs));
    }

    function getRecentHistoryById(chatId, count = 20) {
        return getConversationsById(chatId).slice(-count);
    }

    // Legacy — for backward compat
    function getConversations() {
        try { return JSON.parse(localStorage.getItem(KEYS.conversations)) || []; }
        catch { return []; }
    }

    function getRecentHistory(count = 20) {
        return getConversations().slice(-count);
    }

    function clearConversations() {
        localStorage.removeItem(KEYS.conversations);
        const ids = getAllChatIds();
        ids.forEach(id => localStorage.removeItem('jiyu_chat_' + id));
        localStorage.removeItem(KEYS.chatIndex);
    }

    // --- API Keys ---
    function getGeminiKey() { return localStorage.getItem(KEYS.geminiKey) || ''; }
    function setGeminiKey(key) { localStorage.setItem(KEYS.geminiKey, key.trim()); }

    function getElevenLabsKey() { return localStorage.getItem(KEYS.elevenLabsKey) || ''; }
    function setElevenLabsKey(key) { localStorage.setItem(KEYS.elevenLabsKey, key.trim()); }

    function getElevenLabsVoice() { return localStorage.getItem(KEYS.elevenLabsVoice) || ''; }
    function setElevenLabsVoice(voiceId) { localStorage.setItem(KEYS.elevenLabsVoice, voiceId); }

    // --- Voice ---
    function getVoiceEngine() { return localStorage.getItem(KEYS.voiceEngine) || 'browser'; }
    function setVoiceEngine(engine) { localStorage.setItem(KEYS.voiceEngine, engine); }
    function isVoiceEnabled() { const v = localStorage.getItem(KEYS.voiceEnabled); return v === null ? true : v === 'true'; }
    function setVoiceEnabled(enabled) { localStorage.setItem(KEYS.voiceEnabled, String(enabled)); }

    // --- Auth ---
    function getAuthUser() { try { return JSON.parse(localStorage.getItem(KEYS.authUser)); } catch { return null; } }
    function setAuthUser(user) { localStorage.setItem(KEYS.authUser, JSON.stringify(user)); }
    function clearAuthUser() { localStorage.removeItem(KEYS.authUser); }

    // --- Onboarding ---
    function isOnboardingDone() { return localStorage.getItem(KEYS.onboardingDone) === 'true'; }
    function setOnboardingDone() { localStorage.setItem(KEYS.onboardingDone, 'true'); }

    // --- Preferences ---
    function getPreferences() { try { return JSON.parse(localStorage.getItem(KEYS.preferences)) || {}; } catch { return {}; } }
    function updatePreferences(updates) { const p = getPreferences(); Object.assign(p, updates); localStorage.setItem(KEYS.preferences, JSON.stringify(p)); }

    // --- Clear All ---
    function clearAll() {
        const ids = getAllChatIds();
        ids.forEach(id => localStorage.removeItem('jiyu_chat_' + id));
        Object.values(KEYS).forEach(key => localStorage.removeItem(key));
    }

    return {
        getUserName, setUserName,
        getAllChatIds, getConversationsById, saveMessage, getRecentHistoryById,
        getConversations, getRecentHistory, clearConversations,
        getPreferences, updatePreferences,
        getGeminiKey, setGeminiKey,
        getElevenLabsKey, setElevenLabsKey,
        getElevenLabsVoice, setElevenLabsVoice,
        getVoiceEngine, setVoiceEngine,
        isVoiceEnabled, setVoiceEnabled,
        getAuthUser, setAuthUser, clearAuthUser,
        isOnboardingDone, setOnboardingDone,
        clearAll
    };
})();
