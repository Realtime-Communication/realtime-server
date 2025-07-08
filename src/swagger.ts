import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
import { LoginRequest } from './auth/dto/login.dto';
import { CreateUserDto } from './users/dto/create-user.dto';
import { UpdateUserDto } from './users/dto/update-user.dto';
import { ChangePasswordDto } from './users/dto/change-password.dto';
import { AddFriendDto } from './friends/dto/create-friend.dto';
import { UpdateFriendDto } from './friends/dto/update-friend.dto';
import { AuthResponseDto } from './auth/dto/auth-response.dto';
import { CreateMessageDto, UpdateMessageDto } from './chat/dto/message.dto';

export function setupSwagger(app: INestApplication) {
  // Enable CORS for Swagger UI
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Set global prefix
  app.setGlobalPrefix('api');
  const config = new DocumentBuilder()
    .setTitle('Chat-Chit API')
    .setDescription('Real-time chat application API documentation')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  // Create Swagger document with all the DTOs that should be included
  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [
      // Auth DTOs
      LoginRequest,
      AuthResponseDto,
      
      // User DTOs
      CreateUserDto,
      UpdateUserDto,
      ChangePasswordDto,
      
      // Chat DTOs
      CreateMessageDto,
      UpdateMessageDto,
      
      // Friend DTOs
      AddFriendDto,
      UpdateFriendDto,
      
      // Add any additional common DTOs here
    ],
  });

  // Configure Swagger UI options
  const swaggerUiOptions = {
    explorer: true,
    customSiteTitle: 'Chat-Chit API Documentation',
    swaggerOptions: {
      docExpansion: 'list',
      filter: true,
      showRequestDuration: true,
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'method',
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
      defaultModelRendering: 'model',
      displayRequestDuration: true,
      showCommonExtensions: true,
      showExtensions: true,
    },
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 20px 0 }
      .swagger-ui .markdown p { margin: 0.5em 0 }
      .swagger-ui .opblock-tag { font-size: 16px; margin: 0 0 5px 0; }
      .swagger-ui .opblock { margin: 0 0 15px 0; border-radius: 4px; }
      .swagger-ui .opblock .opblock-summary { padding: 8px 15px; }
    `,
  };

  // Setup Swagger UI at /api endpoint
  SwaggerModule.setup('api', app, document, swaggerUiOptions);
}
