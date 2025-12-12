import NextAuth, { NextAuthConfig } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from './supabase';

// Development test user credentials
const DEV_TEST_EMAIL = 'dev@test.com';
const DEV_TEST_PASSWORD = 'devtest123';
const DEV_TEST_USER = {
  id: 'dev_test_user_001',
  email: DEV_TEST_EMAIL,
  name: 'Dev Tester',
  image: null,
};

// Check if dev bypass is enabled
const isDevBypassEnabled =
  process.env.NODE_ENV === 'development' &&
  process.env.ENABLE_DEV_BYPASS === 'true';

export const authConfig: NextAuthConfig = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        // Dev bypass: Allow test login in development mode
        if (isDevBypassEnabled) {
          if (
            credentials.email === DEV_TEST_EMAIL &&
            credentials.password === DEV_TEST_PASSWORD
          ) {
            console.log('🔧 DEV BYPASS: Logging in as test user');

            // Ensure dev user exists in database
            await ensureDevUserExists();

            return DEV_TEST_USER;
          }
        }

        const { data: user, error } = await supabaseAdmin
          .from('users')
          .select('id, email, name, password_hash')
          .eq('email', credentials.email as string)
          .single();

        if (error || !user) {
          throw new Error('Invalid email or password');
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password as string,
          user.password_hash
        );

        if (!isValidPassword) {
          throw new Error('Invalid email or password');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  events: {
    async signIn({ user }) {
      console.log(`User signed in: ${user.email}`);
    },
    async signOut() {
      console.log('User signed out');
    },
  },
  debug: process.env.NODE_ENV === 'development',
};

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);

// Helper function to get the current user
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, email, name, company_name, plan_type, created_at')
    .eq('id', session.user.id)
    .single();

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    companyName: user.company_name,
    planType: user.plan_type,
    createdAt: user.created_at,
  };
}

// Helper to require authentication
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

// Ensure dev test user exists in database
async function ensureDevUserExists() {
  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('id', DEV_TEST_USER.id)
    .single();

  if (!existingUser) {
    const hashedPassword = await bcrypt.hash(DEV_TEST_PASSWORD, 12);
    await supabaseAdmin.from('users').insert({
      id: DEV_TEST_USER.id,
      email: DEV_TEST_EMAIL,
      name: DEV_TEST_USER.name,
      password_hash: hashedPassword,
      company_name: 'Dev Test Company',
      plan_type: 'PRO',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    console.log('🔧 DEV BYPASS: Created dev test user in database');
  }
}

// Password hashing utility
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Password validation
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}
