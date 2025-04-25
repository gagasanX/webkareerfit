// lib/upload.ts
import { NextRequest } from 'next/server';
import { join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
// Import uuid without adding custom type declaration
import { v4 as uuidv4 } from 'uuid';

// Define allowed file types
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Upload directory
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

/**
 * Save form data with file upload
 * @param request NextRequest object
 * @returns Object containing form fields and file path
 */
export async function saveFormDataWithFile(request: NextRequest) {
  // Ensure upload directory exists
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
  
  // Parse form data
  const formData = await request.formData();
  const fields: Record<string, string> = {};
  let filePath: string | undefined = undefined; // Changed from null to undefined
  
  // Process each form field
  for (const [key, value] of formData.entries()) {
    // Handle file upload
    if (value instanceof File) {
      // Validate file type
      if (!ALLOWED_FILE_TYPES.includes(value.type)) {
        throw new Error(`File type not allowed: ${value.type}. Allowed types: PDF, DOC, DOCX, TXT`);
      }
      
      // Validate file size
      if (value.size > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds maximum allowed (5MB)`);
      }
      
      // Generate unique filename
      const fileExtension = value.name.split('.').pop() || 'bin';
      const uniqueFilename = `${uuidv4()}.${fileExtension}`;
      const fullPath = join(UPLOAD_DIR, uniqueFilename);
      
      // Save file
      const buffer = Buffer.from(await value.arrayBuffer());
      await writeFile(fullPath, buffer);
      
      // Store file path
      filePath = fullPath;
    } 
    // Handle regular form fields
    else if (typeof value === 'string') {
      fields[key] = value;
    }
  }
  
  return { fields, filePath };
}

/**
 * Read file content
 * @param filePath Path to the file
 * @returns File content as string
 */
export async function readFileContent(filePath: string): Promise<string> {
  try {
    const fs = require('fs').promises;
    const content = await fs.readFile(filePath, 'utf8');
    return content;
  } catch (error) {
    console.error('Error reading file:', error);
    throw new Error('Failed to read file content');
  }
}

/**
 * Extract text from PDF file
 * @param filePath Path to the PDF file
 * @returns Extracted text
 */
export async function extractTextFromPDF(filePath: string): Promise<string> {
  try {
    // This is a placeholder - in a real implementation, you would use a library like pdf-parse
    // For now, we'll just read the file as text
    return await readFileContent(filePath);
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Process uploaded file based on type
 * @param filePath Path to the uploaded file
 * @returns Extracted text content
 */
export async function processUploadedFile(filePath: string): Promise<string> {
  if (!filePath) {
    return '';
  }
  
  // Determine file type from extension
  const fileExtension = filePath.split('.').pop()?.toLowerCase();
  
  switch (fileExtension) {
    case 'pdf':
      return await extractTextFromPDF(filePath);
    case 'doc':
    case 'docx':
      // In a real implementation, you would use a library to extract text from Word documents
      // For now, we'll just read the file as text
      return await readFileContent(filePath);
    case 'txt':
      return await readFileContent(filePath);
    default:
      throw new Error(`Unsupported file type: ${fileExtension}`);
  }
}
