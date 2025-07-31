import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'

// Mock user data - in production, this would come from your database
const users = [
  {
    id: '1',
    email: 'admin@namc-norcal.org',
    password: '$2a$12$IovcTF3qgqDxQQj/9HTP8upuVMnlspwZJXDfQW41wuCXFxTReLIHW', // 'admin123'
    name: 'Admin User',
    role: 'admin',
  },
  {
    id: '2',
    email: 'member@namc-norcal.org',
    password: '$2a$12$ZX1N1qGpcSGSnPInLERrN.V7QL0GDsh1OwZH1.ixsRK6ZdSfyXAHK', // 'member123'
    name: 'John Doe',
    role: 'member',
  },
]

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = users.find(u => u.email === credentials.email)
        if (!user) {
          return null
        }

        const passwordMatch = await bcrypt.compare(credentials.password, user.password)
        if (!passwordMatch) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as string
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    signUp: '/auth/register',
  },
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
    }
  }

  interface User {
    role: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string
  }
}