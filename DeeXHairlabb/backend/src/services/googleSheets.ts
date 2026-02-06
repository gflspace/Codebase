import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

interface ExportData {
  [key: string]: string | number;
}

export async function createGoogleSheetExport(
  title: string,
  headers: string[],
  data: ExportData[]
): Promise<{ sheetId: string; sheetUrl: string }> {
  try {
    // Initialize Google Auth
    const auth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
      ],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const drive = google.drive({ version: 'v3', auth });

    // Create new spreadsheet
    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title,
        },
      },
    });

    const spreadsheetId = spreadsheet.data.spreadsheetId!;

    // Prepare data rows
    const values = [
      headers, // Header row
      ...data.map((row) => headers.map((header) => row[header] || '')),
    ];

    // Write data to sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Sheet1!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values,
      },
    });

    // Format header row
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: {
                    red: 0.2,
                    green: 0.4,
                    blue: 0.6,
                  },
                  textFormat: {
                    foregroundColor: { red: 1, green: 1, blue: 1 },
                    bold: true,
                  },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
          },
        ],
      },
    });

    // Set permissions (make it accessible to the service account owner)
    // In production, you might want to share with specific users
    if (process.env.GOOGLE_SHEETS_FOLDER_ID) {
      await drive.files.update({
        fileId: spreadsheetId,
        addParents: process.env.GOOGLE_SHEETS_FOLDER_ID,
      });
    }

    const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

    return {
      sheetId: spreadsheetId,
      sheetUrl,
    };
  } catch (error) {
    console.error('Google Sheets export error:', error);
    throw new Error('Failed to create Google Sheet export');
  }
}
