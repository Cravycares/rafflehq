import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

export async function POST(request: NextRequest) {
  const { tweetUrl } = await request.json()
  const session = await getServerSession()
  const accessToken = (session as any)?.accessToken

  if (!accessToken) return NextResponse.json({ verified: false, reason: "Not authenticated" })

  try {
    // Extract tweet ID from URL
    const tweetId = tweetUrl.split("/").pop()?.split("?")[0]
    if (!tweetId) return NextResponse.json({ verified: false, reason: "Invalid tweet URL" })

    // Get the logged-in user's ID
    const meRes = await fetch("https://api.twitter.com/2/users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const me = await meRes.json()
    const userId = me.data?.id
    if (!userId) return NextResponse.json({ verified: false, reason: "Could not get user ID" })

    // Check liked tweets
    const likedRes = await fetch(
      `https://api.twitter.com/2/users/${userId}/liked_tweets?max_results=100`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const likedData = await likedRes.json()
    const hasLiked = likedData.data?.some((t: any) => t.id === tweetId)

    return NextResponse.json({ verified: !!hasLiked })
  } catch {
    return NextResponse.json({ verified: false, reason: "Verification failed" })
  }
}