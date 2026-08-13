import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import type { AuthenticatedRequest } from '../decorators';
import { requestContext } from '../request-context';

/**
 * Har bir HTTP so'rov uchun `x-request-id` va tugashda bitta JSON log qatori.
 * Authorization, parol, token va maxfiy body maydonlari yozilmaydi.
 */
@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const req = http.getRequest<AuthenticatedRequest>();
    const res = http.getResponse<Response>();

    const header = req.headers['x-request-id'];
    const fromHeader = typeof header === 'string' ? header.trim() : '';
    const requestId = fromHeader || randomUUID();

    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);

    const started = Date.now();
    const method = req.method;
    const path = (req.originalUrl ?? req.url).split('?')[0];

    return new Observable((subscriber) => {
      requestContext.run({ requestId }, () => {
        next
          .handle()
          .pipe(
            finalize(() => {
              const scope = req.scope;
              const line: Record<string, unknown> = {
                requestId,
                method,
                path,
                statusCode: res.statusCode,
                durationMs: Date.now() - started,
                userId: scope?.userId ?? null,
                tenantId: scope?.tenantId ?? null,
              };
              if (scope?.branchIds?.length) line.branchIds = scope.branchIds;
              this.logger.log(JSON.stringify(line));
            }),
          )
          .subscribe({
            next: (value) => subscriber.next(value),
            error: (err) => subscriber.error(err),
            complete: () => subscriber.complete(),
          });
      });
    });
  }
}
