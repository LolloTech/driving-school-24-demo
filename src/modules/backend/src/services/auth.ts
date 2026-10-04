import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { dirname } from 'node:path';
import { hash } from '@node-rs/argon2';
import { parse, stringify } from 'yaml';
import { randomUUID } from 'node:crypto';
import { AppError, requireAdmin, type Actor, type Person } from '../entities.js';
import type { PersonRepository } from '../repositories.js';
export interface IdentityDirectory {
  provision(person: Person, password: string, groups: string[]): Promise<void>;
  remove(username: string): Promise<void>;
}
export class FileIdentityDirectory implements IdentityDirectory {
  private tail = Promise.resolve();
  constructor(private path: string) {}
  private mutate(work: (doc: { users: Record<string, unknown> }) => Promise<void>) {
    const result = this.tail.then(async () => {
      await mkdir(dirname(this.path), { recursive: true });
      let text = 'users: {}';
      try {
        text = await readFile(this.path, 'utf8');
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
      }
      const doc = parse(text) as { users: Record<string, unknown> };
      doc.users ??= {};
      await work(doc);
      const temp = `${this.path}.${randomUUID()}.tmp`;
      await writeFile(temp, stringify(doc), { mode: 0o600 });
      await rename(temp, this.path);
    });
    this.tail = result.catch(() => {});
    return result;
  }
  provision(p: Person, password: string, groups: string[]) {
    return this.mutate(async (doc) => {
      if (doc.users[p.username]) throw new AppError(409, 'Username already exists');
      if (Object.values(doc.users).some((u) => (u as { email?: string }).email === p.email))
        throw new AppError(409, 'Email already exists');
      doc.users[p.username] = {
        displayname: p.name,
        email: p.email,
        groups,
        password: await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 }),
      };
    });
  }
  remove(username: string) {
    return this.mutate(async (doc) => {
      delete doc.users[username];
    });
  }
  setPassword(username: string, password: string) {
    return this.mutate(async (doc) => {
      const user = doc.users[username] as Record<string, unknown> | undefined;
      if (!user) throw new AppError(404, `Identity ${username} does not exist`);
      user.password = await hash(password, {
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      });
    });
  }
}
export interface AuthenticationGateway {
  verify(cookie: string): Promise<Actor>;
  login(username: string, password: string): Promise<{ cookies: string[] }>;
  logout(cookie: string): Promise<{ cookies: string[] }>;
  healthy(): Promise<boolean>;
}
export class AutheliaGateway implements AuthenticationGateway {
  constructor(
    private base: string,
    private origin: string,
    private hostOnlyCookies = false,
    private appBasePath = '',
  ) {}
  private cookies(headers: Headers) {
    const cookies = headers.getSetCookie();
    return this.hostOnlyCookies
      ? cookies.map((cookie) => cookie.replace(/;\s*domain=[^;]+/i, ''))
      : cookies;
  }
  private headers(cookie = '') {
    const url = new URL(this.origin);
    return {
      cookie: cookie,
      'x-forwarded-proto': url.protocol.slice(0, -1),
      'x-forwarded-host': url.host,
      'x-forwarded-for': '127.0.0.1',
      'x-forwarded-uri': `${this.appBasePath}/api/auth/me`,
      'x-forwarded-method': 'GET',
      'x-original-url': `${this.origin}${this.appBasePath}/api/auth/me`,
    };
  }
  async verify(cookie: string) {
    if (!cookie) throw new AppError(401, 'Please log in');
    let r: Response;
    try {
      r = await fetch(`${this.base}/api/authz/forward-auth`, {
        headers: this.headers(cookie),
        redirect: 'manual',
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      throw new AppError(503, 'Authentication service unavailable');
    }
    const username = r.headers.get('remote-user');
    if (r.status !== 200 || !username) throw new AppError(401, 'Please log in');
    return {
      username,
      groups: (r.headers.get('remote-groups') ?? '')
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
    };
  }
  async login(username: string, password: string) {
    let r: Response;
    try {
      r = await fetch(`${this.base}/api/firstfactor`, {
        method: 'POST',
        headers: { ...this.headers(), 'content-type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          keepMeLoggedIn: false,
          targetURL: `${this.origin}${this.appBasePath}/backoffice`,
        }),
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      throw new AppError(503, 'Authentication service unavailable');
    }
    if (!r.ok) throw new AppError(r.status === 401 ? 401 : 502, 'Login failed');
    return { cookies: this.cookies(r.headers) };
  }
  async logout(cookie: string) {
    const r = await fetch(`${this.base}/api/logout`, {
      method: 'POST',
      headers: this.headers(cookie),
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) throw new AppError(503, 'Logout failed');
    return { cookies: this.cookies(r.headers) };
  }
  async healthy() {
    try {
      return (await fetch(`${this.base}/api/health`, { signal: AbortSignal.timeout(2000) })).ok;
    } catch {
      return false;
    }
  }
}
export class AuthService {
  constructor(
    private people: PersonRepository,
    private directory: IdentityDirectory,
    public gateway: AuthenticationGateway,
  ) {}
  async register(
    input: { username: string; name: string; email: string; password: string },
    groups = ['students'],
  ) {
    if (
      !input ||
      typeof input.username !== 'string' ||
      !/^[a-z][a-z0-9_]{2,31}$/.test(input.username) ||
      typeof input.name !== 'string' ||
      input.name.trim().length < 1 ||
      input.name.length > 100 ||
      typeof input.email !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) ||
      input.email.length > 254 ||
      typeof input.password !== 'string' ||
      input.password.length < 12 ||
      input.password.length > 128
    )
      throw new AppError(
        400,
        'Use a valid username, name, email and password of 12–128 characters',
      );
    if (await this.people.findUsername(input.username))
      throw new AppError(409, 'Username already exists');
    const person: Person = {
      id: randomUUID(),
      username: input.username,
      name: input.name.trim(),
      email: input.email.toLowerCase(),
      createdAt: new Date().toISOString(),
    };
    await this.directory.provision(person, input.password, groups);
    try {
      return await this.people.create(person);
    } catch (e) {
      await this.directory.remove(person.username);
      throw e;
    }
  }
  async me(cookie: string) {
    const actor = await this.gateway.verify(cookie);
    const person = await this.people.findUsername(actor.username);
    if (!person) throw new AppError(403, 'Account missing from registry');
    return { actor, person };
  }
  async remove(id: string, actor: Actor) {
    requireAdmin(actor);
    const person = await this.people.get(id);
    if (!person) throw new AppError(404, 'Record not found');
    if (person.username === actor.username)
      throw new AppError(409, 'Cannot delete your own account');
    await this.people.remove(id);
    try {
      await this.directory.remove(person.username);
    } catch (error) {
      await this.people.create(person);
      throw error;
    }
  }
  async login(input: { username: string; password: string }) {
    if (
      typeof input?.username !== 'string' ||
      typeof input?.password !== 'string' ||
      input.password.length > 128
    )
      throw new AppError(400, 'Username and password required');
    return this.gateway.login(input.username, input.password);
  }
  logout(cookie: string) {
    return this.gateway.logout(cookie);
  }
}
