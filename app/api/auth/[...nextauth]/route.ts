import NextAuth from "next-auth"
import TwitterProvider from "next-auth/providers/twitter"

const handler = NextAuth({
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: "2.0",
      authorization: {
        url: "https://x.com/i/oauth2/authorize",
        params: {
          scope: "tweet.read users.read like.read",
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
  (session as any).xHandle = token.xHandle
  ;(session as any).accessToken = token.accessToken
  return session
},
    async jwt({ token, profile, account }) {
  if (profile) {
    token.xHandle = (profile as any)?.data?.username || (profile as any)?.username
  }
  if (account) {
    token.accessToken = account.access_token
  }
  return token
},
  },
  secret: process.env.NEXTAUTH_SECRET,
})

export { handler as GET, handler as POST }