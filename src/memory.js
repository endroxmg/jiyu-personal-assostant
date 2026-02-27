/* ============================================
   JIYU — Memory System (localStorage)
   ============================================ */

const JiyuMemory = (() => {
    const KEYS = {
        userName: 'jiyu_user_name',
        conversations: 'jiyu_conversations',
        preferences: 'jiyu_preferences',
        geminiKey: 'jiyu_gemini_key',
        elevenLabsKey: 'jiyu_elevenlabs_key',
        elevenLabsVoice: 'jiyu_elevenlabs_voice',
        voiceEngine: 'jiyu_voice_engine',
        voiceEnabled: 'jiyu_voice_enabled',
        authUser: 'jiyu_auth_user',
        onboardingDone: 'jiyu_onboarding_done',
    };

    const MAX_MESSAGES = 200;

    // --- User Name ---
    function getUserName() {
        return localStorage.getItem(KEYS.userName) || '';
    }

    function setUserName(name) {
        localStorage.setItem(KEYS.userName, name.trim());
    }

    // --- Conversations ---
    function getConversations() {
        try {
            return JSON.parse(localStorage.getItem(KEYS.conversations)) || [];
        } catch {
            return [];
        }
    }

    function saveMessage(role, content) {
        const convos = getConversations();
        convos.push({
            role,
            content,
            timestamp: Date.now()
        });
        // Cap at MAX_MESSAGES
        while (convos.length > MAX_MESSAGES) {
            convos.shift();
        }
        localStorage.setItem(KEYS.conversations, JSON.stringify(convos));
    }

    function getRecentHistory(count = 20) {
        const convos = getConversations();
        return convos.slice(-count);
    }

    function clearConversations() {
        localStorage.removeItem(KEYS.conversations);
    }

    // --- Preferences ---
    function getPreferences() {
        try {
            return JSON.parse(localStorage.getItem(KEYS.preferences)) || {};
        } catch {
            return {};
        }
    }

    function updatePreferences(updates) {
        const prefs = getPreferences();
        Object.assign(prefs, updates);
        localStorage.setItem(KEYS.preferences, JSON.stringify(prefs));
    }

    // --- API Keys ---
    function getGeminiKey() {
        return localStorage.getItem(KEYS.geminiKey) || '';
    }

    function setGeminiKey(key) {
        localStorage.setItem(KEYS.geminiKey, key.trim());
    }

    function getElevenLabsKey() {
        return localStorage.getItem(KEYS.elevenLabsKey) || '';
    }

    function setElevenLabsKey(key) {
        localStorage.setItem(KEYS.elevenLabsKey, key.trim());
    }

    function getElevenLabsVoice() {
        return localStorage.getItem(KEYS.elevenLabsVoice) || '';
    }

    function setElevenLabsVoice(voiceId) {
        localStorage.setItem(KEYS.elevenLabsVoice, voiceId);
    }

    // --- Voice Settings ---
    function getVoiceEngine() {
        return localStorage.getItem(KEYS.voiceEngine) || 'browser';
    }

    function setVoiceEngine(engine) {
        localStorage.setItem(KEYS.voiceEngine, engine);
    }

    function isVoiceEnabled() {
        const val = localStorage.getItem(KEYS.voiceEnabled);
        return val === null ? true : val === 'true';
    }

    function setVoiceEnabled(enabled) {
        localStorage.setItem(KEYS.voiceEnabled, String(enabled));
    }

    // --- Auth ---
    function getAuthUser() {
        try {
            return JSON.parse(localStorage.getItem(KEYS.authUser));
        } catch {
            return null;
        }
    }

    function setAuthUser(user) {
        localStorage.setItem(KEYS.authUser, JSON.stringify(user));
    }

    function clearAuthUser() {
        localStorage.removeItem(KEYS.authUser);
    }

    // --- Onboarding ---
    function isOnboardingDone() {
        return localStorage.getItem(KEYS.onboardingDone) === 'true';
    }

    function setOnboardingDone() {
        localStorage.setItem(KEYS.onboardingDone, 'true');
    }

    // --- Clear All ---
    function clearAll() {
        Object.values(KEYS).forEach(key => localStorage.removeItem(key));
    }

    return {
        getUserName, setUserName,
        getConversations, saveMessage, getRecentHistory, clearConversations,
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
