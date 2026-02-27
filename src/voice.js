/* ============================================
   JIYU — Voice System (Web Speech + ElevenLabs)
   ============================================ */

const JiyuVoice = (() => {
    let recognition = null;
    let isListening = false;
    let currentAudio = null;
    let onResultCallback = null;
    let onListeningChangeCallback = null;

    // --- Speech Recognition (Input) ---
    function initRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn('Speech Recognition not supported');
            return false;
        }

        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            if (onResultCallback) {
                onResultCallback(finalTranscript || interimTranscript, !!finalTranscript);
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setListening(false);
        };

        recognition.onend = () => {
            setListening(false);
        };

        return true;
    }

    function startListening(onResult) {
        if (!recognition && !initRecognition()) return false;
        onResultCallback = onResult;
        try {
            recognition.start();
            setListening(true);
            return true;
        } catch (e) {
            console.error('Could not start recognition:', e);
            return false;
        }
    }

    function stopListening() {
        if (recognition && isListening) {
            recognition.stop();
            setListening(false);
        }
    }

    function setListening(val) {
        isListening = val;
        if (onListeningChangeCallback) onListeningChangeCallback(val);
    }

    function onListeningChange(cb) {
        onListeningChangeCallback = cb;
    }

    // --- Speech Synthesis (Browser Output) ---
    function speakBrowser(text) {
        return new Promise((resolve) => {
            if (!window.speechSynthesis) {
                resolve();
                return;
            }

            // Clean markdown from text
            const cleanText = text
                .replace(/```[\s\S]*?```/g, '... code block ...')
                .replace(/`([^`]+)`/g, '$1')
                .replace(/\*\*([^*]+)\*\*/g, '$1')
                .replace(/\*([^*]+)\*/g, '$1')
                .replace(/#{1,6}\s/g, '')
                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                .replace(/[*_~`#]/g, '')
                .trim();

            // Cancel any ongoing speech
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(cleanText);

            // Try to select a female voice
            const voices = window.speechSynthesis.getVoices();
            const preferredVoices = [
                'Google UK English Female',
                'Microsoft Zira',
                'Samantha',
                'Karen',
                'Victoria',
                'Google US English',
            ];

            let selectedVoice = null;
            for (const name of preferredVoices) {
                selectedVoice = voices.find(v => v.name.includes(name));
                if (selectedVoice) break;
            }

            // Fallback: any female-sounding voice
            if (!selectedVoice) {
                selectedVoice = voices.find(v =>
                    v.lang.startsWith('en') && (
                        v.name.toLowerCase().includes('female') ||
                        v.name.includes('Zira') ||
                        v.name.includes('Hazel') ||
                        v.name.includes('Susan')
                    )
                );
            }

            if (!selectedVoice) {
                selectedVoice = voices.find(v => v.lang.startsWith('en'));
            }

            if (selectedVoice) utterance.voice = selectedVoice;
            utterance.rate = 1.0;
            utterance.pitch = 1.1;
            utterance.volume = 1;

            utterance.onend = resolve;
            utterance.onerror = resolve;

            window.speechSynthesis.speak(utterance);
        });
    }

    // --- ElevenLabs (Premium Output) ---
    async function speakElevenLabs(text) {
        const apiKey = JiyuMemory.getElevenLabsKey();
        const voiceId = JiyuMemory.getElevenLabsVoice() || 'EXAVITQu4vr4xnSDxMaL'; // Default: Bella

        if (!apiKey) {
            return speakBrowser(text);
        }

        // Clean markdown
        const cleanText = text
            .replace(/```[\s\S]*?```/g, '... code block ...')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/\*\*([^*]+)\*\*/g, '$1')
            .replace(/\*([^*]+)\*/g, '$1')
            .replace(/#{1,6}\s/g, '')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/[*_~`#]/g, '')
            .trim();

        // Limit length for API
        const truncated = cleanText.length > 1000 ? cleanText.substring(0, 1000) + '...' : cleanText;

        try {
            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'xi-api-key': apiKey,
                },
                body: JSON.stringify({
                    text: truncated,
                    model_id: 'eleven_multilingual_v2',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                        style: 0.3,
                        use_speaker_boost: true,
                    }
                })
            });

            if (!response.ok) {
                console.error('ElevenLabs error:', response.status);
                return speakBrowser(text);
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);

            return new Promise((resolve) => {
                stopCurrentAudio();
                currentAudio = new Audio(audioUrl);
                currentAudio.onended = () => {
                    URL.revokeObjectURL(audioUrl);
                    currentAudio = null;
                    document.body.classList.remove('voice-playing');
                    resolve();
                };
                currentAudio.onerror = () => {
                    URL.revokeObjectURL(audioUrl);
                    currentAudio = null;
                    document.body.classList.remove('voice-playing');
                    resolve();
                };
                document.body.classList.add('voice-playing');
                currentAudio.play().catch(resolve);
            });
        } catch (error) {
            console.error('ElevenLabs error:', error);
            return speakBrowser(text);
        }
    }

    // --- Fetch ElevenLabs Voices ---
    async function fetchElevenLabsVoices() {
        const apiKey = JiyuMemory.getElevenLabsKey();
        if (!apiKey) return [];

        try {
            const response = await fetch('https://api.elevenlabs.io/v1/voices', {
                headers: { 'xi-api-key': apiKey }
            });
            if (!response.ok) return [];
            const data = await response.json();
            return data.voices || [];
        } catch {
            return [];
        }
    }

    // --- Main Speak Function ---
    async function speak(text) {
        if (!JiyuMemory.isVoiceEnabled()) return;

        const engine = JiyuMemory.getVoiceEngine();
        if (engine === 'elevenlabs') {
            return speakElevenLabs(text);
        }
        return speakBrowser(text);
    }

    function stopCurrentAudio() {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
            document.body.classList.remove('voice-playing');
        }
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    }

    function isRecognitionSupported() {
        return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    }

    // Pre-load voices
    if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = () => {
            window.speechSynthesis.getVoices();
        };
    }

    return {
        startListening,
        stopListening,
        onListeningChange,
        speak,
        speakBrowser,
        speakElevenLabs,
        stopCurrentAudio,
        fetchElevenLabsVoices,
        isRecognitionSupported,
        get isListening() { return isListening; },
    };
})();
