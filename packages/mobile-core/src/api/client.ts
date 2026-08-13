import { clearTokens, readDemoProfile, readTokens, saveTokens, type StoredTokens } from './session';
import { resolveDemoResponse } from './demo-data';

/**
 * Mobil API mijozi. Access token muddati tugasa avtomatik `refresh` qiladi va
 * so'rovni bir marta qayta yuboradi; refresh ham ishlamasa sessiya tozalanadi.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fields?: Array<{ field: string; message: string }>,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Tarmoq yo'qligi sababli yuzaga kelgan xato — offline navbatga tushadi. */
  get isOffline(): boolean {
    return this.status === 0;
  }
}

export interface ApiClientConfig {
  baseUrl: string;
  /** Sessiya tugaganda ilova login ekraniga qaytarilishi uchun. */
  onSessionExpired?: () => void;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Tokensiz so'rov (login/refresh). */
  anonymous?: boolean;
  signal?: AbortSignal;
  /** Sekin tarmoqda kutish chegarasi (ms). */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT = 15_000;

export class ApiClient {
  private refreshing: Promise<StoredTokens | null> | null = null;

  constructor(private readonly config: ApiClientConfig) {}

  get baseUrl(): string {
    return this.config.baseUrl;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    // Login/refresh kabi anonymous so'rovlar har doim haqiqiy API ga ketadi —
    // aks holda eski demo profil real ma'lumotni bloklab qo'yardi.
    if (!options.anonymous) {
      const demoProfile = await readDemoProfile();
      if (demoProfile) {
        return resolveDemoResponse(path, options.method ?? 'GET', demoProfile) as T;
      }
    }

    const response = await this.send(path, options);

    if (response.status === 401 && !options.anonymous) {
      const refreshed = await this.refreshTokens();
      if (!refreshed) {
        await clearTokens();
        this.config.onSessionExpired?.();
        throw new ApiError('Sessiya tugadi, qaytadan kiring', 401);
      }
      return this.parse<T>(await this.send(path, options));
    }

    return this.parse<T>(response);
  }

  get<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'POST', body });
  }

  patch<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PATCH', body });
  }

  /** Xato bo'lsa sahifa ishlashda davom etishi uchun zaxira qiymat qaytaradi. */
  async safeGet<T>(path: string, fallback: T): Promise<T> {
    try {
      return await this.get<T>(path);
    } catch {
      return fallback;
    }
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const tokens = options.anonymous ? null : await readTokens();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT);

    options.signal?.addEventListener('abort', () => controller.abort());

    try {
      return await fetch(`${this.config.baseUrl}${path}`, {
        method: options.method ?? 'GET',
        signal: controller.signal,
        headers: {
          ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(tokens ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
        },
        ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      });
    } catch (error) {
      // `fetch` faqat tarmoq/abort xatosida throw qiladi — bu offline holat.
      const message =
        error instanceof Error && error.name === 'AbortError'
          ? "Server javob bermadi. Internetni tekshiring."
          : "Internetga ulanish yo'q";
      throw new ApiError(message, 0);
    } finally {
      clearTimeout(timer);
    }
  }

  private async parse<T>(response: Response): Promise<T> {
    const text = await response.text();
    const payload = text ? (JSON.parse(text) as unknown) : null;

    if (!response.ok) {
      const data = (payload ?? {}) as {
        message?: string | string[];
        errors?: Array<{ field: string; message: string }>;
      };
      const message = Array.isArray(data.message)
        ? data.message.join(', ')
        : (data.message ?? 'Server xatosi yuz berdi');
      throw new ApiError(message, response.status, data.errors);
    }

    return payload as T;
  }

  /** Bir vaqtda kelgan bir nechta 401 uchun refresh faqat bir marta bajariladi. */
  private refreshTokens(): Promise<StoredTokens | null> {
    this.refreshing ??= this.doRefresh().finally(() => {
      this.refreshing = null;
    });
    return this.refreshing;
  }

  private async doRefresh(): Promise<StoredTokens | null> {
    const tokens = await readTokens();
    if (!tokens) return null;

    try {
      const response = await this.send('/auth/refresh', {
        method: 'POST',
        anonymous: true,
        body: { refreshToken: tokens.refreshToken },
      });
      if (!response.ok) return null;

      const next = (await response.json()) as StoredTokens;
      if (!next?.accessToken || !next?.refreshToken) return null;

      await saveTokens(next);
      return next;
    } catch {
      return null;
    }
  }
}
