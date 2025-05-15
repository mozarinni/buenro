import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { Document } from 'mongoose';

@Schema({ 
  timestamps: true,
  strict: false,
  collection: 'unified_data' 
})
export class UnifiedData extends Document {
  @Prop({ required: true, index: true })
  sourceId: string;

  @Prop({ index: true, sparse: true })
  id?: string;

  @Prop({ sparse: true })
  city?: string;

  @Prop({ sparse: true })
  isAvailable?: boolean;

  @Prop({ sparse: true })
  price?: number;

  // Raw data storage
  @Prop({ type: Object })
  rawData: Record<string, any>;
}

export const UnifiedDataSchema = SchemaFactory.createForClass(UnifiedData); 