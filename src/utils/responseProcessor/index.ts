import { validateResponseFormat, validateAcronymUsage, validateSectionLength, validateHIPAACompliance } from './validators';
import { formatResponse } from './formatter';
import { SESSION_SECTIONS, ASSESSMENT_SECTIONS } from './constants';

export function processResponse(content: string, isAssessment: boolean): string {
  // Initial formatting
  let processedContent = formatResponse(content, isAssessment);

  // Validate the formatted content
  const validation = validateResponseFormat(processedContent, isAssessment);

  if (!validation.isValid) {
    console.warn('Response validation warnings:', validation.errors);
  }

  return processedContent;
}