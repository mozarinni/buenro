import { IsNumberString, IsOptional } from 'class-validator';

export class QueryDataDto {
  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  // Additional parameters will be dynamically handled
  [key: string]: any;
} 