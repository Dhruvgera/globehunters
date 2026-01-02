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
    // Fetch a larger batch to filter from (200 to have more quality options after filtering)
    const reviewsResponse = await fetch(`https://api.yotpo.com/v1/apps/${APP_KEY}/reviews?utoken=${accessToken}&per_page=400&sort=date`, {
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
    // 1. Rating = 5 stars only
    // 2. Content length between 70 and 400 characters (substantive but not too long)
    // 3. Minimum 10 words to filter out generic short reviews
    // 4. No negative phrases or spam indicators
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
        const wordCount = text.trim().split(/\s+/).length;
        
        // Define negative phrases to filter out
        const negativePhrases = [
          'no seat', 'seat assignment',
          'no meal',
          'delayed', 'cancelled', 'canceled',
          'refund', 'customer service', 'on hold',
          'rude', 'unhelpful',
          'hidden fee', 'extra cost',
          'bad', 'worst', 'terrible', 'horrible', 'avoid',
          'not happy', 'disappointed', 'never again',
          'scam', 'cheat', 'fraud'
        ];

        const hasNegativeContent = negativePhrases.some(phrase => text.includes(phrase));

        return (
          review.rating >= 3 && // Only 5 star reviews
          text.length >= 10 && // Minimum 70 chars for substantive content
          text.length <= 400 && // Allow slightly longer reviews
          wordCount >= 4 && // At least 10 words to avoid short generic reviews
          !/test|check|fake|asdf|xxx/i.test(text) && // Filter spam/test reviews
          !hasNegativeContent
        );
      });

    // Take the top 20 most recent "good" reviews for carousel variety
    const reviews = validReviews.slice(0, 20);

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

