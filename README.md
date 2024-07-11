# Talk-Together Server
Our server backend is built using NestJS, a progressive Node.js framework that leverages TypeScript, offering a modular architecture and strong typing for enhanced scalability and maintainability. The backend is integrated with MongoDB, providing a powerful and flexible NoSQL database solution to handle user data and chat history efficiently. For optimizing performance, we implement Redis for caching, ensuring quick data retrieval and reducing the load on the database. This setup supports real-time chat and call functionalities, delivering a smooth and responsive user experience. The combination of NestJS, MongoDB, and Redis ensures a robust and efficient backend capable of supporting high-concurrency, real-time interactions in our chat and call application.

## Swagger: http://localhost:port/api

## Env Property

|PORT=
|MONGODB_URL=
|
|CLOUD_NAME=
|API_KEY=
|API_SECRET=
|
|EMAIL_USER=@gmail.com
|EMAIL_PASSWORD=
|
#setup jwt
|JWT_ACCESS_TOKEN=
|JWT_ACCESS_EXPIRED=1d
|
|EXPRESS_SESSION_COOKIE=1h
|
#setup session
|EXPRESS_SESSION_SECRET=
|
|REDIS_URL=
|REDIS_HOST=
|REDIS_PORT=
|REDIS_TTL=1d
|REDIS_PASSWORD=
