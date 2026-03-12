import axios from "axios";

export default class DeepSeekClient {

    static extractJSON(text: string) {
        // Remove markdown code blocks
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();

        // Extract first JSON object found
        const match = text.match(/\{[\s\S]*\}/);
        return match ? match[0] : null;
    }

    static async categoriseItem(
        item: { title: string; description: string },
        taxonomy: any
    ) {

        const prompt = `
You are a product categorisation AI.

Using the item title and description, classify it into:

- category
- subcategory
- content

Use the provided taxonomy.

If none fits, suggest a new one.

Return ONLY valid JSON.
Do not include markdown.
Do not include explanations.

{
 "category": "",
 "subcategory": "",
 "content": "",
 "suggestedCategory": "",
 "suggestedSubcategory": "",
 "suggestedContent": ""
}

ITEM:
Title: ${item.title}
Description: ${item.description}

TAXONOMY:
${JSON.stringify(taxonomy)}
`;

        const response = await axios.post(
            "https://api.deepseek.com/v1/chat/completions",
            {
                model: "deepseek-chat",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.2
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        const raw = response.data.choices?.[0]?.message?.content || "";

        const jsonString = this.extractJSON(raw);

        if (!jsonString) {
            console.error("AI returned invalid response:", raw);
            throw new Error("Invalid AI JSON response");
        }

        try {
            return JSON.parse(jsonString);
        } catch (err) {
            console.error("Failed to parse AI JSON:", jsonString);
            throw err;
        }
    }
}



// import axios from "axios";

// export default class DeepSeekClient {

//     static extractJSON(text: string) {
//         text = text.replace(/```json/g, "").replace(/```/g, "").trim();
//         const match = text.match(/\{[\s\S]*\}/);
//         return match ? match[0] : null;
//     }

//     static async categoriseItem(
//         item: { title: string; description: string; imageUrl?: string },
//         taxonomy: any
//     ) {

//         const prompt = `
// You are a product categorisation AI.

// Using the item title, description, and image, classify it into:

// - category
// - subcategory
// - content

// Use the provided taxonomy.

// If none fits, suggest a new one.

// Return ONLY valid JSON.

// {
//  "category": "",
//  "subcategory": "",
//  "content": "",
//  "suggestedCategory": "",
//  "suggestedSubcategory": "",
//  "suggestedContent": ""
// }

// ITEM:
// Title: ${item.title}
// Description: ${item.description}

// TAXONOMY:
// ${JSON.stringify(taxonomy)}
// `;

//         const response = await axios.post(
//             "https://api.deepseek.com/v1/chat/completions",
//             {
//                 model: "deepseek-vl", // vision model
//                 messages: [
//                     {
//                         role: "user",
//                         content: [
//                             {
//                                 type: "text",
//                                 text: prompt
//                             },
//                             ...(item.imageUrl
//                                 ? [{
//                                     type: "image_url",
//                                     image_url: {
//                                         url: item.imageUrl
//                                     }
//                                 }]
//                                 : [])
//                         ]
//                     }
//                 ],
//                 temperature: 0.2
//             },
//             {
//                 headers: {
//                     Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
//                     "Content-Type": "application/json"
//                 }
//             }
//         );

//         const raw = response.data.choices?.[0]?.message?.content || "";

//         const jsonString = this.extractJSON(raw);

//         if (!jsonString) {
//             console.error("AI returned invalid response:", raw);
//             throw new Error("Invalid AI JSON response");
//         }

//         return JSON.parse(jsonString);
//     }
// }


