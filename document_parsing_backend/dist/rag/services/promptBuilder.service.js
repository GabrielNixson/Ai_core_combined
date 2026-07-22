"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptBuilder = void 0;
class PromptBuilder {
    defaultTemplate = `SYSTEM INSTRUCTIONS:
{systemPrompt}

RETIEVED CONTEXT FROM DATABASE:
{context}

USER QUESTION:
{question}

INSTRUCTIONS:
Answer the question using ONLY the provided context above. Do not assume or extrapolate. If the context does not contain the answer, say "I cannot find the answer in the provided documents."`;
    /**
     * Constructs the final prompt string using a configurable template.
     */
    buildPrompt(systemPrompt, context, question, customTemplate) {
        const template = customTemplate || this.defaultTemplate;
        return template
            .replace('{systemPrompt}', systemPrompt)
            .replace('{context}', context)
            .replace('{question}', question);
    }
}
exports.PromptBuilder = PromptBuilder;
exports.default = PromptBuilder;
