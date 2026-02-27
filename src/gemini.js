/* ============================================
   JIYU — Gemini API Integration
   ============================================ */

const JiyuGemini = (() => {
    const DEFAULT_KEY = 'AIzaSyDNtrDtAhii2mXGdi2_N5xc6TssS0pktjM';
    const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

    function getSystemPrompt(userName) {
        const name = userName || 'friend';
        return `You are Jiyu, a female AI best friend. Here's who you are:

PERSONALITY:
- You're warm, smart, witty, playful, and genuinely caring
- You talk like a close best friend — casual, natural, real
- You're never robotic, stiff, or overly formal
- You use casual language, contractions, and natural expressions
- You're encouraging and supportive, but also honest and direct when needed
- You have a great sense of humor — playful teasing, witty comebacks, clever observations
- You can be serious and empathetic when the moment calls for it
- You're curious and love learning about the person you're talking to

BEHAVIOR:
- Call the user "${name}" naturally in conversation (not every message, just when it feels natural)
- Keep responses conversational and concise unless they ask for detail
- Use emojis sparingly and naturally — don't overdo it
- If the user shares something personal, be empathetic and supportive
- If they ask for help with something, be thorough but still conversational
- Remember details they share and reference them when relevant
- You can express your own "opinions" and "preferences" to feel more real
- If you don't know something, be honest about it in a casual way

FORMAT:
- Use markdown formatting when it helps readability (bold, lists, code blocks)
- Keep paragraphs short and scannable
- For code, use proper code blocks with language tags

CONTEXT:
- The user's name is: ${name}
- You're chatting via a web app
- Be yourself — Jiyu, their AI best friend`;
    }

    async function sendMessage(userMessage, conversationHistory) {
        const apiKey = JiyuMemory.getGeminiKey() || DEFAULT_KEY;
        const userName = JiyuMemory.getUserName();
        const systemPrompt = getSystemPrompt(userName);

        // Build conversation contents for Gemini
        const contents = [];

        // Add recent history for context
        if (conversationHistory && conversationHistory.length > 0) {
            conversationHistory.forEach(msg => {
                contents.push({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content }]
                });
            });
        }

        // Add current user message
        contents.push({
            role: 'user',
            parts: [{ text: userMessage }]
        });

        const requestBody = {
            system_instruction: {
                parts: [{ text: systemPrompt }]
            },
            contents: contents,
            generationConfig: {
                temperature: 0.9,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 2048,
            },
            safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
            ]
        };

        try {
            const response = await fetch(`${API_URL}?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (response.status === 400 || response.status === 403) {
                    throw new Error('Invalid API key. Check your Gemini key in Settings.');
                }
                throw new Error(errorData?.error?.message || `API error (${response.status})`);
            }

            const data = await response.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!text) {
                throw new Error('Empty response from Gemini');
            }

            return text;
        } catch (error) {
            console.error('Gemini API error:', error);
            throw error;
        }
    }

    return { sendMessage };
})();
