import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; filename: string }> }
) {
  try {
    const { id, filename } = await params;

    // Try per-request upload directory first
    const perRequestPath = join(process.cwd(), 'upload', id, filename);
    // Fallback to flat upload directory
    const flatPath = join(process.cwd(), 'upload', filename);

    let filePath = '';
    if (existsSync(perRequestPath)) {
      filePath = perRequestPath;
    } else if (existsSync(flatPath)) {
      filePath = flatPath;
    } else {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileBuffer = await readFile(filePath);
    const fileStat = await stat(filePath);

    // Determine content type from extension
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      csv: 'text/csv',
      txt: 'text/plain',
      bin: 'application/octet-stream',
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileStat.size.toString(),
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('File serve error:', error);
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
