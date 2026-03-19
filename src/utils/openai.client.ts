import axios from "axios";

export default class OpenAIClient {

    static async categoriseItem(
        item: { title: string; description: string; image?: string },
        taxonomy: any
    ) {

        const prompt = `
You are a product categorisation AI.

Using the item title, description, and image, classify it into:

- category
- subcategory
- content

Use the provided taxonomy.

If none fits, suggest new ones.

Return JSON only.

{
 "category": "",
 "subcategory": "",
 "content": "",
 "suggestedCategory": "",
 "suggestedSubcategory": "",
 "suggestedContent": ""
}

ITEM
Title: ${item.title}
Description: ${item.description}

TAXONOMY
${JSON.stringify(taxonomy)}
`;

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
}