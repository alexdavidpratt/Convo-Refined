import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export async function analyzeResponse(content: string): Promise<string[]> {
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    console.error('Gemini API key is not set');
    return [];
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `
      Analyze this conversation response and provide 2-3 concise, actionable key points.
      Focus on decisions made, action items, or important insights.
      Keep each point under 15 words.
      Format as a JSON array of strings.
      
      Response: ${content}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.slice(0, 3); // Ensure we only get max 3 points
      }
      throw new Error('Response is not an array');
    } catch (parseError) {
      return text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('[') && !line.startsWith(']'))
        .slice(0, 3)
        .map(point => point.length > 100 ? point.slice(0, 97) + '...' : point);
    }
  } catch (error) {
    console.error('Error analyzing response:', error);
    return ['Unable to analyze response'];
  }
}