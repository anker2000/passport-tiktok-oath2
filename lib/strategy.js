const util = require('util');
const crypto = require('crypto');
const OAuth2Strategy = require('passport-oauth2').Strategy;

const TIKTOK_AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const TIKTOK_TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
const TIKTOK_PROFILE_URL = 'https://open.tiktokapis.com/v2/user/info/';

function base64UrlEncode(buffer) {
  return buffer
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function generateCodeVerifier() {
  // 32 bytes → 43 char URL-safe string
  return base64UrlEncode(crypto.randomBytes(32));
}

function generateCodeChallenge(verifier) {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return base64UrlEncode(hash);
}

/**
 * TikTok OAuth2 Strategy with optional PKCE support
 */
function TikTokStrategy(options, verify) {
  options = options || {};

  const authURL = options.authorizationURL || TIKTOK_AUTH_URL;
  const tokenURL = options.tokenURL || TIKTOK_TOKEN_URL;

  this._usePKCE = options.usePKCE === true;
  this._codeChallengeMethod = options.codeChallengeMethod || 'S256';

  OAuth2Strategy.call(this, {
    authorizationURL: authURL,
    tokenURL,
    clientID: options.clientID,
    clientSecret: options.clientSecret,
    callbackURL: options.callbackURL,
    passReqToCallback: options.passReqToCallback
  }, verify);

  this.name = 'tiktok';
  this._profileURL = options.profileURL || TIKTOK_PROFILE_URL;
}

util.inherits(TikTokStrategy, OAuth2Strategy);

/**
 * Add PKCE parameters if enabled
 */
TikTokStrategy.prototype.authorizationParams = function (options) {
  const params = {};

  if (this._usePKCE) {
    if (!options || !options.session) {
      // If you need session for PKCE, you can enforce it here
      // but we keep it soft, just log a warning.
      // eslint-disable-next-line no-console
      console.warn('[passport-tiktok-oauth2] PKCE enabled but no session passed via options.session');
    }

    const verifier = generateCodeVerifier();
    const challenge = generateCodeChallenge(verifier);

    // Store the verifier somewhere – typically req.session
    // passport-oauth2 doesn't give us req directly here, so we depend on
    // the caller passing `session` in options (e.g. Fastify/Express route).
    if (options && options.session) {
      options.session.tiktokCodeVerifier = verifier;
    }

    params.code_challenge = challenge;
    params.code_challenge_method = this._codeChallengeMethod;
  }

  return params;
};

/**
 * Exchange authorization code for tokens with PKCE support.
 * For TikTok, if PKCE is used, we must include the code_verifier.
 */
TikTokStrategy.prototype.tokenParams = function (options) {
  const params = {};

  if (this._usePKCE && options && options.session && options.session.tiktokCodeVerifier) {
    params.code_verifier = options.session.tiktokCodeVerifier;
  }

  return params;
};

/**
 * Load TikTok user profile
 */
TikTokStrategy.prototype.userProfile = function (accessToken, done) {
  const url = this._profileURL;

  this._oauth2.get(url, accessToken, (err, body) => {
    if (err) {
      return done(new Error('Failed to fetch TikTok profile: ' + err.message));
    }

    try {
      const json = JSON.parse(body);

      const user = json.data?.user || {};
      const profile = {
        provider: 'tiktok',
        id: user.open_id || user.union_id,
        displayName: user.display_name,
        username: user.display_name,
        profileImage: user.avatar_url,
        _raw: body,
        _json: json
      };

      return done(null, profile);
    } catch (e) {
      return done(e);
    }
  });
};

module.exports = {
  Strategy: TikTokStrategy
};