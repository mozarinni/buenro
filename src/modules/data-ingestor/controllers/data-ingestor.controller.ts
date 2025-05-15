import { Controller, Get, Post, Query, Param, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { DataIngestorService } from '../services/data-ingestor.service';

@Controller('api/data')
export class DataIngestorController {
  private readonly logger = new Logger(DataIngestorController.name);

  constructor(private readonly dataIngestorService: DataIngestorService) {}

  /**
   * Get data with filtering capabilities on any attribute
   * Supports pagination via page and limit parameters
   */
  @Get()
  async getData(@Query() query: Record<string, any>) {
    try {
      // Extract pagination parameters
      const page = query.page ? parseInt(query.page, 10) : 1;
      const limit = query.limit ? parseInt(query.limit, 10) : 10;
      
      // Remove pagination parameters from filters
      const filters = { ...query };
      delete filters.page;
      delete filters.limit;
      
      // Process range filters
      this.processRangeFilters(filters);
      
      // Query data with filters
      const result = await this.dataIngestorService.queryData(filters, page, limit);
      
      return {
        data: result.data,
        meta: {
          total: result.total,
          page,
          limit,
          pages: Math.ceil(result.total / limit),
        },
      };
    } catch (error) {
      this.logger.error('Failed to get data', error);
      throw new HttpException(
        'An error occurred while fetching data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Manually trigger data ingestion from a specific source
   */
  @Post('ingest/:sourceId')
  async ingestData(@Param('sourceId') sourceId: string) {
    try {
      const count = await this.dataIngestorService.ingestDataFromSource(sourceId);
      
      return {
        success: true,
        sourceId,
        count,
      };
    } catch (error) {
      this.logger.error(`Failed to ingest data from source ${sourceId}`, error);
      throw new HttpException(
        'An error occurred while ingesting data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Manually trigger data ingestion from all sources
   */
  @Post('ingest')
  async ingestAllData() {
    try {
      const results = await this.dataIngestorService.ingestDataFromAllSources();
      
      let totalCount = 0;
      Object.values(results).forEach((count) => {
        totalCount += count;
      });
      
      return {
        success: true,
        results,
        totalCount,
      };
    } catch (error) {
      this.logger.error('Failed to ingest data from all sources', error);
      throw new HttpException(
        'An error occurred while ingesting data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private processRangeFilters(filters: Record<string, any>): void {
    // Handle price_min and price_max type filters
    for (const key of Object.keys(filters)) {
      if (key.endsWith('_min') || key.endsWith('_max')) {
        const baseKey = key.replace(/_min$|_max$/, '');
        const isMin = key.endsWith('_min');
        
        if (!filters[baseKey]) {
          filters[baseKey] = {};
        } else if (typeof filters[baseKey] !== 'object') {
          // Convert to object if it's not already
          const oldValue = filters[baseKey];
          filters[baseKey] = { equals: oldValue };
        }
        
        if (isMin) {
          filters[baseKey].min = parseFloat(filters[key]);
        } else {
          filters[baseKey].max = parseFloat(filters[key]);
        }
        
        delete filters[key];
      }
    }
  }
} 