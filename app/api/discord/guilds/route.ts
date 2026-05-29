import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")
  if (!token) return NextResponse.json({ error: "No token" }, { status: 401 })

  try {
    const res = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${token}` },
    })
    const guilds = await res.json()

    // Only return guilds where user has MANAGE_GUILD permission (0x20)
    const managed = guilds.filter((g: any) => (BigInt(g.permissions) & BigInt(0x20)) === BigInt(0x20))

    return NextResponse.json(managed)
  } catch {
    return NextResponse.json({ error: "Failed to fetch guilds" }, { status: 500 })
  }
}