import type { Request } from 'express';
import type { Strategy as PassportStrategy } from 'passport';
import type { Profile as PassportProfile } from 'passport';

export interface TikTokProfile extends PassportProfile {
  id: string;
  username?: string;
  displayName?: string;
  profileImage?: string;
  _raw?: string;
  _json?: any;
}

export interface TikTokStrategyOptions {
  clientID: string;
  clientSecret: string;
  callbackURL: string;
  scope?: string[];
  authorizationURL?: string;
  tokenURL?: string;
  profileURL?: string;
  passReqToCallback?: boolean;
  // PKCE options
  usePKCE?: boolean;
  codeChallengeMethod?: 'S256';
}

export type TikTokVerifyFn =
  | ((
      accessToken: string,
      refreshToken: string | undefined,
      profile: TikTokProfile,
      done: (err: any, user?: any) => void
    ) => void)
  | ((
      req: Request,
      accessToken: string,
      refreshToken: string | undefined,
      profile: TikTokProfile,
      done: (err: any, user?: any) => void
    ) => void);

export class Strategy extends (PassportStrategy as { new (...args: any[]): any }) {
  constructor(options: TikTokStrategyOptions, verify: TikTokVerifyFn);
  name: 'tiktok';
  userProfile(accessToken: string, done: (err?: Error | null, profile?: TikTokProfile) => void): void;
}

export { Strategy as TikTokStrategy };