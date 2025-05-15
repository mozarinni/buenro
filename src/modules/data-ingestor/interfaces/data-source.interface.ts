export interface DataSource {
  id: string;
  name: string;
  url: string;
  transformFunction: (data: any) => any;
} 