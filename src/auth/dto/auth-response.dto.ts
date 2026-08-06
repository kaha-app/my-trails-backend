export class AuthResponseDto {
  accessToken: string;
  refreshToken?: string;
  user: {
    id: bigint;
    email: string;
    fullName: string;
    role: string;
  };
}
