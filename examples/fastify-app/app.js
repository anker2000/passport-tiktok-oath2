import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import fastifyPassport from '@fastify/passport';
import { Strategy as TikTokStrategy } from 'passport-tiktok-oauth2';

const fastify = Fastify({ logger: true });

// --- Session + cookie ---
await fastify.register(fastifyCookie);
await fastify.register(fastifySession, {
  secret: 'demo-secret-demo-secret-demo-secret',
  cookie: { secure: false }, // set true behind HTTPS
});

// --- Passport ---
await fastify.register(fastifyPassport.initialize());
await fastify.register(fastifyPassport.secureSession());

// Serializers
fastifyPassport.registerUserSerializer(async (user) => user.id);
fastifyPassport.registerUserDeserializer(async (id) => ({ id }));

// TikTok Strategy
fastifyPassport.use(
  'tiktok',
  new TikTokStrategy(
    {
      clientID: process.env.TIKTOK_CLIENT_ID,
      clientSecret: process.env.TIKTOK_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/tiktok/callback',
      scope: ['user.info.basic'],
      usePKCE: true
    },
    (accessToken, refreshToken, profile, done) => {
      // Your user lookup/upsert here
      return done(null, profile);
    }
  )
);

// Routes
fastify.get('/', async (req, reply) => {
  return reply.type('text/html').send(`
    <a href="/auth/tiktok">Login with TikTok</a>
  `);
});

fastify.get(
  '/auth/tiktok',
  {
    preValidation: fastifyPassport.authenticate('tiktok')
  },
  async (req, reply) => reply.send()
);

fastify.get(
  '/auth/tiktok/callback',
  {
    preValidation: fastifyPassport.authenticate('tiktok', {
      failureRedirect: '/'
    })
  },
  async (req, reply) => {
    // Success
    return reply.redirect('/profile');
  }
);

fastify.get('/profile', async (req, reply) => {
  if (!req.user) {
    return reply.redirect('/');
  }
  return reply.send({
    user: req.user
  });
});

fastify.listen({ port: 3000 }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log('Demo app on', address);
});