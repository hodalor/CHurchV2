const https = require("https");

function hasClaudeConfig() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

async function generateClaudeText({ systemPrompt = "", userPrompt = "", maxTokens = 350 }) {
  if (!hasClaudeConfig()) {
    return {
      enabled: false,
      text: "",
      model: "",
      reason: "Anthropic API key is not configured.",
    };
  }

  const body = JSON.stringify({
    model: process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022",
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
  });

  const response = await sendAnthropicRequest(body);
  const text = Array.isArray(response?.content)
    ? response.content
        .filter((item) => item.type === "text")
        .map((item) => item.text)
        .join("\n")
        .trim()
    : "";

  return {
    enabled: true,
    text,
    model: response?.model || process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022",
    reason: "",
  };
}

function sendAnthropicRequest(body) {
  return new Promise((resolve, reject) => {
    const request = https.request(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
      },
      (response) => {
        let raw = "";
        response.on("data", (chunk) => {
          raw += chunk;
        });
        response.on("end", () => {
          try {
            const payload = raw ? JSON.parse(raw) : {};
            if (response.statusCode >= 400) {
              return reject(new Error(payload?.error?.message || "Claude request failed."));
            }
            return resolve(payload);
          } catch (error) {
            return reject(error);
          }
        });
      }
    );

    request.on("error", reject);
    request.write(body);
    request.end();
  });
}

module.exports = {
  generateClaudeText,
  hasClaudeConfig,
};
