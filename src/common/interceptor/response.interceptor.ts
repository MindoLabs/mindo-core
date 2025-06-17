import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

interface ApiResponse<T> {
  statusCode: number;
  data: T;
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        data = data || {};
        const statusCode =
          data.statusCode ||
          context.switchToHttp().getResponse().statusCode ||
          200;
        context.switchToHttp().getResponse().statusCode = statusCode;

        // Remove the redundant statusCode from data if it's sent from the controller response
        delete data.statusCode;

        return {
          statusCode,
          data,
        };
      }),
      catchError((error) => {
        if (error instanceof HttpException) {
          return throwError(() => error);
        }

        // For unhandled errors
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const message = error.message || 'Internal Server Error';
        const response = {
          statusCode: status,
          message,
        };
        context.switchToHttp().getResponse().statusCode = status;
        return throwError(() => new HttpException(response, status));
      }),
    );
  }
}
