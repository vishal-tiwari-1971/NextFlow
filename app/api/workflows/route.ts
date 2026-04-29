import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const result = await query(
      'SELECT id, name, description, nodes, edges, created_at, updated_at FROM workflows WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [userId],
    );

    return NextResponse.json(result.rows ?? []);
  } catch (error) {
    console.error('Error fetching workflows:', error);
    return NextResponse.json(
      { message: 'Failed to fetch workflows' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description = '',
      nodes = [],
      edges = [],
    } = body as {
      name?: string;
      description?: string;
      nodes?: unknown[];
      edges?: unknown[];
    };

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ message: 'Workflow name is required' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO workflows (user_id, name, description, nodes, edges)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)
       RETURNING id, name, description, nodes, edges, created_at, updated_at`,
      [userId, name, description, JSON.stringify(nodes), JSON.stringify(edges)],
    );

    return NextResponse.json(result.rows?.[0] ?? null, { status: 201 });
  } catch (error) {
    console.error('Error creating workflow:', error);
    return NextResponse.json(
      { message: 'Failed to create workflow' },
      { status: 500 },
    );
  }
}
