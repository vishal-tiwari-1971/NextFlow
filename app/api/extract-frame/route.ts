import { NextResponse } from 'next/server';
import { extractFrameFromVideoUrl } from '../../../lib/frame-extraction';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ExtractFrameRequest = {
  videoUrl?: unknown;
  timestamp?: unknown;
  timestampMode?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExtractFrameRequest;
    const videoUrl = typeof body.videoUrl === 'string' ? body.videoUrl.trim() : '';
    const rawTimestamp = typeof body.timestamp === 'number' ? body.timestamp : Number(body.timestamp);
    const timestampMode = body.timestampMode === 'percentage' ? 'percentage' : 'seconds';

    if (!videoUrl) {
      return NextResponse.json({ message: 'Missing videoUrl.' }, { status: 400 });
    }

    if (!videoUrl.startsWith('http')) {
      return NextResponse.json({ message: 'videoUrl must be an HTTP(S) URL.' }, { status: 400 });
    }

    if (!Number.isFinite(rawTimestamp) || rawTimestamp < 0) {
      return NextResponse.json({ message: 'timestamp must be a non-negative number.' }, { status: 400 });
    }

    if (timestampMode === 'percentage' && rawTimestamp > 100) {
      return NextResponse.json(
        { message: 'timestamp percentage must be between 0 and 100.' },
        { status: 400 },
      );
    }

    const result = await extractFrameFromVideoUrl({
      videoUrl,
      timestamp: rawTimestamp,
      timestampMode,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : 'Failed to extract frame.',
      },
      { status: 500 },
    );
  }
}
