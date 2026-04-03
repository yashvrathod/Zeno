import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "sk-ijklmnopqrstuvwxijklmnopqrstuvwxijklmnop",
});

async function test() {
  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Say hello" }],
    });

    console.log(res.choices[0].message.content);
  } catch (err) {
    console.error("ERROR:", err);
  }
}

test();