'use server';
/**
 * @fileOverview A Genkit flow to upload a file to Google Drive.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const UploadToGoogleDriveInputSchema = z.object({
  accessToken: z.string().describe('The Google OAuth access token.'),
  fileContent: z.string().describe('The content of the file to upload.'),
  fileName: z.string().describe('The name of the file.'),
  folderId: z.string().describe('The ID of the Google Drive folder to upload to.'),
});
type UploadToGoogleDriveInput = z.infer<typeof UploadToGoogleDriveInputSchema>;

const UploadToGoogleDriveOutputSchema = z.object({
  fileId: z.string().describe('The ID of the created file in Google Drive.'),
  webViewLink: z.string().describe('A link to view the file in the browser.'),
});
type UploadToGooglegDriveOutput = z.infer<typeof UploadToGoogleDriveOutputSchema>;

export async function uploadToGoogleDrive(input: UploadToGoogleDriveInput): Promise<UploadToGooglegDriveOutput> {
  return uploadToGoogleDriveFlow(input);
}

const uploadToGoogleDriveFlow = ai.defineFlow(
  {
    name: 'uploadToGoogleDriveFlow',
    inputSchema: UploadToGoogleDriveInputSchema,
    outputSchema: UploadToGoogleDriveOutputSchema,
  },
  async (input) => {
    const { accessToken, fileContent, fileName, folderId } = input;

    // Set up the multipart request body
    const boundary = 'foo_bar_baz';
    const metadata = {
      name: fileName,
      parents: [folderId],
      mimeType: 'text/csv',
    };

    let data = `--${boundary}\r\n`;
    data += 'Content-Type: application/json; charset=UTF-8\r\n\r\n';
    data += `${JSON.stringify(metadata)}\r\n`;
    data += `--${boundary}\r\n`;
    data += `Content-Type: text/csv\r\n\r\n`;
    data += `${fileContent}\r\n`;
    data += `--${boundary}--`;

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Authorization': `Bearer ${accessToken}`,
      },
      body: data,
    });

    if (!response.ok) {
      const errorBody = await response.json();
      console.error('Google Drive API Error:', errorBody);
      throw new Error(`Google Drive API failed with status: ${response.status}. ${errorBody.error.message}`);
    }

    const result = await response.json();

    return {
      fileId: result.id,
      webViewLink: result.webViewLink,
    };
  }
);
