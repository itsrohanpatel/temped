import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GroqService } from '../js/editor/groq-service.js';

describe('GroqService', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    describe('fetchLiveModels', () => {
        it('should throw an error if API key is missing', async () => {
            await expect(GroqService.fetchLiveModels('')).rejects.toThrow(/API key is required/i);
        });

        it('should fetch, filter, sort and cache live models from Groq API', async () => {
            const mockModelsResponse = {
                data: [
                    { id: 'whisper-large-v3', active: true, context_window: 1500 },
                    { id: 'llama-3.1-8b-instant', active: true, context_window: 131072 },
                    { id: 'llama-3.3-70b-versatile', active: true, context_window: 131072 },
                    { id: 'mixtral-8x7b-32768', active: true, context_window: 32768 },
                    { id: 'distil-whisper-large-v3-en', active: true, context_window: 1500 },
                    { id: 'gemma2-9b-it', active: true, context_window: 8192 }
                ]
            };

            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => mockModelsResponse
            });

            const models = await GroqService.fetchLiveModels('gsk-testkey123', mockFetch);

            expect(mockFetch).toHaveBeenCalledWith('https://api.groq.com/openai/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer gsk-testkey123',
                    'Content-Type': 'application/json'
                }
            });

            // Whisper models should be filtered out for text editing
            expect(models.map(m => m.id)).not.toContain('whisper-large-v3');
            expect(models.map(m => m.id)).not.toContain('distil-whisper-large-v3-en');

            // Text models should be included with versatile/recommended models prioritized
            expect(models[0].id).toBe('llama-3.3-70b-versatile');
            expect(models.some(m => m.id === 'llama-3.1-8b-instant')).toBe(true);
            expect(models.some(m => m.id === 'mixtral-8x7b-32768')).toBe(true);

            // Cached in localStorage
            const cached = JSON.parse(localStorage.getItem('groq-cached-models') || '[]');
            expect(cached.length).toBe(models.length);
        });

        it('should throw an informative error on 401 Unauthorized', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 401,
                json: async () => ({ error: { message: 'Invalid API Key provided' } })
            });

            await expect(GroqService.fetchLiveModels('invalid-key', mockFetch)).rejects.toThrow(/Invalid Groq API Key/i);
        });

        it('should fall back to cached models if network request fails', async () => {
            const cachedList = [{ id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B' }];
            localStorage.setItem('groq-cached-models', JSON.stringify(cachedList));

            const mockFetch = vi.fn().mockRejectedValue(new Error('Network offline'));

            const result = await GroqService.fetchLiveModels('gsk-testkey123', mockFetch);
            expect(result).toEqual(cachedList);
        });
    });

    describe('generateChatCompletion', () => {
        it('should throw if API key or model is missing', async () => {
            await expect(GroqService.generateChatCompletion({
                apiKey: '',
                model: 'llama-3.3-70b-versatile',
                messages: []
            })).rejects.toThrow(/API key is required/i);

            await expect(GroqService.generateChatCompletion({
                apiKey: 'gsk-key',
                model: '',
                messages: []
            })).rejects.toThrow(/Model is required/i);
        });

        it('should execute chat completion and return content text', async () => {
            const mockResponse = {
                id: 'chatcmpl-123',
                choices: [
                    {
                        message: {
                            role: 'assistant',
                            content: '<p>High-converting email copy</p>'
                        }
                    }
                ]
            };

            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => mockResponse
            });

            const text = await GroqService.generateChatCompletion({
                apiKey: 'gsk-key-123',
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: 'You are an email marketing assistant.' },
                    { role: 'user', content: 'Optimize this email' }
                ],
                temperature: 0.7,
                maxTokens: 1024,
                fetchFn: mockFetch
            });

            expect(text).toBe('<p>High-converting email copy</p>');
            expect(mockFetch).toHaveBeenCalledWith('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer gsk-key-123',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'system', content: 'You are an email marketing assistant.' },
                        { role: 'user', content: 'Optimize this email' }
                    ],
                    temperature: 0.7,
                    max_tokens: 1024
                })
            });
        });

        it('should normalize 429 rate limit error with rateLimit flag', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 429,
                json: async () => ({
                    error: {
                        message: 'Rate limit reached for model llama-3.3-70b-versatile. Please try again later.'
                    }
                })
            });

            try {
                await GroqService.generateChatCompletion({
                    apiKey: 'gsk-key',
                    model: 'llama-3.3-70b-versatile',
                    messages: [{ role: 'user', content: 'Hi' }],
                    fetchFn: mockFetch
                });
                expect.fail('Should have thrown');
            } catch (err) {
                expect(err.isRateLimit).toBe(true);
                expect(err.status).toBe(429);
                expect(err.model).toBe('llama-3.3-70b-versatile');
                expect(err.message).toContain('Rate limit');
            }
        });
    });

    describe('getDefaultModels', () => {
        it('should return a list of standard Groq models', () => {
            const defaults = GroqService.getDefaultModels();
            expect(Array.isArray(defaults)).toBe(true);
            expect(defaults).toContain('llama-3.3-70b-versatile');
            expect(defaults).toContain('llama-3.1-8b-instant');
        });
    });
});
