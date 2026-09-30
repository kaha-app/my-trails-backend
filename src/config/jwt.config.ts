const requiredSecret = (name: 'JWT_SECRET' | 'JWT_REFRESH_SECRET') => {
  const value = process.env[name];
  if (!value || value.length < 32) {
    throw new Error(`${name} must be configured with at least 32 characters`);
  }
  return value;
};

export const jwtConfig = {
  secret: requiredSecret('JWT_SECRET'),
  refreshSecret: requiredSecret('JWT_REFRESH_SECRET'),
  accessTokenExpiry: 3600, // 1 hour in seconds
  refreshTokenExpiry: 604800, // 7 days in seconds
};
