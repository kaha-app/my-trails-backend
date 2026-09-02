import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwtConfig } from '../../config/jwt.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConfig.secret,
    });
    console.log('✅ JWT Strategy initialized with secret:', jwtConfig.secret !== 'your-secret-key' ? '✓ [SET]' : '✗ [DEFAULT]');
  }

  async validate(payload: any) {
    console.log('✅ JWT Token validated - User ID:', payload.sub);
    return {
      id: BigInt(payload.sub),
      email: payload.email,
      role: payload.role,
    };
  }
}
