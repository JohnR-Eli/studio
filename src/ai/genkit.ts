import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI()],
  model: 'gemini-1.0-pro-vision-latest', // Using a stable, generally available vision model
});
