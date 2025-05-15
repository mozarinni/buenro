import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { S3Service } from './s3.service';
import { UnifiedData } from '../models/unified-data.schema';
import { DataSource } from '../interfaces/data-source.interface';

@Injectable()
export class DataIngestorService {
  private readonly logger = new Logger(DataIngestorService.name);
  private readonly dataSources: DataSource[] = [];
  
  constructor(
    @InjectModel(UnifiedData.name) private readonly unifiedDataModel: Model<UnifiedData>,
    private readonly s3Service: S3Service,
  ) {
    // Register data sources
    this.registerDataSources();
  }
  
  /**
   * Register available data sources with their transformation functions
   */
  private registerDataSources() {
    // Source 1: Structured data - using direct HTTP URL
    this.dataSources.push({
      id: 'source1',
      name: 'Structured Data',
      url: 'https://buenro-tech-assessment-materials.s3.eu-north-1.amazonaws.com/structured_generated_data.json',
      transformFunction: this.transformSource1Data.bind(this),
    });
    
    // Source 2: Large data - using direct HTTP URL
    this.dataSources.push({
      id: 'source2',
      name: 'Large Data',
      url: 'https://buenro-tech-assessment-materials.s3.eu-north-1.amazonaws.com/large_generated_data.json',
      transformFunction: this.transformSource2Data.bind(this),
    });
    
    // Additional sources can be registered here in the future
  }
  
  /**
   * Transform data from source 1 to unified format
   */
  private transformSource1Data(item: any): any {
    try {
      return {
        sourceId: 'source1',
        id: item.id,
        city: item.address?.city,
        isAvailable: item.isAvailable,
        price: item.priceForNight ? Number(item.priceForNight) : undefined,
        rawData: item,
      };
    } catch (error) {
      this.logger.error('Error transforming source1 data');
      throw error;
    }
  }
  
  /**
   * Transform data from source 2 to unified format
   */
  private transformSource2Data(item: any): any {
    try {
      return {
        sourceId: 'source2',
        id: item.id,
        city: item.city,
        isAvailable: item.availability,
        price: item.pricePerNight ? Number(item.pricePerNight) : undefined,
        rawData: item,
      };
    } catch (error) {
      this.logger.error('Error transforming source2 data');
      throw error;
    }
  }
  
  /**
   * Ingest data from a specific source
   */
  async ingestDataFromSource(sourceId: string): Promise<number> {
    try {
      const source = this.dataSources.find(s => s.id === sourceId);
      
      if (!source) {
        throw new Error(`Source with ID ${sourceId} not found`);
      }
      
      this.logger.log(`Starting ingestion for source: ${source.name}`);
      
      let processedCount = 0;
      
      if (source.id === 'source2') {
        // Use streaming for the large dataset
        await this.s3Service.streamJsonFile(source.url, async (item) => {
          const transformedData = source.transformFunction(item);
          await this.saveOrUpdateData(transformedData);
          processedCount++;
        });
      } else {
        // For smaller files, load the entire file
        const data = await this.s3Service.getJsonFile(source.url);
        
        if (Array.isArray(data)) {
          for (const item of data) {
            const transformedData = source.transformFunction(item);
            await this.saveOrUpdateData(transformedData);
            processedCount++;
          }
        } else {
          throw new Error('Expected array of data items');
        }
      }
      
      this.logger.log(`Completed ingestion for source: ${source.name}, processed ${processedCount} items`);
      
      return processedCount;
    } catch (error: any) {
      this.logger.error(`Failed to ingest data from source ${sourceId}: ${error.message || 'Unknown error'}`);
      throw error;
    }
  }
  
  /**
   * Save or update data in the database
   */
  private async saveOrUpdateData(data: any): Promise<UnifiedData> {
    // Use sourceId and id as unique identifiers for upsert
    const filter = {
      sourceId: data.sourceId,
      id: data.id,
    };
    
    return await this.unifiedDataModel.findOneAndUpdate(
      filter,
      data,
      { upsert: true, new: true }
    );
  }
  
  /**
   * Ingest data from all sources
   */
  async ingestDataFromAllSources(): Promise<Record<string, number>> {
    const results: Record<string, number> = {};
    
    for (const source of this.dataSources) {
      try {
        const count = await this.ingestDataFromSource(source.id);
        results[source.id] = count;
      } catch (error) {
        this.logger.error(`Failed to ingest data from source ${source.id}`, error);
        results[source.id] = 0;
      }
    }
    
    return results;
  }
  
  /**
   * Query unified data with filtering
   */
  async queryData(filters: Record<string, any> = {}, page = 1, limit = 10): Promise<{ data: UnifiedData[], total: number }> {
    const query = this.buildFilterQuery(filters);
    
    const [data, total] = await Promise.all([
      this.unifiedDataModel.find(query)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.unifiedDataModel.countDocuments(query).exec(),
    ]);
    
    return { data, total };
  }
  
  /**
   * Build MongoDB query from filter parameters
   */
  private buildFilterQuery(filters: Record<string, any>): Record<string, any> {
    const query: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === null || value === '') {
        continue;
      }
      
      if (typeof value === 'string') {
        query[key] = { $regex: value, $options: 'i' };
      } else if (typeof value === 'object' && ('min' in value || 'max' in value)) {
        query[key] = {};
        
        if ('min' in value) {
          query[key].$gte = Number(value.min);
        }
        
        if ('max' in value) {
          query[key].$lte = Number(value.max);
        }
      } else {
        query[key] = value;
      }
    }
    
    return query;
  }
} 