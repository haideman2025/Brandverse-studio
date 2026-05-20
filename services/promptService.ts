import { PROMPT_LIBRARY_RAW } from '../constants';
import { ImageType }  from '../types';

interface PromptLibrary {
  globalNegative: string;
  templates: Record<string, string>;
}

const parsePromptLibrary = (): PromptLibrary => {
  const templates: Record<string, string> = {};
  
  const negativeBlockMatch = PROMPT_LIBRARY_RAW.match(/\[NEGATIVE\]\s*([\s\S]*?)(?=\s*##|\[TEMPLATE:|$)/);
  const globalNegative = negativeBlockMatch ? negativeBlockMatch[1].trim() : '';

  const templateMatches = PROMPT_LIBRARY_RAW.matchAll(/\[TEMPLATE:(\w+)\]\s*([\s\S]*?)(?=\s*##|$)/g);
  for (const match of templateMatches) {
    const key = match[1] as ImageType;
    if (key === 'BRANDFACE' || key === 'STORYBOARD_FRAME') { // Apply to specific templates
        templates[key] = match[2].trim().replace(/\[NEGATIVE\]/g, globalNegative);
    } else {
        templates[key] = match[2].trim();
    }
  }
  
  return { globalNegative, templates };
};

const promptLibrary = parsePromptLibrary();

export const buildPrompt = (imageType: ImageType, variables: Record<string, string | undefined>): string => {
  let template = promptLibrary.templates[imageType];
  if (!template) {
    // Fallback to a generic prompt if template is missing
    return `Generate an image with the following characteristics: ${JSON.stringify(variables)}`;
  }

  for (const key in variables) {
    const value = variables[key] || '';
    template = template.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  
  // Replace unused placeholders with a neutral value
  template = template.replace(/\{[a-zA-Z_]+\}/g, 'not specified');

  return template;
};