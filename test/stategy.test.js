/* eslint-env mocha */
const { expect } = require('chai');
const nock = require('nock');
const { Strategy } = require('../lib/strategy');

describe('TikTok OAuth2 Strategy', () => {
  const strategy = new Strategy(
    {
      clientID: 'CLIENT_ID',
      clientSecret: 'CLIENT_SECRET',
      callbackURL: 'https://example.com/auth/tiktok/callback'
    },
    (accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    }
  );

  it('should be named "tiktok"', () => {
    expect(strategy.name).to.equal('tiktok');
  });

  it('should request user profile', (done) => {
    const mockResponse = {
      data: {
        user: {
          open_id: '123',
          union_id: 'union-123',
          display_name: 'Test User',
          avatar_url: 'https://example.com/avatar.jpg'
        }
      }
    };

    nock('https://open.tiktokapis.com')
      .get(/user\/info/)
      .reply(200, mockResponse);

    strategy.userProfile('ACCESS_TOKEN', (err, profile) => {
      try {
        expect(err).to.be.null;
        expect(profile).to.be.an('object');
        expect(profile.id).to.equal('123');
        expect(profile.displayName).to.equal('Test User');
        expect(profile.profileImage).to.equal('https://example.com/avatar.jpg');
        done();
      } catch (e) {
        done(e);
      }
    });
  });
});