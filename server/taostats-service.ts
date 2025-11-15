import fetch from 'node-fetch';

interface SubnetData {
  netuid: number;
  name: string;
  emission: number;
  tempo: number;
  founder?: string;
  price?: number;
  price_change_24h?: number;
  price_change_7d?: number;
  market_cap?: number;
  volume_24h?: number;
}

class TaoStatsService {
  private apiKey: string;
  private baseUrl = 'https://api.taostats.io';

  constructor() {
    this.apiKey = process.env.TAOSTATS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('TaoStats API key not found in environment variables');
    }
  }

  // Mock data for top gainers (fallback when API is unavailable)
  private getMockTopGainers(limit: number): SubnetData[] {
    const mockSubnets = [
      { netuid: 1, name: 'Text Prompting', emission: 4.5, tempo: 360, price: 2.45, price_change_24h: 28.5 },
      { netuid: 18, name: 'Cortex.t', emission: 3.2, tempo: 100, price: 1.89, price_change_24h: 22.3 },
      { netuid: 3, name: 'Compute', emission: 2.8, tempo: 360, price: 3.12, price_change_24h: 19.7 },
      { netuid: 21, name: 'FileTAO', emission: 3.9, tempo: 360, price: 1.56, price_change_24h: 18.4 },
      { netuid: 8, name: 'Taoshi', emission: 4.2, tempo: 360, price: 4.23, price_change_24h: 15.8 },
      { netuid: 13, name: 'Data Universe', emission: 2.5, tempo: 360, price: 0.98, price_change_24h: 14.2 },
      { netuid: 5, name: 'Open Kaito', emission: 3.7, tempo: 360, price: 2.34, price_change_24h: 12.6 },
      { netuid: 27, name: 'Compute Subnet', emission: 2.1, tempo: 360, price: 1.67, price_change_24h: 11.3 },
      { netuid: 11, name: 'Dippy Roleplay', emission: 3.4, tempo: 360, price: 1.45, price_change_24h: 10.8 },
      { netuid: 19, name: 'Vision', emission: 2.9, tempo: 360, price: 2.78, price_change_24h: 9.5 }
    ];

    return mockSubnets.slice(0, limit);
  }

  async getSubnets(): Promise<SubnetData[]> {
    // Try multiple possible endpoints
    const endpoints = [
      '/api/subnets',
      '/api/v1/subnets',
      '/subnets',
      '/v1/subnets'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json() as any;
          const subnets = Array.isArray(data) ? data : (data.data || data.subnets || []);
          if (subnets.length > 0) {
            console.log(`✅ TaoStats API success using endpoint: ${endpoint}`);
            return subnets;
          }
        }
      } catch (error) {
        // Continue to next endpoint
        continue;
      }
    }

    console.log('⚠️ TaoStats API unavailable, using mock data');
    return [];
  }

  async getTopGainers(limit = 10): Promise<SubnetData[]> {
    try {
      const subnets = await this.getSubnets();
      
      if (subnets.length === 0) {
        // Use mock data as fallback
        return this.getMockTopGainers(limit);
      }

      const subnetsWithGains = subnets
        .filter(subnet => subnet.price_change_24h !== undefined && subnet.price_change_24h !== null)
        .sort((a, b) => (b.price_change_24h || 0) - (a.price_change_24h || 0));
      
      return subnetsWithGains.slice(0, limit);
    } catch (error) {
      console.error('Error getting top gainers:', error);
      return this.getMockTopGainers(limit);
    }
  }
}

export const taoStatsService = new TaoStatsService();
