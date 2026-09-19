const axios = require('axios');
async function run() {
  const key = 'AIzaSyCD8TG8HCkS6_A6wODECo4UATm3nCRubPI';
  try {
    const res = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    console.log(res.data.models.map(m => m.name).filter(n => n.includes('flash') || n.includes('vision')));
  } catch (e) {
    console.error(e.response ? e.response.data : e.message);
  }
}
run();
