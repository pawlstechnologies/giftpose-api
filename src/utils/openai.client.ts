import axios from "axios";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const truncate = (text: string, max = 800) =>
    text.length <= max ? text : `${text.slice(0, max)}…`;

export default class OpenAIClient {

    static async categoriseItem(
        item: { title: string; description: string; image?: string },
        taxonomy: any
    ) {
        const prompt = `
You are a product categorisation AI.

Classify the item into category, subcategory, and content using the taxonomy names.

Rules:
- Prefer an exact taxonomy name when one fits
- If none fits, leave category/subcategory/content empty and fill the suggested fields
- Return STRICT JSON only

{
  "title": "",
  "description": "",
  "category": "",
  "subcategory": "",
  "content": "",
  "suggestedCategory": "",
  "suggestedSubcategory": "",
  "suggestedContent": ""
}

ITEM:
Title: ${item.title || "Not provided"}
Description: ${truncate(item.description || "Not provided")}

TAXONOMY:
${JSON.stringify(taxonomy)}
`;

        const content: any[] = [{ type: "text", text: prompt }];

        if (item.image) {
            content.push({
                type: "image_url",
                image_url: { url: item.image },
            });
        }

        const response = await this.withRetry(() =>
            client.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content }],
                temperature: 0.1,
            })
        );

        const text = response.choices[0]?.message?.content || "";
        return this.parseAiJson(text);
    }


    static async imageCategorisatiion(
        item: { title: string; description: string; image?: string; images?: string[]; },
        taxonomy: any
    ) {


        try {

            const prompt = `
You are an intelligent product analysis and categorisation AI.

Your task is to analyse the provided item (title, description, and images) and:

1. Generate a clear, concise, and realistic product title
2. Generate a helpful, human-friendly product description
3. Classify the item into:
   - category
   - subcategory
   - content

You MUST follow these rules:

- Use the provided taxonomy strictly when possible
- Match the closest possible category, subcategory, and content
- If no suitable match exists, leave category/subcategory/content empty and suggest new ones
- Be consistent and realistic (like a marketplace listing)
- Do NOT hallucinate unrelated categories

---

OUTPUT FORMAT (STRICT JSON ONLY — NO TEXT OUTSIDE JSON):

{
  "title": "",
  "description": "",
  "category": "",
  "subcategory": "",
  "content": "",
  "suggestedCategory": "",
  "suggestedSubcategory": "",
  "suggestedContent": ""
}

---

FIELD RULES:

- title → short, clear (e.g. "Wooden Dining Chair")
- description → 1–3 sentences, helpful, natural
- category → must match taxonomy exactly (if found)
- subcategory → must match taxonomy exactly (if found)
- content → must match taxonomy exactly (if found)

If no match:
- Leave category/subcategory/content as empty string ""
- Fill suggestedCategory / suggestedSubcategory / suggestedContent

---

ITEM DATA:

Title: ${item.title || "Not provided"}
Description: ${item.description || "Not provided"}

---

TAXONOMY:
${JSON.stringify(taxonomy)}

---

IMPORTANT:
- Base your answer primarily on the images if text is missing
- Prefer visual understanding over weak text input
- Return ONLY valid JSON (no markdown, no explanation)
`;



            // ✅ Build message content
            const messageContent: any[] = [
                {
                    type: "text",
                    text: prompt
                }
            ];

            // ✅ Add multiple images if provided
            if (item.images && item.images.length > 0) {
                item.images.forEach((url) => {
                    messageContent.push({
                        type: "image_url",
                        image_url: {
                            url
                        }
                    });
                });
            }
            // ✅ Fallback to single image
            else if (item.image) {
                messageContent.push({
                    type: "image_url",
                    image_url: {
                        url: item.image
                    }
                });
            }

            // 🚨 IMPORTANT: image URLs must be PUBLIC (not localhost)

            const response = await axios.post(
                "https://api.openai.com/v1/chat/completions",
                {
                    model: "gpt-4o",
                    messages: [
                        {
                            role: "user",
                            content: messageContent
                        }
                    ],
                    temperature: 0.2
                },
                {
                    headers: {
                        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            const text = response.data.choices[0].message.content;
            return this.parseAiJson(text);

        } catch (err: any) {
            console.error(
                "❌ OpenAI Error:",
                err.response?.data || err.message
            );
            throw new Error("AI categorisation failed");
        }


    }



    static async matchesAlert(
        item: { name?: string; description?: string; categoryId?: any },
        alert: { keywords?: string[]; categories?: any[] },
        threshold = 0.55
    ): Promise<boolean> {
        const categoryIds = (alert.categories || [])
            .map((id) => id?.toString())
            .filter(Boolean);

        if (item.categoryId && categoryIds.includes(item.categoryId.toString())) {
            return true;
        }

        const itemText = `${item.name || ""} ${item.description || ""}`.trim();
        return this.isItemMatchingKeywords(itemText, alert.keywords || [], threshold);
    }

    static async isItemMatchingKeywords(
        itemText: string,
        keywords: string[],
        threshold = 0.55
    ): Promise<boolean> {
        const cleaned = (keywords || []).map((keyword) => keyword.trim()).filter(Boolean);
        if (!cleaned.length || !itemText.trim()) return false;

        const haystack = itemText.toLowerCase();
        if (cleaned.some((keyword) => haystack.includes(keyword.toLowerCase()))) {
            return true;
        }

        try {
            const response = await client.embeddings.create({
                model: "text-embedding-3-large",
                input: [itemText, ...cleaned]
            });

            const embeddings = [...response.data].sort((a, b) => a.index - b.index);
            const itemEmbedding = embeddings[0]?.embedding;
            if (!itemEmbedding) return false;

            for (let i = 1; i < embeddings.length; i++) {
                const similarity = this.cosineSimilarity(itemEmbedding, embeddings[i].embedding);
                if (similarity >= threshold) {
                    return true;
                }
            }
        } catch (err: any) {
            console.error("Keyword embedding match failed:", err?.message || err);
        }

        return false;
    }

    private static async withRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
        let lastError: any;

        for (let attempt = 0; attempt < attempts; attempt++) {
            try {
                return await fn();
            } catch (err: any) {
                lastError = err;
                const status = err?.status || err?.response?.status;

                if (status !== 429 && status !== 502 && status !== 503) {
                    throw this.sanitizeError(err);
                }

                const retryAfter = Number(
                    err?.headers?.["retry-after"] ||
                    err?.response?.headers?.["retry-after"]
                );
                const waitMs =
                    Number.isFinite(retryAfter) && retryAfter > 0
                        ? retryAfter * 1000
                        : Math.min(30000, 1000 * Math.pow(2, attempt));

                console.warn(
                    `OpenAI ${status || "rate limit"}, retrying in ${waitMs}ms (${attempt + 1}/${attempts})`
                );
                await sleep(waitMs);
            }
        }

        throw this.sanitizeError(lastError);
    }

    private static sanitizeError(err: any) {
        const status = err?.status || err?.response?.status;
        const message =
            err?.error?.message ||
            err?.response?.data?.error?.message ||
            err?.message ||
            "OpenAI request failed";

        return new Error(`OpenAI ${status || "error"}: ${message}`);
    }

    private static parseAiJson(text: string) {
        const cleaned = (text || "")
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

        const jsonBlock = cleaned.match(/\{[\s\S]*\}/)?.[0] || cleaned;

        try {
            return JSON.parse(jsonBlock);
        } catch (err) {
            console.error("JSON Parse Error:", cleaned);
            throw new Error("AI returned invalid JSON");
        }
    }

    private static cosineSimilarity(a: number[], b: number[]) {
        const dot = a.reduce((sum, val, i) => sum + val * (b[i] || 0), 0);
        const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
        const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
        if (!magA || !magB) return 0;
        return dot / (magA * magB);
    }
}

