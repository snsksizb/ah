import axios from 'axios';

export async function chatAI(text) {
  try {
    const { data } = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: text }]
    }, {
      headers: {
        'Authorization': `Bearer sk-xxxxxxxx`, // ganti API key
        'Content-Type': 'application/json'
      }
    });
    return data.choices[0].message.content;
  } catch {
    return "❌ AI sedang sibuk";
  }
}
