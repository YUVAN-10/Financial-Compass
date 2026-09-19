const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function run() {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent("Hello, what models are available?");
    console.log(result.response.text());
  } catch (error) {
    console.error("1.5-flash failed.", error.message);
    try {
      const model2 = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });
      console.log("Testing gemini-pro-vision...");
      // note: pro-vision requires an image, so we just check if it fails differently
    } catch(e) {}
  }
}
run();
