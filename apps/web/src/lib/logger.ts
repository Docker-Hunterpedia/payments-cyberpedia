import pino from 'pino';

// Browser-mode pino — replaces ad-hoc console.log across the app.
export const logger = pino({
  browser: { asObject: true },
  level: import.meta.env.DEV ? 'debug' : 'warn',
});
