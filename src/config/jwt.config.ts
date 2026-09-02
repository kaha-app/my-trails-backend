export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'your-secret-key',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key',
  accessTokenExpiry: 3600, // 1 hour in seconds
  refreshTokenExpiry: 604800, // 7 days in seconds
};

// Log on startup - CRITICAL for debugging
console.log('🔐 JWT CONFIG LOADED:');
console.log('   Secret value:', process.env.JWT_SECRET ? `✓ [${process.env.JWT_SECRET.substring(0, 20)}...]` : '✗ USING DEFAULT');
console.log('   Refresh Secret value:', process.env.JWT_REFRESH_SECRET ? `✓ [${process.env.JWT_REFRESH_SECRET.substring(0, 20)}...]` : '✗ USING DEFAULT');
console.log('   JWT Secret being used:', jwtConfig.secret.substring(0, 20) + '...');
