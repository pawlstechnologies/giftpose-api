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

        try {
            const response = await this.withRetry(() =>
                client.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [{ role: "user", content }],
                    temperature: 0.1,
                })
            );

            const text = response.choices[0]?.message?.content || "";
            return this.parseAiJson(text);
        } catch (openAiErr: any) {
            if (process.env.DEEPSEEK_API_KEY) {
                try {
                    const dsRes = await axios.post(
                        "https://api.deepseek.com/v1/chat/completions",
                        {
                            model: "deepseek-flash",
                            messages: [{ role: "user", content }],
                            temperature: 0.1,
                        },
                        {
                            headers: {
                                Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                                "Content-Type": "application/json",
                            },
                            timeout: 25000,
                        }
                    );
                    const dsText = dsRes.data?.choices?.[0]?.message?.content || "";
                    return this.parseAiJson(dsText);
                } catch (dsErr: any) {
                    console.error("DeepSeek fallback in categoriseItem failed:", dsErr?.response?.data || dsErr?.message);
                }
            }
            throw openAiErr;
        }
    }


    static async imageCategorisatiion(
        item: { title: string; description: string; image?: string; images?: string[]; },
        taxonomy: any
    ) {
        const prompt = `
You are an intelligent product analysis and categorisation AI for a community gifting & donation app (GiftPose).

Your task is to carefully inspect the uploaded image(s) (and any optional title/description) and:

1. Identify the exact item shown in the image(s) and generate a clear, concise, realistic product title (e.g. "Silver MacBook Pro Laptop", "Wooden Dining Chair", "Nike Running Trainers", "Ceramic Coffee Mug").
2. Generate a helpful, natural 1–3 sentence product description suitable for a giveaway/donation listing, describing what the item is, its visible features/colour/style, and apparent condition.
3. Classify the item into:
   - category (must match one of the provided taxonomy category names when possible)
   - subcategory (must match one of the subcategories under that category when possible)
   - content (specific item type name, e.g. "Laptops", "Chairs", "Sneakers", "Mugs")

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
- title → short, accurate, specific to the image (2–6 words)
- description → 1–3 natural sentences describing the item in the photo
- category → exact category name from TAXONOMY (or empty string "" if none fits, and fill suggestedCategory)
- subcategory → exact subcategory name from TAXONOMY under the chosen category (or fill suggestedSubcategory)
- content → specific item type (or fill suggestedContent)

---

ITEM DATA:
Title: ${item.title || "Not provided"}
Description: ${item.description || "Not provided"}

---

TAXONOMY:
${JSON.stringify(taxonomy)}

---

IMPORTANT:
- Base your answer on the visual content of the image(s)
- Return ONLY valid JSON (no markdown, no explanation)
`;

        const messageContent: any[] = [
            {
                type: "text",
                text: prompt
            }
        ];

        if (item.images && item.images.length > 0) {
            item.images.forEach((url) => {
                messageContent.push({
                    type: "image_url",
                    image_url: { url }
                });
            });
        } else if (item.image) {
            messageContent.push({
                type: "image_url",
                image_url: { url: item.image }
            });
        }

        // 1. Try OpenAI first if key is configured
        if (process.env.OPENAI_API_KEY) {
            try {
                const response = await axios.post(
                    "https://api.openai.com/v1/chat/completions",
                    {
                        model: "gpt-4o-mini",
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
                        },
                        timeout: 20000
                    }
                );

                const text = response.data.choices[0].message.content;
                return this.parseAiJson(text);
            } catch (openAiErr: any) {
                console.warn(
                    "⚠️ OpenAI Vision unavailable, falling back to DeepSeek Vision:",
                    openAiErr?.response?.data?.error?.message || openAiErr?.message
                );
            }
        }

        // 2. Fallback to DeepSeek Vision (deepseek-flash supports text + image input)
        if (process.env.DEEPSEEK_API_KEY) {
            try {
                const dsResponse = await axios.post(
                    "https://api.deepseek.com/v1/chat/completions",
                    {
                        model: "deepseek-flash",
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
                            Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                            "Content-Type": "application/json"
                        },
                        timeout: 25000
                    }
                );

                const text = dsResponse.data?.choices?.[0]?.message?.content || "";
                return this.parseAiJson(text);
            } catch (dsErr: any) {
                console.error(
                    "❌ DeepSeek Vision Error:",
                    dsErr?.response?.data || dsErr?.message
                );
            }
        }

        throw new Error("AI categorisation failed");
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
        if (
            cleaned.some((keyword) => {
                const kw = keyword.toLowerCase();
                if (haystack.includes(kw)) return true;
                const words = kw.split(/\s+/).filter((w) => w.length >= 3);
                return words.some((w) => haystack.includes(w));
            })
        ) {
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
                const errCode = err?.code || err?.error?.code || err?.response?.data?.error?.code;
                const errMsg = String(
                    err?.error?.message || err?.response?.data?.error?.message || err?.message || ""
                ).toLowerCase();

                // Do not retry if quota/credits are exhausted
                if (
                    errCode === "insufficient_quota" ||
                    errMsg.includes("no credits remaining") ||
                    errMsg.includes("exceeded your current quota")
                ) {
                    throw this.sanitizeError(err);
                }

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

