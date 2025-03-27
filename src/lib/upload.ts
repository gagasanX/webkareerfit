// lib/upload.ts
import { NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export async function saveFormDataWithFile(req: NextRequest): Promise<{ fields: any, filePath?: string }> {
  let tempDir = '';
  
  try {
    // Create temp directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'assessment-'));
    console.log('Created temp directory:', tempDir);
    
    // Extract the form data
    const formData = await req.formData();
    console.log('FormData received with keys:', [...formData.keys()]);
    
    // Get file from FormData
    const resumeFile = formData.get('resume') as File | null;
    let filePath: string | undefined = undefined;
    
    if (resumeFile && resumeFile instanceof File && resumeFile.size > 0) {
      try {
        const fileName = resumeFile.name || 'resume.pdf';
        filePath = path.join(tempDir, fileName);
        console.log(`Saving file ${fileName} to ${filePath}`);
        
        const fileBuffer = Buffer.from(await resumeFile.arrayBuffer());
        await fs.writeFile(filePath, fileBuffer);
        
        console.log('File saved successfully');
      } catch (fileError) {
        console.error('Error saving file:', fileError);
        // Continue without file
      }
    }
    
    // Return form data without file
    return { 
      fields: Object.fromEntries(
        [...formData.entries()].filter(([_, value]) => !(value instanceof File))
      ),
      filePath
    };
  } catch (error) {
    console.error('Error processing form data:', error);
    throw error;
  }
}