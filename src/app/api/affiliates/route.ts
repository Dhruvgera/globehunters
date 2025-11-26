import { NextResponse } from 'next/server';

const API_URL = 'https://cms-api.travcart.co.uk/api/basket/GetAffilates?hosturl=globehunters.com';

// Cache at the edge for 10 minutes
export const revalidate = 600;

export async function GET() {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch affiliates: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Error fetching affiliates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch affiliates' },
      { status: 500 }
    );
  }
}
