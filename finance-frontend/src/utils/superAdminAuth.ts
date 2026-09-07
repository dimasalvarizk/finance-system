/**
 * Super Admin strict authorization check
 * Strictly restricted to Dimas (alvarizkidimas@gmail.com) and Ali (ali@odst.id)
 */
export const SUPER_ADMIN_EMAILS = [
  'alvarizkidimas@gmail.com',
  'ali@odst.id',
  'dimas@odst.id',
  'dimasalvarizk@gmail.com'
];

export const isSuperAdminUser = (user: { email?: string; name?: string; role?: string } | null | undefined): boolean => {
  if (!user || !user.email) return false;
  
  const cleanEmail = user.email.toLowerCase().trim();

  // Strict email validation to prevent accidental substring match with other users (e.g. 'khalid')
  if (
    cleanEmail === 'alvarizkidimas@gmail.com' ||
    cleanEmail === 'ali@odst.id' ||
    cleanEmail === 'dimas@odst.id' ||
    cleanEmail === 'dimasalvarizk@gmail.com' ||
    cleanEmail.startsWith('alvarizkidimas@') ||
    cleanEmail.startsWith('ali@odst.id') ||
    cleanEmail.startsWith('dimas@')
  ) {
    return true;
  }

  return false;
};
