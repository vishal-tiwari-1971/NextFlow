export const triggerAccessToken =
  process.env.TRIGGER_SECRET_KEY || process.env.TRIGGER_API_KEY || '';

if (!process.env.TRIGGER_SECRET_KEY && process.env.TRIGGER_API_KEY) {
  process.env.TRIGGER_SECRET_KEY = process.env.TRIGGER_API_KEY;
}

export const hasTriggerAccessToken = triggerAccessToken.length > 0;