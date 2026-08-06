import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return {
      message: 'Hiking & Trail Management API',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        users: '/users',
        auth: '/auth',
        trails: '/trails',
      },
      docs: 'API endpoints are available at the paths above',
    } as any;
  }
}
