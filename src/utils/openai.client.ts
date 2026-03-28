import axios from "axios";

export default class OpenAIClient {

    static async categoriseItem(
        item: { title: string; description: string; image?: string },
        taxonomy: any
    ) {

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


//         const prompt = `
// You are a product categorisation AI.

// Using the item title, description, and image, classify it into:

// - category
// - subcategory
// - content

// Use the provided taxonomy.

// If none fits, suggest new ones.

// Return JSON only.

// {
//  "category": "",
//  "subcategory": "",
//  "content": "",
//  "suggestedCategory": "",
//  "suggestedSubcategory": "",
//  "suggestedContent": ""
// }

// ITEM
// Title: ${item.title}
// Description: ${item.description}

// TAXONOMY
// ${JSON.stringify(taxonomy)}
// `;

        const messageContent: any[] = [
            {
                type: "text",
                text: prompt
            }
        ];

        if (item.image) {
            messageContent.push({
                type: "image_url",
                image_url: {
                    url: item.image
                }
            });
        }

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
                temperature: 0.1
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        const text = response.data.choices[0].message.content;

        // Remove ```json wrapper if AI adds it
        const cleaned = text
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

        return JSON.parse(cleaned);
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



//       const prompt = `
// You are a product categorisation AI.

// Using the item title, description, and images, classify it into:

// Com up with the name and description of the images attached

// - category
// - subcategory
// - content

// Use the provided taxonomy strictly.

// If none fits, suggest new ones.

// Return JSON only.

// {
//   "category": "",
//   "subcategory": "",
//   "content": "",
//   "suggestedCategory": "",
//   "suggestedSubcategory": "",
//   "suggestedContent": "",
//   "title": "",
//   "description": ""
// }

// ITEM
// Title: ${item.title || "Unknown"}
// Description: ${item.description || "Analyse from images"}

// TAXONOMY
// ${JSON.stringify(taxonomy)}
// `;

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

      let text = response.data.choices[0].message.content;

      // ✅ Clean AI response (remove ```json blocks)
      const cleaned = text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      // ✅ Parse safely
      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch (err) {
        console.error("❌ JSON Parse Error:", cleaned);
        throw new Error("AI returned invalid JSON");
      }

      return parsed;

    } catch (err: any) {
      console.error(
        "❌ OpenAI Error:",
        err.response?.data || err.message
      );
      throw new Error("AI categorisation failed");
    }


    }
}

