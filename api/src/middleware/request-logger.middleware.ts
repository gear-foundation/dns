import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analytics.service';

interface RequestStats {
  count: number;
  lastRequest: Date;
  firstRequest: Date;
}

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('RequestLogger');
  private readonly requestStats = new Map<string, RequestStats>();

  constructor(private readonly analyticsService: AnalyticsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    
    // Получаем реальный IP адрес (учитываем прокси и load balancer)
    const clientIp = this.getClientIp(req);
    const userAgent = req.get('User-Agent') || 'Unknown';
    const method = req.method;
    const url = req.originalUrl;
    const referer = req.get('Referer') || 'Direct';
    
    // Обновляем статистику для IP
    this.updateRequestStats(clientIp);
    
    // Логируем входящий запрос с дополнительной информацией
    this.logger.log(
      `[INCOMING] ${method} ${url} | IP: ${clientIp} | User-Agent: ${userAgent} | Referer: ${referer} | Requests from IP: ${this.requestStats.get(clientIp)?.count || 1}`
    );

    // Перехватываем завершение ответа
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;
      
      // Записываем в аналитику
      this.analyticsService.recordRequest({
        ip: clientIp,
        userAgent,
        endpoint: url,
        method,
        timestamp: new Date(),
        responseTime: duration,
        statusCode,
        referer: referer !== 'Direct' ? referer : undefined
      });
      
      this.logger.log(
        `[RESPONSE] ${method} ${url} | Status: ${statusCode} | Duration: ${duration}ms | IP: ${clientIp}`
      );

      // Логируем подозрительную активность
      this.checkSuspiciousActivity(clientIp, method, url);
    });

    next();
  }

  private getClientIp(req: Request): string {
    // Проверяем различные заголовки для получения реального IP
    const xForwardedFor = req.get('X-Forwarded-For');
    const xRealIp = req.get('X-Real-IP');
    const cfConnectingIp = req.get('CF-Connecting-IP'); // Cloudflare
    
    if (xForwardedFor) {
      // X-Forwarded-For может содержать несколько IP через запятую
      return xForwardedFor.split(',')[0].trim();
    }
    
    if (xRealIp) {
      return xRealIp;
    }
    
    if (cfConnectingIp) {
      return cfConnectingIp;
    }
    
    return req.ip || req.connection.remoteAddress || 'Unknown';
  }

  private updateRequestStats(ip: string): void {
    const now = new Date();
    const stats = this.requestStats.get(ip);
    
    if (stats) {
      stats.count++;
      stats.lastRequest = now;
    } else {
      this.requestStats.set(ip, {
        count: 1,
        firstRequest: now,
        lastRequest: now
      });
    }
  }

  private checkSuspiciousActivity(ip: string, method: string, url: string): void {
    const stats = this.requestStats.get(ip);
    if (!stats) return;

    const timeSinceFirst = Date.now() - stats.firstRequest.getTime();
    const requestsPerMinute = (stats.count * 60000) / timeSinceFirst;

    // Логируем высокую частоту запросов (более 60 запросов в минуту)
    if (requestsPerMinute > 60) {
      this.logger.warn(
        `[HIGH_FREQUENCY] IP: ${ip} | Requests: ${stats.count} | Rate: ${requestsPerMinute.toFixed(2)} req/min | Last: ${method} ${url}`
      );
    }

    // Логируем статистику каждые 100 запросов от одного IP
    if (stats.count % 100 === 0) {
      this.logger.log(
        `[IP_STATS] IP: ${ip} | Total requests: ${stats.count} | First request: ${stats.firstRequest.toISOString()} | Rate: ${requestsPerMinute.toFixed(2)} req/min`
      );
    }
  }

  // Метод для получения статистики (можно использовать для мониторинга)
  getStats(): Map<string, RequestStats> {
    return this.requestStats;
  }

  // Метод для очистки старой статистики (можно вызывать периодически)
  cleanOldStats(olderThanHours: number = 24): void {
    const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
    
    for (const [ip, stats] of this.requestStats.entries()) {
      if (stats.lastRequest.getTime() < cutoffTime) {
        this.requestStats.delete(ip);
        this.logger.log(`[CLEANUP] Removed old stats for IP: ${ip}`);
      }
    }
  }
}
