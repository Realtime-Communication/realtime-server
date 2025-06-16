import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      return response
        .status(exception.getStatus())
        .json(exception.getResponse());
    }

    console.error('Unhandled error:', exception);
    return response.status(400).json({
      message: exception.message,
      error: exception.name,
      timestamp: new Date().toISOString(),
      path: ctx.getRequest().url,
      statusCode: 400,
      // stack: exception.stack,
    });
  }
}
