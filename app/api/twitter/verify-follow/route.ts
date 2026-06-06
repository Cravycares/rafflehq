import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

export async function POST(request: NextRequest) {
  const { targetUsername } = await request.json()
  const session = await getServerSession()
  const accessToken = (session as any)?.accessToken

  if (!accessToken) return NextResponse.json({ verified: false, reason: "Not authenticated" })

  try {
    // Get the logged-in user's Twitter ID
    const meRes = await fetch("https://api.twitter.com/2/users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const me = await meRes.json()
    const userId = me.data?.id
    if (!userId) return NextResponse.json({ verified: false, reason: "Could not get user ID" })

    // Get target user's ID
    const targetRes = await fetch(`https://api.twitter.com/2/users/by/username/${targetUsername}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const target = await targetRes.json()
    const targetId = target.data?.id
    if (!targetId) return NextResponse.json({ verified: false, reason: "Target account not found" })

    // Check if user follows target
    const followRes = await fetch(
      `https://api.twitter.com/2/users/${userId}/following?max_results=1000`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const followData = await followRes.json()
    const isFollowing = followData.data?.some((u: any) => u.id === targetId)

    return NextResponse.json({ verified: !!isFollowing })
  } catch {
    return NextResponse.json({ verified: false, reason: "Verification failed" })
  }
}