import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

interface ErrorBody {
  statusCode: number;
  message: string;
  errors?: { field: string; message: string }[];
  path: string;
  timestamp: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const body = this.buildBody(exception, request.url);

    if (body.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`${request.method} ${request.url}`, exception as Error);
    }

    response.status(body.statusCode).json(body);
  }

  private buildBody(exception: unknown, path: string): ErrorBody {
    const timestamp = new Date().toISOString();

    if (exception instanceof HttpException) {
      const payload = exception.getResponse();
      if (typeof payload === 'object' && payload !== null) {
        const record = payload as Record<string, unknown>;
        const message = record.message;
        return {
          statusCode: exception.getStatus(),
          message: Array.isArray(message)
            ? message.join(', ')
            : String(message ?? exception.message),
          errors: record.errors as ErrorBody['errors'],
          path,
          timestamp,
        };
      }
      return { statusCode: exception.getStatus(), message: String(payload), path, timestamp };
    }

    if (exception instanceof QueryFailedError) {
      return { ...this.mapQueryError(exception), path, timestamp };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Serverda kutilmagan xatolik yuz berdi',
      path,
      timestamp,
    };
  }

  private mapQueryError(
    error: QueryFailedError & { code?: string; detail?: string; constraint?: string },
  ): Pick<ErrorBody, 'statusCode' | 'message' | 'errors'> {
    const code = String(error.driverError && (error.driverError as { code?: string }).code ?? error.code ?? '');

    switch (code) {
      case '23505':
        return {
          statusCode: HttpStatus.CONFLICT,
          message: 'Bu qiymat allaqachon mavjud',
          errors: error.constraint
            ? [{ field: error.constraint, message: 'Takrorlanmas qiymat kerak' }]
            : undefined,
        };
      case '23503':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: "Bog'liq yozuv topilmadi",
        };
      case '23502':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: "Majburiy maydon to'ldirilmagan",
        };
      default:
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: "Ma'lumotlar bazasi so'rovi bajarilmadi",
        };
    }
  }
}
