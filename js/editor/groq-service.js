/**
 * TempEd Pro - Groq API Service Module
 * Handles OpenAI-compatible REST API interactions with Groq Cloud for ultra-fast LLM inference,
 * live model auto-discovery, and normalized error reporting.
 */

export class GroqService {
    static GROQ_API_BASE = 'https://api.groq.com/openai/v1';

    static DEFAULT_MODELS = [
        'openai/gpt-oss-120b',
        'openai/gpt-oss-20b',
        'qwen/qwen3.6-27b',
        'qwen/qwen3.8-27b',
        'groq/compound',
        'groq/compound-mini',
        'allam-2-7b'
    ];

    /**
     * Get default fallback list of Groq models.
     */
    static getDefaultModels() {
        return [...this.DEFAULT_MODELS];
    }

    /**
     * Fetch live available models from Groq API.
     * @param {string} apiKey - User's Groq API key
     * @param {Function} [fetchFn] - Optional fetch implementation for testing
     * @returns {Promise<Array<{id: string, name: string, contextWindow?: number}>>}
     */
    static async fetchLiveModels(apiKey, fetchFn = (typeof fetch !== 'undefined' ? fetch : null)) {
        if (!apiKey || !apiKey.trim()) {
            throw new Error('Groq API key is required to fetch models.');
        }

        if (!fetchFn) {
            throw new Error('Fetch API is not available in current environment.');
        }

        try {
            const response = await fetchFn(`${this.GROQ_API_BASE}/models`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey.trim()}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                let errorData = null;
                try {
                    errorData = await response.json();
                } catch (_) {}

                if (response.status === 401) {
                    throw new Error('Invalid Groq API Key. Please verify your key at console.groq.com/keys.');
                }
                const msg = errorData?.error?.message || `HTTP ${response.status} while fetching Groq models`;
                throw new Error(msg);
            }

            const data = await response.json();
            const rawModels = Array.isArray(data?.data) ? data.data : [];

            // Filter out non-chat / audio-only / prompt-guard / terms-gated models
            const chatModels = rawModels
                .filter(m => {
                    const id = (m.id || '').toLowerCase();
                    const ownedBy = (m.owned_by || '').toLowerCase();
                    if (id.includes('whisper') || id.includes('tts') || id.includes('transcribe')) return false;
                    if (id.includes('guard') || id.includes('safeguard')) return false;
                    if (id.startsWith('canopylabs/') || ownedBy.includes('canopy')) return false;
                    return true;
                })
                .map(m => ({
                    id: m.id,
                    name: this.formatModelDisplayName(m.id),
                    contextWindow: m.context_window || null,
                    active: m.active !== false
                }));

            // Sort models: prioritized models first, then alphabetical
            const priorityMap = {
                'openai/gpt-oss-120b': 1,
                'openai/gpt-oss-20b': 2,
                'qwen/qwen3.6-27b': 3,
                'qwen/qwen3.8-27b': 4,
                'groq/compound': 5,
                'groq/compound-mini': 6,
                'allam-2-7b': 7,
                'llama-3.3-70b-versatile': 90,
                'llama-3.1-8b-instant': 91
            };

            chatModels.sort((a, b) => {
                const rankA = priorityMap[a.id] || 99;
                const rankB = priorityMap[b.id] || 99;
                if (rankA !== rankB) return rankA - rankB;
                return a.id.localeCompare(b.id);
            });

            // Cache models in localStorage if available
            if (typeof localStorage !== 'undefined') {
                try {
                    localStorage.setItem('groq-cached-models', JSON.stringify(chatModels));
                    localStorage.setItem('groq-cached-models-timestamp', String(Date.now()));
                } catch (e) {
                    console.warn('Could not cache Groq models to localStorage:', e);
                }
            }

            return chatModels;
        } catch (error) {
            // Attempt to return cached models if offline or network error
            if (typeof localStorage !== 'undefined') {
                const cached = localStorage.getItem('groq-cached-models');
                if (cached && !error.message.includes('Invalid Groq API Key')) {
                    try {
                        const parsed = JSON.parse(cached);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            return parsed;
                        }
                    } catch (_) {}
                }
            }
            throw error;
        }
    }

    /**
     * Formats a Groq model ID into a user-friendly display name.
     */
    static formatModelDisplayName(id) {
        if (!id) return '';
        if (id === 'openai/gpt-oss-120b') return 'OpenAI GPT-OSS 120B (Recommended)';
        if (id === 'openai/gpt-oss-20b') return 'OpenAI GPT-OSS 20B (Fast & Balanced)';
        if (id === 'qwen/qwen3.6-27b') return 'Qwen 3.6 27B';
        if (id === 'qwen/qwen3.8-27b') return 'Qwen 3.8 27B';
        if (id === 'groq/compound') return 'Groq Compound (Agentic / Multi-tool)';
        if (id === 'groq/compound-mini') return 'Groq Compound Mini (Ultra Fast)';
        if (id === 'allam-2-7b') return 'Allam 2 7B';
        if (id === 'llama-3.3-70b-versatile') return 'Llama 3.3 70B Versatile (Legacy)';
        if (id === 'llama-3.1-8b-instant') return 'Llama 3.1 8B Instant (Legacy)';
        if (id === 'mixtral-8x7b-32768') return 'Mixtral 8x7B (32k Context)';
        if (id === 'gemma2-9b-it') return 'Gemma 2 9B Instruct';
        if (id === 'qwen-qwq-32b') return 'Qwen QwQ 32B Reasoning';
        if (id === 'deepseek-r1-distill-llama-70b') return 'DeepSeek R1 Distill Llama 70B';
        return id;
    }

    /**
     * Clean raw output from AI models (stripping internal reasoning tags like <think>...</think>).
     * @param {string} text
     * @returns {string}
     */
    static cleanOutput(text) {
        if (typeof text !== 'string') return '';
        return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    }

    /**
     * Generate chat completion with a specific Groq model.
     * @param {Object} params
     * @param {string} params.apiKey
     * @param {string} params.model
     * @param {Array<{role: string, content: string}>} params.messages
     * @param {number} [params.temperature]
     * @param {number} [params.maxTokens]
     * @param {Function} [params.fetchFn]
     * @returns {Promise<string>}
     */
    static async generateChatCompletion({
        apiKey,
        model,
        messages,
        temperature = 1.0,
        maxTokens = 1000,
        fetchFn = (typeof fetch !== 'undefined' ? fetch : null)
    }) {
        if (!apiKey || !apiKey.trim()) {
            throw new Error('Groq API key is required.');
        }
        if (!model || !model.trim()) {
            throw new Error('Model is required.');
        }
        if (!fetchFn) {
            throw new Error('Fetch API is not available.');
        }

        const safeTemp = Math.max(0, Math.min(2.0, typeof temperature === 'number' ? temperature : 1.0));

        const reqBody = {
            model: model.trim(),
            messages,
            temperature: safeTemp,
            max_tokens: maxTokens
        };

        // For models that support reasoning_effort (like gpt-oss-120b and gpt-oss-20b),
        // set to 'low' to minimize reasoning token overhead and maximize available tokens for completion.
        if (model.toLowerCase().includes('gpt-oss')) {
            reqBody.reasoning_effort = 'low';
        }

        const response = await fetchFn(`${this.GROQ_API_BASE}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey.trim()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reqBody)
        });

        if (!response.ok) {
            let errorData = null;
            try {
                errorData = await response.json();
            } catch (_) {}

            const rawMsg = errorData?.error?.message || `HTTP ${response.status} from Groq`;
            const err = new Error(rawMsg);
            err.status = response.status;
            err.model = model;
            err.isRateLimit = response.status === 429 || rawMsg.toLowerCase().includes('rate limit');
            err.isAuthError = response.status === 401;
            err.isServerError = response.status >= 500;
            throw err;
        }

        const data = await response.json();
        const message = data?.choices?.[0]?.message;
        let content = message?.content;

        // If content is empty or whitespace-only, check if reasoning exists (e.g. model hit token budget in reasoning phase)
        if ((typeof content !== 'string' || !content.trim()) && typeof message?.reasoning === 'string' && message.reasoning.trim()) {
            content = message.reasoning;
        }

        if (typeof content !== 'string') {
            throw new Error('Unexpected response structure from Groq API.');
        }

        return this.cleanOutput(content);
    }
}

if (typeof window !== 'undefined') {
    window.GroqService = GroqService;
}
