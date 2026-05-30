import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const error = searchParams.get("error")
  const stateParam = searchParams.get("state")

  if (error || !code) {
    return NextResponse.redirect(new URL("/?discord_error=true", request.url))
  }

  let state: any = {}
  try {
    state = stateParam ? JSON.parse(atob(stateParam)) : {}
  } catch {}

  const origin = new URL(request.url).origin
  const redirectUri = `${origin}/api/auth/discord`

  try {
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    })

    const tokens = await tokenResponse.json()
    console.log("Discord token response:", JSON.stringify(tokens))

    if (!tokens.access_token) {
      const errorInfo = encodeURIComponent(JSON.stringify(tokens))
      return NextResponse.redirect(new URL(`/?discord_error=${errorInfo}`, request.url))
    }

    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const discordUser = await userResponse.json()

    if (state.from === "request") {
      const redirectUrl = new URL("/projects", request.url)
      redirectUrl.searchParams.set("discord_token", tokens.access_token)
      redirectUrl.searchParams.set("discord_id", discordUser.id)
      redirectUrl.searchParams.set("discord_username", discordUser.username)
      redirectUrl.searchParams.set("project_id", state.projectId || "")
      return NextResponse.redirect(redirectUrl)
    }

    const raffleId = state.raffleId
    const redirectUrl = new URL(`/raffles/${raffleId}`, request.url)
    redirectUrl.searchParams.set("discord_id", discordUser.id)
    redirectUrl.searchParams.set("discord_username", discordUser.username)
    redirectUrl.searchParams.set("discord_token", tokens.access_token)
    return NextResponse.redirect(redirectUrl)

  } catch (err) {
    console.error("Discord callback error:", err)
    return NextResponse.redirect(new URL(`/?discord_error=${encodeURIComponent(String(err))}`, request.url))
  }
}