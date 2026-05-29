import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const { discord_token, guild_id, role_id, discord_user_id } = await request.json()

  try {
    const guildsResponse = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${discord_token}` },
    })
    const guilds = await guildsResponse.json()

    const inGuild = guilds.some((g: any) => g.id === guild_id)
    if (!inGuild) {
      return NextResponse.json({ 
        verified: false, 
        reason: "Not a member of the required Discord server" 
      })
    }

    const memberResponse = await fetch(
      `https://discord.com/api/guilds/${guild_id}/members/${discord_user_id}`,
      {
        headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
      }
    )
    const member = await memberResponse.json()

    const hasRole = member.roles?.includes(role_id)

    return NextResponse.json({
      verified: hasRole,
      reason: hasRole ? "Verified" : "You don't have the required role",
      roles: member.roles,
    })
  } catch (err) {
    return NextResponse.json({ verified: false, reason: "Verification failed" })
  }
}