const AIProvider = require('./provider');

class DeepSeekProvider extends AIProvider {
    constructor(config) {
        super(config);
        this.baseUrl = (config.baseUrl && config.baseUrl.trim()) ? config.baseUrl.trim() : 'https://api.deepseek.com';
        this.model = config.model || 'deepseek-flash';
    }

    async listModels() {
        try {
            const response = await fetch(`${this.baseUrl}/models`, {
                headers: {'Authorization': `Bearer ${this.apiKey}`}
            });
            if (!response.ok) return ['deepseek-chat', 'deepseek-reasoner'];
            const data = await response.json();
            return (data.data || []).map(m => m.id).sort();
        } catch {
            return ['deepseek-chat', 'deepseek-reasoner'];
        }
    }

    async *generateStream(options) {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.model,
                messages: [
                    { role: 'system', content: this.getSystemPrompt(options) },
                    { role: 'user', content: this.getUserPrompt(options) }
                ],
                stream: true,
                temperature: options?.mode === 'metadata' ? 0.5 : 0.7
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`DeepSeek API error: ${response.status} - ${error}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data: ')) continue;

                const payload = trimmed.slice(6);
                if (payload === '[DONE]') return;

                try {
                    const parsed = JSON.parse(payload);
                    const delta = parsed.choices?.[0]?.delta?.content;
                    if (delta) yield delta;
                } catch {}
            }
        }
    }
}

module.exports = DeepSeekProvider;
