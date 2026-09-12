import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIAssistant } from '../js/editor/ai-assistant.js';

describe('AIAssistant', () => {
    let assistant;

    beforeEach(() => {
        localStorage.clear();
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

    it('should throw or return clear error if API key is not configured', async () => {
        await expect(assistant.generate({
            feature: 'optimize',
            content: 'Hello world'
        })).rejects.toThrow(/API key/i);
    });

    it('should call GoogleGenerativeAI when API key is provided and return text', async () => {
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
});
