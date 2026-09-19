const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI('AIzaSyCD8TG8HCkS6_A6wODECo4UATm3nCRubPI');
async function run() {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const res = await model.generateContent('hello');
    console.log('SUCCESS:', res.response.text());
  } catch(e) {
    console.error('FAIL:', e.message);
  }
}
run();
