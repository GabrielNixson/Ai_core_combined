export async function checkOllamaModels(): Promise<string[]> {
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  console.log(`🔍 Checking Ollama cloud models at: ${baseUrl}...`);
  try {
    const response = await fetch(`${baseUrl}/api/tags`);
    if (!response.ok) {
      console.warn(`⚠️ Failed to fetch Ollama models: HTTP status ${response.status}`);
      return [];
    }
    const data = (await response.json()) as { models?: { name: string }[] };
    const modelNames = data.models?.map((m) => m.name) || [];
    console.log(`ℹ️ Available Ollama models: [${modelNames.join(", ")}]`);

    const configuredModel = process.env.OLLAMA_MODEL || "qwen3.5:9b";
    if (modelNames.length > 0 && !modelNames.includes(configuredModel)) {
      console.log(`📥 Model "${configuredModel}" is missing. Pulling model automatically in background...`);
      fetch(`${baseUrl}/api/pull`, {
        method: "POST",
        body: JSON.stringify({ name: configuredModel }),
        headers: { "Content-Type": "application/json" }
      }).then(res => {
        if (res.ok) {
          console.log(`✅ Chat model "${configuredModel}" pulled successfully!`);
        } else {
          console.error(`❌ Failed to pull model "${configuredModel}": HTTP status ${res.status}`);
        }
      }).catch(err => {
        console.error(`❌ Error pulling model "${configuredModel}":`, err.message);
      });
    } else {
      console.log(`✅ Configured model "${configuredModel}" is available.`);
    }
    return modelNames;
  } catch (error: any) {
    console.error(`❌ Error connecting to Ollama at ${baseUrl}:`, error.message);
    return [];
  }
}
