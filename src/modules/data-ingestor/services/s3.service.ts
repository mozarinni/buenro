import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';
import axios from 'axios';
import { chain } from 'stream-chain';
import { parser } from 'stream-json';
import { streamArray } from 'stream-json/streamers/StreamArray';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;

  constructor(private readonly configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION', 'eu-north-1'),
      // credentials: {
      //   accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
      //   secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY')
      // }
    });
  }

  /**
   * Extract bucket and key from a full S3 URL
   */
  private parseS3Url(url: string): { bucket: string; key: string } {
    try {
      const urlObj = new URL(url);
      const hostParts = urlObj.hostname.split('.');
      
      if (hostParts.length < 2) {
        throw new Error(`Invalid S3 URL: ${url}`);
      }
      
      const bucket = hostParts[0];
      const key = urlObj.pathname.substring(1); // remove leading '/'
      
      return { bucket, key };
    } catch (error) {
      this.logger.error(`Failed to parse S3 URL: ${url}`);
      throw error;
    }
  }

  /**
   * Fetch JSON data from S3 using AWS SDK v3 with fallback to HTTP
   */
  async getJsonFile(url: string): Promise<any> {
    try {
      this.logger.log(`Fetching file from S3: ${url}`);
      
      const { bucket, key } = this.parseS3Url(url);
      
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });
      
      const response = await this.s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('S3 object body is empty');
      }
      
      // Convert the S3 object body stream to a string
      const bodyContents = await this.streamToString(response.Body as Readable);
      
      return JSON.parse(bodyContents);
    } catch (error) {
      this.logger.error(`Failed to get JSON file from S3: ${url}`, error);
      
      // Fall back to HTTP if S3 SDK approach fails
      this.logger.log('Falling back to direct HTTP request');
      return this.getJsonFromHttpUrl(url);
    }
  }

  /**
   * Get JSON data from an HTTP URL using Axios
   */
  private async getJsonFromHttpUrl(url: string): Promise<any> {
    try {
      this.logger.log(`Fetching file from HTTP URL: ${url}`);
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch data via HTTP: ${url}`);
      throw error;
    }
  }

  /**
   * Efficiently stream JSON data from S3 with fallback to HTTP
   * For large files, this parses the JSON as a stream to avoid loading the entire file into memory
   */
  async streamJsonFile(url: string, onData: (chunk: any) => Promise<void>): Promise<void> {
    try {
      this.logger.log(`Streaming file from S3: ${url}`);
      
      const { bucket, key } = this.parseS3Url(url);
      
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });
      
      const response = await this.s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('S3 object body is empty');
      }
      
      // Process the stream with stream-json for efficient JSON parsing
      await this.processJsonStream(response.Body as Readable, onData);
    } catch (error) {
      this.logger.error(`Failed to stream JSON file from S3: ${url}`, error);
      
      // Fall back to HTTP if S3 SDK approach fails
      this.logger.log('Falling back to direct HTTP request');
      await this.streamJsonFromHttpUrl(url, onData);
    }
  }

  /**
   * Stream JSON from an HTTP URL using Axios
   */
  private async streamJsonFromHttpUrl(url: string, onData: (chunk: any) => Promise<void>): Promise<void> {
    try {
      this.logger.log(`Streaming file from HTTP URL: ${url}`);
      
      // Fetch the entire JSON file using Axios
      const response = await axios.get(url, {
        responseType: 'json'
      });
      
      const items = response.data;
      
      if (Array.isArray(items)) {
        for (const item of items) {
          await onData(item);
        }
      } else {
        throw new Error('Expected JSON array');
      }
    } catch (error) {
      this.logger.error(`Failed to stream data via HTTP: ${url}`);
      throw error;
    }
  }

  /**
   * Process a JSON stream using stream-json for efficient parsing
   */
  private async processJsonStream(stream: Readable, onData: (chunk: any) => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
      // Create a pipeline for processing the JSON stream
      const pipeline = chain([
        stream,
        parser(),
        streamArray()
      ]);
      
      // Process each item from the JSON array
      pipeline.on('data', async ({ value }) => {
        try {
          // Pause the stream to prevent buffer overflow
          pipeline.pause();
          
          // Process the item
          await onData(value);
          
          // Resume the stream
          pipeline.resume();
        } catch (err) {
          pipeline.destroy(err as Error);
        }
      });
      
      pipeline.on('end', () => {
        resolve();
      });
      
      pipeline.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Convert a readable stream to a string
   */
  private async streamToString(stream: Readable): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      
      stream.on('data', (chunk) => {
        chunks.push(Buffer.from(chunk));
      });
      
      stream.on('end', () => {
        resolve(Buffer.concat(chunks).toString('utf-8'));
      });
      
      stream.on('error', (err) => {
        reject(err);
      });
    });
  }
} 