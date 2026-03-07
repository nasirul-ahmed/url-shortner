import { Service } from 'typedi';

@Service()
export class UrlShortenerService {
  public async createShortUrl(input: any) {}
  public async resolveUrl(...input: any[]): Promise<any> {}
}
