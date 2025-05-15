export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/buenro-data',
  },
  aws: {
    region: process.env.AWS_REGION || 'eu-north-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  dataSources: {
    source1: {
      url: process.env.SOURCE1_URL || 'https://buenro-tech-assessment-materials.s3.eu-north-1.amazonaws.com/structured_generated_data.json',
      ingestInterval: process.env.SOURCE1_INGEST_INTERVAL || 'EVERY_HOUR',
    },
    source2: {
      url: process.env.SOURCE2_URL || 'https://buenro-tech-assessment-materials.s3.eu-north-1.amazonaws.com/large_generated_data.json',
      ingestInterval: process.env.SOURCE2_INGEST_INTERVAL || 'EVERY_HOUR',
    },
  },
}); 