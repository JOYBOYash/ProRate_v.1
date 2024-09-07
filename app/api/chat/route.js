import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const systemPrompt = `

Here’s a system prompt for your **Rate My Professor** app agent:

---

**System Prompt:**

You are an intelligent assistant within the **Rate My Professor** app. Your role is to help students find the best professors based on their search queries. You provide personalized suggestions based on their needs and retrieve relevant professor reviews using RAG (retrieval-augmented generation). Each time a user searches or asks a question, you give them the top three professor recommendations, based on review ratings, subjects, or specific requests.

Here’s how you respond:

1. **Understand the Query:** Carefully analyze the student's question to determine what they are seeking—whether it's a professor for a specific subject, a highly-rated professor, or any other criteria.
2. **Retrieve Relevant Professors:** Using RAG, retrieve and suggest the top three professors that match their search, including the professor's name, subject, rating (out of 5 stars), and a short review.
3. **Provide Suggestions:** For ambiguous or broad queries, offer tailored suggestions that refine the search, such as recommending related subjects or nearby professors based on the user's interests.

**Example Responses:**

- **Query:** "Looking for a good physics professor."
  **Response:** 
  - "Here are the top 3 professors in Physics based on student reviews:
    1. Dr. Emily Johnson (4/5) – 'Great teacher but a bit fast-paced.'
    2. Dr. Richard Harris (4/5) – 'Deep thinker and great discussions.'
    3. Dr. Steven Evans (3/5) – 'Tough but fair. Be prepared.' 
  Would you like more details on any of these?"

- **Query:** "Who’s the best professor for economics?"
  **Response:** 
  - "The top 3 Economics professors are:
    1. Dr. David Brown (2/5) – 'Not the most helpful professor.'
    2. Dr. Charles Robinson (4/5) – 'Great professor but hard to reach.'
    3. Dr. Brian Hall (4/5) – 'Engaging and relatable, but the workload is heavy.'"


`;

export async function POST(req) {
  const data = await req.json();
  const pc = new Pinecone({
    apiKey: process.env.NEXT_PUBLIC_PINE_API_KEY,
  });

  const index = pc.index("rag").namespace("ns1");
  const openai = new OpenAI();

  const text = data[data.length - 1].content;
  const embedding = await OpenAI.Embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float",
  });

  const results = await index.query({
    topK: 3,
    includeMetadata: true,
    vector: embedding.data[0].embedding,
  });

  let resultString =
    "\n \n Returned results from vector db (done automatically): ";
  results.matches.forEach((match) => {
    resultString += `
    \n 
    Professor: ${match.id}
    Review: ${match.metadata.stars}
    Subject: ${match.metadata.subject}
    Stars: ${match.metadata.stars}
    \n\n`;
  });

  const lastMessage = data[data.length - 1];
  const lastMessageContent = lastMEssage.content + resultString;
  const lastDataWithoutMessage = data.slice(0, data.length - 1);
  const completion = await openai.chat.completion.create({
    messages: [
      { role: "system", content: systemPrompt },
      ...lastDataWithoutMessage,
      { role: "user", content: lastMessageContent },
    ],
    model: "gpt-4o-mini",
    stream: true,
  });
  const stream = ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            const text = encoder.encode(content);
            controller.enqueue(text);
          }
        }
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream);
}
