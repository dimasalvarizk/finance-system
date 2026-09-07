/**
 * Super Admin strict authorization check
 * EXCLUSIVELY and ONLY restricted to:
 * 1. alvarizkidimas@gmail.com
 * 2. ali@odst.id
 *
 * Any other user or other Super Admin role is strictly denied.
 */
export const ALLOWED_SUPER_ADMIN_EMAILS = [
  'alvarizkidimas@gmail.com',
  'ali@odst.id'
];

export const isSuperAdminUser = (user: { email?: string } | null | undefined): boolean => {
  if (!user || !user.email) return false;
  
  const cleanEmail = user.email.toLowerCase().trim();
  return ALLOWED_SUPER_ADMIN_EMAILS.includes(cleanEmail);
};
