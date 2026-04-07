/**
 * Free / consumer email provider blocklist.
 * SalesPal requires a custom business domain on signup.
 * Any email from a domain on this list is rejected at the validation step.
 */
const BLOCKED_DOMAINS = new Set([
  // Google
  'gmail.com',
  'googlemail.com',

  // Microsoft
  'outlook.com',
  'hotmail.com',
  'hotmail.co.uk',
  'hotmail.fr',
  'hotmail.de',
  'hotmail.it',
  'hotmail.es',
  'live.com',
  'live.co.uk',
  'live.fr',
  'live.de',
  'live.it',
  'live.nl',
  'live.be',
  'live.com.au',
  'msn.com',
  'passport.com',

  // Yahoo
  'yahoo.com',
  'yahoo.co.uk',
  'yahoo.co.in',
  'yahoo.com.au',
  'yahoo.com.br',
  'yahoo.ca',
  'yahoo.de',
  'yahoo.es',
  'yahoo.fr',
  'yahoo.it',
  'yahoo.co.jp',
  'yahoo.com.mx',
  'yahoo.com.ar',
  'yahoo.com.sg',
  'yahoo.com.ph',
  'ymail.com',
  'rocketmail.com',

  // Apple
  'icloud.com',
  'me.com',
  'mac.com',

  // AOL / Verizon
  'aol.com',
  'aim.com',
  'verizon.net',

  // Other major free providers
  'protonmail.com',
  'proton.me',
  'pm.me',
  'tutanota.com',
  'tutanota.de',
  'tuta.io',
  'zoho.com',
  'mail.com',
  'email.com',
  'usa.com',
  'myself.com',
  'consultant.com',
  'post.com',
  'imap.cc',
  'gmx.com',
  'gmx.de',
  'gmx.net',
  'gmx.at',
  'gmx.ch',
  'web.de',
  'freenet.de',
  't-online.de',
  'mail.ru',
  'bk.ru',
  'list.ru',
  'inbox.ru',
  'internet.ru',
  'yandex.com',
  'yandex.ru',
  'ya.ru',
  'rambler.ru',
  'fastmail.com',
  'fastmail.fm',
  'hushmail.com',
  'inbox.com',
  'rediffmail.com',
  'lycos.com',
  'excite.com',
  'naver.com',
  'daum.net',
  'hanmail.net',
])

export type EmailValidationResult =
  | { valid: true }
  | { valid: false; reason: string }

/**
 * Validates that an email address belongs to a custom business domain.
 * Rejects malformed addresses and any domain on the consumer blocklist.
 */
export function validateBusinessEmail(email: string): EmailValidationResult {
  const trimmed = email.trim().toLowerCase()

  // Basic format check
  const atIndex = trimmed.lastIndexOf('@')
  if (atIndex < 1) {
    return { valid: false, reason: 'Please enter a valid email address.' }
  }

  const domain = trimmed.slice(atIndex + 1)

  if (!domain || !domain.includes('.')) {
    return { valid: false, reason: 'Please enter a valid email address.' }
  }

  if (BLOCKED_DOMAINS.has(domain)) {
    return {
      valid: false,
      reason:
        'SalesPal requires a business email address. Free email providers like Gmail, Outlook, and Yahoo are not accepted.',
    }
  }

  return { valid: true }
}

/**
 * Returns true if the email is from a blocked consumer domain.
 * Convenience wrapper for simple boolean checks.
 */
export function isBusinessEmail(email: string): boolean {
  return validateBusinessEmail(email).valid
}
