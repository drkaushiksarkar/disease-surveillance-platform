import { NextResponse } from 'next/server';

const DENGUE_API = `${process.env.API_BASE_URL}/dengue/all.json`;

export async function GET() {
  try {
    const response = await fetch(DENGUE_API, {
      cache: 'no-cache',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `API returned ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying dengue request:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dengue data' },
      { status: 500 }
    );
  }
}
