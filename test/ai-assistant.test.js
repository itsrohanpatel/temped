import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIAssistant } from '../js/editor/ai-assistant.js';
import { GroqService } from '../js/editor/groq-service.js';

describe('AIAssistant', () => {
    let assistant;

    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
        assistant = new AIAssistant();
    });

    it('should retrieve default prompt templates', () => {
        const templates = assistant.getDefaultPromptTemplates();
        expect(templates).toHaveProperty('optimize');
        expect(templates).toHaveProperty('suggest');
        expect(templates).toHaveProperty('tone');
        expect(templates).toHaveProperty('subject');
        expect(templates).toHaveProperty('rewrite');
        expect(templates.optimize).toContain('{content}');
    });

    it('should format prompts by replacing placeholders', () => {
        const template = 'System: {systemPrompt}\nSubject: {subject}\nBody: {content}';
        const formatted = assistant.formatPrompt(template, {
            systemPrompt: 'Be concise',
            subject: 'Exclusive deal',
            content: '<p>Click here</p>'
        });

        expect(formatted).toBe('System: Be concise\nSubject: Exclusive deal\nBody: <p>Click here</p>');
    });

    it('should resolve temperature based on global or feature-specific mode', () => {
        localStorage.setItem('ai-temperature-mode', 'normal');
        localStorage.setItem('ai-temperature', '0.7');
        expect(assistant.getTemperatureForFeature('optimize')).toBe(0.7);

        localStorage.setItem('ai-temperature-mode', 'advanced');
        localStorage.setItem('ai-temperature-optimize', '0.2');
        expect(assistant.getTemperatureForFeature('optimize')).toBe(0.2);
    });

    it('should throw or return clear error if no API keys are configured', async () => {
        await expect(assistant.generate({
            feature: 'optimize',
            content: 'Hello world'
        })).rejects.toThrow(/API key/i);
    });

    it('should call GoogleGenerativeAI when Gemini is selected and API key is provided', async () => {
        localStorage.setItem('ai-provider', 'gemini');
        localStorage.setItem('gemini-api-key', 'mock-key');
        const mockGenerateContent = vi.fn().mockResolvedValue({
            response: {
                text: () => '<p>Optimized text</p>'
            }
        });

        const mockGetGenerativeModel = vi.fn().mockReturnValue({
            generateContent: mockGenerateContent
        });

        const mockGoogleGenerativeAI = vi.fn().mockImplementation(() => ({
            getGenerativeModel: mockGetGenerativeModel
        }));

        const result = await assistant.generate({
            feature: 'optimize',
            content: '<p>Draft</p>',
            clientClass: mockGoogleGenerativeAI
        });

        expect(result).toBe('<p>Optimized text</p>');
        expect(mockGetGenerativeModel).toHaveBeenCalledWith(expect.objectContaining({
            generationConfig: expect.objectContaining({ temperature: expect.any(Number) })
        }));
    });

    it('should call GroqService when Groq provider is active', async () => {
        localStorage.setItem('ai-provider', 'groq');
        localStorage.setItem('groq-api-key', 'gsk-key');
        localStorage.setItem('groq-model-name', 'llama-3.3-70b-versatile');

        const spy = vi.spyOn(GroqService, 'generateChatCompletion').mockResolvedValue('<p>Groq output</p>');

        const result = await assistant.generate({
            feature: 'optimize',
            content: '<p>Draft</p>'
        });

        expect(result).toBe('<p>Groq output</p>');
        expect(spy).toHaveBeenCalledWith(expect.objectContaining({
            apiKey: 'gsk-key',
            model: 'llama-3.3-70b-versatile'
        }));
    });

    it('should prioritize explicit prompt if passed in generateWithFallback', async () => {
        localStorage.setItem('ai-provider', 'groq');
        localStorage.setItem('groq-api-key', 'gsk-key');

        const spy = vi.spyOn(GroqService, 'generateChatCompletion').mockResolvedValue('Custom prompt response');

        const result = await assistant.generateWithFallback({
            feature: 'optimize',
            prompt: 'Explicit custom rendered prompt'
        });

        expect(result).toBe('Custom prompt response');
        expect(spy).toHaveBeenCalledWith(expect.objectContaining({
            messages: expect.arrayContaining([
                expect.objectContaining({ role: 'user', content: 'Explicit custom rendered prompt' })
            ])
        }));
    });

    it('should pass explicit temperature to GroqService if provided in options', async () => {
        localStorage.setItem('ai-provider', 'groq');
        localStorage.setItem('groq-api-key', 'gsk-key');

        const spy = vi.spyOn(GroqService, 'generateChatCompletion').mockResolvedValue('Temp response');

        await assistant.generateWithFallback({
            feature: 'suggest',
            prompt: 'Test prompt',
            temperature: 0.35
        });

        expect(spy).toHaveBeenCalledWith(expect.objectContaining({
            temperature: 0.35
        }));
    });

    describe('Auto-Rotate Model Fallback System', () => {
        it('should auto-rotate to next best model when primary model hits a rate limit', async () => {
            localStorage.setItem('ai-provider', 'groq');
            localStorage.setItem('groq-api-key', 'gsk-key');
            localStorage.setItem('groq-model-name', 'openai/gpt-oss-120b');
            localStorage.setItem('ai-auto-rotate', 'true');

            const rateLimitError = new Error('Rate limit reached on openai/gpt-oss-120b');
            rateLimitError.isRateLimit = true;
            rateLimitError.status = 429;
            rateLimitError.model = 'openai/gpt-oss-120b';

            const spy = vi.spyOn(GroqService, 'generateChatCompletion')
                .mockRejectedValueOnce(rateLimitError)
                .mockResolvedValueOnce('<p>Fallback succeeded with instant model</p>');

            const onModelRotated = vi.fn();

            const result = await assistant.generateWithFallback({
                feature: 'optimize',
                content: '<p>Draft</p>',
                onModelRotated
            });

            expect(result).toBe('<p>Fallback succeeded with instant model</p>');
            expect(spy).toHaveBeenCalledTimes(2);
            expect(onModelRotated).toHaveBeenCalledWith(expect.objectContaining({
                fromModel: 'openai/gpt-oss-120b',
                toModel: 'openai/gpt-oss-20b',
                reason: expect.stringMatching(/rate limit/i)
            }));
        });

        it('should track cooldowns and bypass rate-limited models on subsequent requests', async () => {
            localStorage.setItem('ai-provider', 'groq');
            localStorage.setItem('groq-api-key', 'gsk-key');
            localStorage.setItem('groq-model-name', 'openai/gpt-oss-120b');

            // Put openai/gpt-oss-120b into cooldown
            assistant.setCooldown('openai/gpt-oss-120b', 60000);

            const spy = vi.spyOn(GroqService, 'generateChatCompletion').mockResolvedValue('<p>Instant response</p>');

            const result = await assistant.generateWithFallback({
                feature: 'suggest',
                content: '<p>Draft</p>'
            });

            expect(result).toBe('<p>Instant response</p>');
            // Should have called the next non-cooled model directly
            expect(spy).toHaveBeenCalledWith(expect.objectContaining({
                model: 'openai/gpt-oss-20b'
            }));
        });

        it('should throw immediately if auto-rotate is explicitly disabled and error occurs', async () => {
            localStorage.setItem('ai-provider', 'groq');
            localStorage.setItem('groq-api-key', 'gsk-key');
            localStorage.setItem('groq-model-name', 'llama-3.3-70b-versatile');
            localStorage.setItem('ai-auto-rotate', 'false');

            const rateLimitError = new Error('Rate limit reached');
            rateLimitError.isRateLimit = true;
            rateLimitError.status = 429;

            vi.spyOn(GroqService, 'generateChatCompletion').mockRejectedValue(rateLimitError);

            await expect(assistant.generateWithFallback({
                feature: 'optimize',
                content: '<p>Draft</p>'
            })).rejects.toThrow(/Rate limit/i);
        });

        it('should fall back to Gemini if all Groq models fail and Gemini key is configured', async () => {
            localStorage.setItem('ai-provider', 'auto');
            localStorage.setItem('groq-api-key', 'gsk-key');
            localStorage.setItem('gemini-api-key', 'gemini-mock-key');
            localStorage.setItem('ai-auto-rotate', 'true');

            // All Groq attempts fail
            const groqError = new Error('All groq models unavailable');
            groqError.isRateLimit = true;
            vi.spyOn(GroqService, 'generateChatCompletion').mockRejectedValue(groqError);

            const mockGenerateContent = vi.fn().mockResolvedValue({
                response: { text: () => '<p>Gemini fallback text</p>' }
            });
            const mockGoogleGenAI = vi.fn().mockImplementation(() => ({
                getGenerativeModel: () => ({ generateContent: mockGenerateContent })
            }));

            const onModelRotated = vi.fn();

            const result = await assistant.generateWithFallback({
                feature: 'tone',
                content: '<p>Draft</p>',
                clientClass: mockGoogleGenAI,
                onModelRotated
            });

            expect(result).toBe('<p>Gemini fallback text</p>');
            expect(onModelRotated).toHaveBeenCalledWith(expect.objectContaining({
                toProvider: 'gemini'
            }));
        });
    });
});
