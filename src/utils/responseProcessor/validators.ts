import { SESSION_SECTIONS, ASSESSMENT_SECTIONS, REQUIRED_ACRONYMS, MAX_SENTENCES_PER_SECTION } from './constants';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

function sanitizeSection(section: string): string {
  return section
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape regex special characters
    .replace(/\s+/g, '\\s+'); // Make whitespace flexible
}

function validateSectionContent(content: string, section: string, escapedSections: string[]): string[] {
  const errors: string[] = [];
  const sectionRegex = new RegExp(
    `${sanitizeSection(section)}:[^]*?(?=${escapedSections.join(':|')}:|$)`,
    'i'
  );
  const match = content.match(sectionRegex);
  
  if (!match || match[0].split(':')[1].trim().length === 0) {
    errors.push(`Empty section: ${section}`);
  } else {
    const sectionContent = match[0].split(':')[1].trim();
    if (!validateSectionLength(sectionContent)) {
      errors.push(`Section "${section}" length exceeds limits`);
    }
  }
  
  return errors;
}

export function validateResponseFormat(content: string, isAssessment: boolean): ValidationResult {
  const errors: string[] = [];
  const sections = isAssessment ? ASSESSMENT_SECTIONS : SESSION_SECTIONS;
  const escapedSections = sections.map(s => sanitizeSection(s));
  
  // Check if all required sections are present
  sections.forEach(section => {
    const sectionRegex = new RegExp(`${sanitizeSection(section)}:`, 'i');
    if (!sectionRegex.test(content)) {
      errors.push(`Missing required section: ${section}`);
    } else {
      errors.push(...validateSectionContent(content, section, escapedSections));
    }
  });

  // Check section order
  let lastIndex = -1;
  sections.forEach(section => {
    const index = content.search(new RegExp(`${sanitizeSection(section)}:`, 'i'));
    if (index !== -1) {
      if (index < lastIndex) {
        errors.push(`Incorrect section order: ${section}`);
      }
      lastIndex = index;
    }
  });

  // Check for minimum content requirements
  if (!isAssessment) {
    if (!content.includes('TH') || !content.includes('CL')) {
      errors.push('Missing required therapist (TH) or client (CL) references');
    }
  }

  // Validate HIPAA compliance
  if (!validateHIPAACompliance(content)) {
    errors.push('Potential HIPAA compliance issues detected');
  }

  // Validate overall structure
  const hasProperFormatting = content.split('\n\n').length >= sections.length;
  if (!hasProperFormatting) {
    errors.push('Response format does not match expected structure');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateAcronymUsage(content: string): boolean {
  return Object.keys(REQUIRED_ACRONYMS).every(acronym => 
    content.includes(acronym)
  );
}

export function countSentences(text: string): number {
  return text.split(/[.!?]+/).filter(sentence => 
    sentence.trim().length > 0
  ).length;
}

export function validateSectionLength(section: string): boolean {
  const sentences = countSentences(section);
  return sentences <= MAX_SENTENCES_PER_SECTION;
}

export function validateHIPAACompliance(content: string): boolean {
  // Basic HIPAA validation - check for common identifiers
  const identifierPatterns = [
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN
    /\b\d{10}\b/, // Phone numbers
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/, // Email
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/, // Dates
  ];

  return !identifierPatterns.some(pattern => pattern.test(content));
}