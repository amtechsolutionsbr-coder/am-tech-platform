import { createRemoteJWKSet, jwtVerify } from 'jose';
let cachedUrl, jwks;
export async function authenticate(request, { base = process.env.SUPABASE_URL, keyResolver } = {}) {
  const auth = request.headers.authorization || '';
  const match = /^Bearer (\S+)$/.exec(auth);
  if (!match) return null;
  if (!base || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(base)) throw new Error('SUPABASE_URL inválida');
  if (cachedUrl !== base) {
    cachedUrl = base;
    jwks = createRemoteJWKSet(new URL(base + '/auth/v1/.well-known/jwks.json'));
  }
  const { payload } = await jwtVerify(match[1], keyResolver || jwks, {
    issuer: base + '/auth/v1',
    audience: process.env.SUPABASE_JWT_AUDIENCE || 'authenticated',
    algorithms: ['RS256', 'ES256'],
    requiredClaims: ['sub','exp']
  });
  if (payload.role !== 'authenticated' || typeof payload.sub !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.sub)) return null;
  return payload.sub;
}
