import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  if (error || !code) {
    return NextResponse.redirect(new URL("/?discord_error=true", request.url))
  }

  try {
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: "authorization_code",
        code,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/discord`,
      }),
    })

    const tokens = await tokenResponse.json()

    if (!tokens.access_token) {
      return NextResponse.redirect(new URL("/?discord_error=true", request.url))
    }

    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const discordUser = await userResponse.json()

    const state = searchParams.get("state")
    const raffleId = state ? JSON.parse(atob(state)).raffleId : null

    const redirectUrl = new URL(`/raffles/${raffleId}`, request.url)
    redirectUrl.searchParams.set("discord_id", discordUser.id)
    redirectUrl.searchParams.set("discord_username", discordUser.username)
    redirectUrl.searchParams.set("discord_token", tokens.access_token)

    return NextResponse.redirect(redirectUrl)
  } catch (err) {
    return NextResponse.redirect(new URL("/?discord_error=true", request.url))
  }
}