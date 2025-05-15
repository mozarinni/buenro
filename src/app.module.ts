import { ConfigModule, ConfigService } from '@nestjs/config';

import { DataIngestorModule } from './modules/data-ingestor/data-ingestor.module';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI', 'mongodb://localhost:27017/buenro-data'),
      }),
    }),
    DataIngestorModule,
  ],
})
export class AppModule {} 