import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_dst_key_2026_finance_portal_secret';

export const generateToken = (userId, sessionId) => {
  return jwt.sign({ id: userId, sessionId }, JWT_SECRET, {
    expiresIn: '30d',
  });
};

export const sendTokenCookie = (res, token) => {
  const cookieOptions = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    httpOnly: true, // Prevent client-side JS from reading it
    secure: process.env.NODE_ENV === 'production', // Send over HTTPS only in production
    sameSite: 'strict', // Help protect against CSRF attacks
  };

  res.cookie('token', token, cookieOptions);
};

export const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};
