// shared/services/elasticsearch.ts
import { Client } from '@elastic/elasticsearch';

export class ElasticsearchService {
  private client: Client;
  
  constructor() {
    this.client = new Client({
      node: process.env.ELASTICSEARCH_URL
    });
  }
  
  async index(index: string, document: any): Promise<void> {
    await this.client.index({
      index,
      body: document
    });
  }
  
  async search(index: string, query: any): Promise<any> {
    const response = await this.client.search({
      index,
      body: query
    });
    
    return response.body;
  }
  
  async createIndex(index: string, mappings: any): Promise<void> {
    const exists = await this.client.indices.exists({ index });
    
    if (!exists.body) {
      await this.client.indices.create({
        index,
        body: { mappings }
      });
    }
  }
  
  async bulkIndex(index: string, documents: any[]): Promise<void> {
    const body = documents.flatMap(doc => [
      { index: { _index: index, _id: doc.id } },
      doc
    ]);
    
    await this.client.bulk({ body });
  }
}