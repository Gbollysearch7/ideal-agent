declare namespace NodeJS {
  interface ProcessEnv {
    // Database
    DATABASE_URL: string;

    // Redis
    REDIS_URL: string;
    REDIS_HOST: string;
    REDIS_PORT: string;

    // Authentication
    NEXTAUTH_URL: string;
    NEXTAUTH_SECRET: string;

    // Encryption
    ENCRYPTION_KEY: string;

    // Resend
    RESEND_API_KEY: string;
    RESEND_WEBHOOK_SECRET: string;
    RESEND_FROM_EMAIL: string;

    // Anthropic
    ANTHROPIC_API_KEY: string;

    // AWS S3
    AWS_ACCESS_KEY_ID: string;
    AWS_SECRET_ACCESS_KEY: string;
    AWS_S3_BUCKET: string;
    AWS_REGION: string;

    // Cloudflare R2 (Alternative)
    R2_ACCESS_KEY_ID?: string;
    R2_SECRET_ACCESS_KEY?: string;
    R2_BUCKET?: string;
    R2_ENDPOINT?: string;
    R2_PUBLIC_URL?: string;

    // Monitoring
    SENTRY_DSN?: string;
    POSTHOG_KEY?: string;
    POSTHOG_HOST?: string;

    // Application
    NODE_ENV: 'development' | 'production' | 'test';
    NEXT_PUBLIC_APP_URL: string;
    NEXT_PUBLIC_APP_NAME: string;

    // Rate Limiting
    RATE_LIMIT_REQUESTS_PER_MINUTE: string;
    EMAIL_RATE_LIMIT_PER_MINUTE: string;
    AI_RATE_LIMIT_PER_MINUTE: string;
  }
}
