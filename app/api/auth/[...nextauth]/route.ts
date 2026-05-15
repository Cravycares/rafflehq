import NextAuth from "next-auth"
import TwitterProvider from "next-auth/providers/twitter"
import { supabase } from "@/lib/supabase"

const handler = NextAuth({
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      const xHandle = (profile as any)?.screen_name
      const name = user.name
      const avatar = user.image

      if (!xHandle) return false

      // Check if project already exists
      const { data: existing } = await supabase
        .from("projects")
        .select("id")
        .eq("x_handle", `@${xHandle}`)
        .single()

      if (!existing) {
        // Create new project profile
        await supabase.from("projects").insert({
          name: name || xHandle,
          x_handle: `@${xHandle}`,
          x_verified: true,
          avatar_url: avatar,
        })
      }

      return true
    },
    async session({ session, token }) {
      (session as any).xHandle = token.xHandle
      return session
    },
    async jwt({ token, profile }) {
      if (profile) {
        token.xHandle = (profile as any)?.screen_name
      }
      return token
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
})

export { handler as GET, handler as POST }
