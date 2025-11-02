import { NextResponse } from 'next/server';

const AWD_API = `${process.env.API_BASE_URL}/awd/all.json`;

export async function GET() {
  try {
    const response = await fetch(AWD_API, {
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
    console.error('Error proxying AWD request:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AWD data' },
      { status: 500 }
    );
  }
}
