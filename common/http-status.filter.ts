import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(UnauthorizedException)
export class HttpStatusFilter implements ExceptionFilter {
  catch(exception: UnauthorizedException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message = 'You are not authorized';
    if (typeof exceptionResponse === 'object' && exceptionResponse !== null && 'message' in exceptionResponse) {
       message = (exceptionResponse as any).message;
    } else if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
    }

    response.status(status).json({
      statusCode: status,
      status: 'UNAUTHORIZED',
      message: 'يرجي تسجيل الدخول لحجز موعد',
    });
  }
}
