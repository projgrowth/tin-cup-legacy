/** Classify Supabase auth errors for the phone-first weekend flow. */

export function isRateLimited(message: string) {
  return /rate|exceed|too many|429|over_email/i.test(message);
}

export function isAlreadyRegistered(message: string) {
  return /already (been )?registered|already exists|user already/i.test(message);
}

export function isUnconfirmedEmail(message: string) {
  return /not confirmed|email not confirmed|confirm your email/i.test(message);
}

export function isInvalidLogin(message: string) {
  return /invalid login|invalid credentials|wrong password|invalid email or password/i.test(
    message,
  );
}
