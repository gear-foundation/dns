import { Injectable, Logger } from '@nestjs/common';

export interface RequestAnalytics {
  ip: string;
  userAgent: string;
  endpoint: string;
  method: string;
  timestamp: Date;
  responseTime: number;
  statusCode: number;
  referer?: string;
}

export interface IpStatistics {
  ip: string;
  totalRequests: number;
  uniqueEndpoints: Set<string>;
  userAgents: Set<string>;
  firstSeen: Date;
  lastSeen: Date;
  averageResponseTime: number;
  errorCount: number;
  successCount: number;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger('Analytics');
  private readonly requests: RequestAnalytics[] = [];
  private readonly ipStats = new Map<string, IpStatistics>();
  
  // Максимальное количество запросов в памяти (для предотвращения утечек памяти)
  private readonly maxRequestsInMemory = 10000;

  recordRequest(analytics: RequestAnalytics): void {
    // Добавляем запрос в историю
    this.requests.push(analytics);
    
    // Ограничиваем размер массива
    if (this.requests.length > this.maxRequestsInMemory) {
      this.requests.shift(); // Удаляем самый старый запрос
    }

    // Обновляем статистику по IP
    this.updateIpStatistics(analytics);

    // Проверяем на подозрительную активность
    this.analyzeActivity(analytics);
  }

  private updateIpStatistics(analytics: RequestAnalytics): void {
    const { ip, userAgent, endpoint, responseTime, statusCode, timestamp } = analytics;
    
    let stats = this.ipStats.get(ip);
    
    if (!stats) {
      stats = {
        ip,
        totalRequests: 0,
        uniqueEndpoints: new Set(),
        userAgents: new Set(),
        firstSeen: timestamp,
        lastSeen: timestamp,
        averageResponseTime: 0,
        errorCount: 0,
        successCount: 0
      };
      this.ipStats.set(ip, stats);
    }

    // Обновляем статистику
    stats.totalRequests++;
    stats.uniqueEndpoints.add(endpoint);
    stats.userAgents.add(userAgent);
    stats.lastSeen = timestamp;
    
    // Обновляем среднее время ответа
    stats.averageResponseTime = (stats.averageResponseTime * (stats.totalRequests - 1) + responseTime) / stats.totalRequests;
    
    // Считаем ошибки и успешные запросы
    if (statusCode >= 400) {
      stats.errorCount++;
    } else {
      stats.successCount++;
    }
  }

  private analyzeActivity(analytics: RequestAnalytics): void {
    const { ip, endpoint, userAgent } = analytics;
    const stats = this.ipStats.get(ip);
    
    if (!stats) return;

    // Анализ частоты запросов
    const timeWindow = 5 * 60 * 1000; // 5 минут
    const recentRequests = this.requests.filter(
      req => req.ip === ip && 
      Date.now() - req.timestamp.getTime() < timeWindow
    );

    // Высокая частота запросов
    if (recentRequests.length > 300) { // Более 300 запросов за 5 минут
      this.logger.warn(
        `[RATE_LIMIT_WARNING] IP: ${ip} made ${recentRequests.length} requests in last 5 minutes | Endpoint: ${endpoint}`
      );
    }

    // Подозрительные User-Agent
    const suspiciousUserAgents = ['bot', 'crawler', 'spider', 'scraper', 'curl', 'wget'];
    const isSuspiciousUA = suspiciousUserAgents.some(suspicious => 
      userAgent.toLowerCase().includes(suspicious)
    );
    
    if (isSuspiciousUA && stats.totalRequests === 1) {
      this.logger.warn(
        `[SUSPICIOUS_USER_AGENT] IP: ${ip} | User-Agent: ${userAgent} | Endpoint: ${endpoint}`
      );
    }

    // Сканирование эндпоинтов (обращение к большому количеству разных эндпоинтов)
    if (stats.uniqueEndpoints.size > 10 && stats.totalRequests < 50) {
      this.logger.warn(
        `[ENDPOINT_SCANNING] IP: ${ip} accessed ${stats.uniqueEndpoints.size} unique endpoints in ${stats.totalRequests} requests`
      );
    }

    // Логируем топ активных IP каждые 1000 запросов
    if (this.requests.length % 1000 === 0) {
      this.logTopActiveIPs();
    }
  }

  private logTopActiveIPs(): void {
    const sortedIPs = Array.from(this.ipStats.entries())
      .sort(([, a], [, b]) => b.totalRequests - a.totalRequests)
      .slice(0, 10);

    this.logger.log('[TOP_ACTIVE_IPS] Top 10 most active IPs:');
    sortedIPs.forEach(([ip, stats], index) => {
      this.logger.log(
        `  ${index + 1}. IP: ${ip} | Requests: ${stats.totalRequests} | Endpoints: ${stats.uniqueEndpoints.size} | Avg Response: ${stats.averageResponseTime.toFixed(2)}ms | Error Rate: ${((stats.errorCount / stats.totalRequests) * 100).toFixed(1)}%`
      );
    });
  }

  // Публичные методы для получения статистики
  getTopIPs(limit: number = 10): Array<[string, IpStatistics]> {
    return Array.from(this.ipStats.entries())
      .sort(([, a], [, b]) => b.totalRequests - a.totalRequests)
      .slice(0, limit);
  }

  getIpStatistics(ip: string): IpStatistics | undefined {
    return this.ipStats.get(ip);
  }

  getTotalRequests(): number {
    return this.requests.length;
  }

  getUniqueIPs(): number {
    return this.ipStats.size;
  }

  getRecentRequests(minutes: number = 60): RequestAnalytics[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.requests.filter(req => req.timestamp.getTime() > cutoff);
  }

  // Очистка старых данных
  cleanup(olderThanHours: number = 24): void {
    const cutoff = Date.now() - (olderThanHours * 60 * 60 * 1000);
    
    // Очищаем старые запросы
    const initialLength = this.requests.length;
    for (let i = this.requests.length - 1; i >= 0; i--) {
      if (this.requests[i].timestamp.getTime() < cutoff) {
        this.requests.splice(i, 1);
      }
    }
    
    // Очищаем неактивные IP
    for (const [ip, stats] of this.ipStats.entries()) {
      if (stats.lastSeen.getTime() < cutoff) {
        this.ipStats.delete(ip);
      }
    }
    
    this.logger.log(
      `[CLEANUP] Removed ${initialLength - this.requests.length} old requests and cleaned inactive IPs`
    );
  }
}
