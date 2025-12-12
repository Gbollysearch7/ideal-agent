declare namespace NodeJS {
  interface ProcessEnv {
    // Supabase (Primary database)
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;

    // Database (Legacy - deprecated, use Supabase instead)
    DATABASE_URL?: string;

    // Redis
    REDIS_URL?: string;
    REDIS_HOST?: string;
    REDIS_PORT?: string;

    // Authentication
    NEXTAUTH_URL: string;
    NEXTAUTH_SECRET: string;
    AUTH_SECRET?: string; // NextAuth v5 alternative name

    // Encryption
    ENCRYPTION_KEY?: string;

    // Resend (Email service)
    RESEND_API_KEY: string;
    RESEND_WEBHOOK_SECRET?: string;
    RESEND_FROM_EMAIL: string;

    // Anthropic (AI)
    ANTHROPIC_API_KEY: string;

    // AWS S3 (Optional file storage)
    AWS_ACCESS_KEY_ID?: string;
    AWS_SECRET_ACCESS_KEY?: string;
    AWS_S3_BUCKET?: string;
    AWS_REGION?: string;

    // Cloudflare R2 (Alternative file storage)
    R2_ACCESS_KEY_ID?: string;
    R2_SECRET_ACCESS_KEY?: string;
    R2_BUCKET?: string;
    R2_ENDPOINT?: string;
    R2_PUBLIC_URL?: string;

    // Monitoring (Optional)
    SENTRY_DSN?: string;
    POSTHOG_KEY?: string;
    POSTHOG_HOST?: string;

    // Application
    NODE_ENV: 'development' | 'production' | 'test';
    NEXT_PUBLIC_APP_URL?: string;
    NEXT_PUBLIC_APP_NAME?: string;

    // Rate Limiting (Optional)
    RATE_LIMIT_REQUESTS_PER_MINUTE?: string;
    EMAIL_RATE_LIMIT_PER_MINUTE?: string;
    AI_RATE_LIMIT_PER_MINUTE?: string;
  }
}
