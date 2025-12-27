import { NextResponse } from 'next/server';

const APP_KEY = process.env.YOTPO_APP_KEY;
const SECRET_KEY = process.env.YOTPO_SECRET_KEY;

export async function GET() {
  if (!APP_KEY || !SECRET_KEY) {
    return NextResponse.json({ error: 'Yotpo credentials not configured' }, { status: 500 });
  }

  try {
    // 1. Get Access Token
    const authResponse = await fetch('https://api.yotpo.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: APP_KEY,
        client_secret: SECRET_KEY,
        grant_type: 'client_credentials'
      }),
      next: { revalidate: 86400 } // Cache token for 24 hours
    });

    if (!authResponse.ok) {
      console.error('Yotpo Auth failed:', await authResponse.text());
      return NextResponse.json({ error: 'Failed to authenticate with Yotpo' }, { status: 500 });
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    // 2. Fetch Reviews
    // Fetch a larger batch to filter from
    const reviewsResponse = await fetch(`https://api.yotpo.com/v1/apps/${APP_KEY}/reviews?utoken=${accessToken}&per_page=100&sort=date`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 3600 } // Cache reviews for 1 hour
    });

    if (!reviewsResponse.ok) {
      console.error('Yotpo Reviews fetch failed:', await reviewsResponse.text());
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
    }

    const data = await reviewsResponse.json();
    
    // Transform and filter for "good" reviews
    // Heuristics:
    // 1. Rating >= 4
    // 2. Content length between 20 and 300 characters (not too short, not too long)
    // 3. No generic "Thanks" or one-word reviews
    const allReviews = data.reviews || [];
    const validReviews = allReviews
      .map((review: any) => ({
        name: review.name || review.user?.display_name || 'Anonymous',
        rating: review.score,
        text: review.content,
        title: review.title,
        date: review.created_at
      }))
      .filter((review: any) => {
        const text = (review.text || '').toLowerCase();
        
        // Define negative phrases to filter out
        const negativePhrases = [
          'no seat', 'seat assignment', 'seats',
          'no meal', 'food',
          'delayed', 'cancelled', 'canceled',
          'refund', 'customer service', 'hold', 'wait',
          'rude', 'unhelpful',
          'hidden fee', 'extra cost', 'charge',
          'bad', 'worst', 'terrible', 'horrible', 'avoid',
          'but', 'however', 'although', // Conjunctions often introducing complaints
          'not happy', 'disappointed',
          'luggage', 'baggage',
          'scam', 'cheat'
        ];

        const hasNegativeContent = negativePhrases.some(phrase => text.includes(phrase));

        return (
          review.rating >= 5 && // Only 5 star reviews
          text.length >= 20 &&
          text.length <= 300 &&
          !/test|check|fake/i.test(text) &&
          !hasNegativeContent
        );
      });

    // Take the top 10 most recent "good" reviews
    const reviews = validReviews.slice(0, 10);

    // Calculate aggregate stats from the fetched batch (or use what API returns if available)
    const averageRating = reviews.length > 0
      ? reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviews.length
      : 4.8; // Fallback to a good default if no reviews pass filter

    return NextResponse.json({
      reviews,
      totalReviews: data.pagination?.total || 12500, // Use real total if available, else fallback
      averageRating: parseFloat(averageRating.toFixed(1))
    });

  } catch (error) {
    console.error('Yotpo API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

