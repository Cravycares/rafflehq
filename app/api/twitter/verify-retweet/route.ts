import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const { tweetUrl } = await request.json()

  try {
    // Extract tweet ID from URL
    const tweetId = tweetUrl.split("/").pop()?.split("?")[0]
    if (!tweetId) return NextResponse.json({ verified: false, reason: "Invalid tweet URL" })

    // Check retweets using bearer token (app-level auth)
    const res = await fetch(
      `https://api.twitter.com/2/tweets/${tweetId}/retweeted_by`,
      {
        headers: { Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}` },
      }
    )
    const data = await res.json()

    // Get session to check user's handle
    const { getServerSession } = await import("next-auth")
    const session = await getServerSession()
    const xHandle = (session as any)?.xHandle

    const hasRetweeted = data.data?.some(
      (u: any) => u.username?.toLowerCase() === xHandle?.toLowerCase()
    )

    return NextResponse.json({ verified: !!hasRetweeted })
  } catch {
    return NextResponse.json({ verified: false, reason: "Verification failed" })
  }
}