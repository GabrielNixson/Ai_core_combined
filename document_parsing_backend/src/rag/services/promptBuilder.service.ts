export class PromptBuilder {
  private defaultTemplate = `SYSTEM INSTRUCTIONS:
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
  public buildPrompt(
    systemPrompt: string,
    context: string,
    question: string,
    customTemplate?: string
  ): string {
    const template = customTemplate || this.defaultTemplate;
    return template
      .replace('{systemPrompt}', systemPrompt)
      .replace('{context}', context)
      .replace('{question}', question);
  }
}

export default PromptBuilder;
