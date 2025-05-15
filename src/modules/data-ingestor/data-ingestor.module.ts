import { UnifiedData, UnifiedDataSchema } from './models/unified-data.schema';

import { DataIngestorController } from './controllers/data-ingestor.controller';
import { DataIngestorService } from './services/data-ingestor.service';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { S3Service } from './services/s3.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UnifiedData.name, schema: UnifiedDataSchema },
    ]),
  ],
  controllers: [DataIngestorController],
  providers: [DataIngestorService, S3Service],
  exports: [DataIngestorService],
})
export class DataIngestorModule {} 