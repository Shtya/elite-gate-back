import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import { join } from 'path';
import rateLimit from 'express-rate-limit';

const server = express();
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    statusCode: 429,
    message: 'Too many requests, please try again later.',
  },
});

server.use(limiter);

export async function createApp() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, new ExpressAdapter(server));
  app.useStaticAssets(join(__dirname, '..', '..', 'uploads'), {
    prefix: '/uploads/',
  });
  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  await app.init();
  return server;
}

// For Vercel serverless
let cachedServer: express.Express;
export default async function handler(req: express.Request, res: express.Response) {
  if (!cachedServer) {
    cachedServer = await createApp();
  }
  return cachedServer(req, res);
}

// For local development
if (process.env.NODE_ENV === 'development') {
  createApp().then(app => {
    app.listen(process.env.PORT || 3000, () => {
      console.log(`🚀 Server running on http://localhost:${process.env.PORT || 3000}`);
    });
  });
}
