import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const company = searchParams.get('company'); 
  const type = searchParams.get('type') || 'EC'; 
  const period = searchParams.get('period') || 'FEB26'; // Match your folder name

  try {
    const filePath = path.join(
      process.cwd(),
      '..',
      'integrated-backend',
      'outputs',
      company as string,
      type,
      period,
      'beginner.json'
    );

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    return NextResponse.json(JSON.parse(fileContent));
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}