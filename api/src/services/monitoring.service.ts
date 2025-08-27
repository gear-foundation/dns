import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class MonitoringService implements OnModuleInit {
  private readonly logger = new Logger('Monitoring');

  constructor(private readonly analyticsService: AnalyticsService) {}

  onModuleInit() {
    this.logger.log('Monitoring service initialized');
  }

  // Каждые 15 минут логируем общую статистику
  @Cron('0 */15 * * * *')
  logGeneralStats() {
    const totalRequests = this.analyticsService.getTotalRequests();
    const uniqueIPs = this.analyticsService.getUniqueIPs();
    const recentRequests = this.analyticsService.getRecentRequests(15);
    
    this.logger.log(
      `[STATS] Total requests: ${totalRequests} | Unique IPs: ${uniqueIPs} | Last 15min: ${recentRequests.length} requests`
    );
  }

  // Каждый час логируем топ активных IP
  @Cron(CronExpression.EVERY_HOUR)
  logTopActiveIPs() {
    const topIPs = this.analyticsService.getTopIPs(5);
    
    this.logger.log('[HOURLY_TOP_IPS] Top 5 most active IPs:');
    topIPs.forEach(([ip, stats], index) => {
      this.logger.log(
        `  ${index + 1}. ${ip}: ${stats.totalRequests} requests, ${stats.uniqueEndpoints.size} endpoints, ${stats.averageResponseTime.toFixed(2)}ms avg`
      );
    });
  }

  // Каждые 6 часов очищаем старые данные
  @Cron('0 0 */6 * * *')
  cleanupOldData() {
    this.logger.log('[CLEANUP] Starting cleanup of old analytics data...');
    this.analyticsService.cleanup(24); // Удаляем данные старше 24 часов
    this.logger.log('[CLEANUP] Cleanup completed');
  }

  // Каждые 5 минут проверяем на аномальную активность
  @Cron('0 */5 * * * *')
  checkAnomalousActivity() {
    const recentRequests = this.analyticsService.getRecentRequests(5);
    
    if (recentRequests.length > 1000) {
      this.logger.warn(
        `[ANOMALY_DETECTION] High traffic detected: ${recentRequests.length} requests in last 5 minutes`
      );
    }

    // Проверяем на DDoS-подобную активность
    const ipCounts = new Map<string, number>();
    recentRequests.forEach(req => {
      ipCounts.set(req.ip, (ipCounts.get(req.ip) || 0) + 1);
    });

    const suspiciousIPs = Array.from(ipCounts.entries())
      .filter(([, count]) => count > 100) // Более 100 запросов за 5 минут от одного IP
      .sort(([, a], [, b]) => b - a);

    if (suspiciousIPs.length > 0) {
      this.logger.warn(
        `[DDOS_DETECTION] Potential DDoS activity detected from ${suspiciousIPs.length} IPs:`
      );
      suspiciousIPs.slice(0, 5).forEach(([ip, count]) => {
        this.logger.warn(`  - ${ip}: ${count} requests in 5 minutes`);
      });
    }
  }

  // Метод для ручного получения отчета
  generateReport(): any {
    const totalRequests = this.analyticsService.getTotalRequests();
    const uniqueIPs = this.analyticsService.getUniqueIPs();
    const topIPs = this.analyticsService.getTopIPs(10);
    const recentActivity = this.analyticsService.getRecentRequests(60);

    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalRequests,
        uniqueIPs,
        lastHourRequests: recentActivity.length
      },
      topIPs: topIPs.map(([ip, stats]) => ({
        ip,
        requests: stats.totalRequests,
        endpoints: stats.uniqueEndpoints.size,
        avgResponseTime: Math.round(stats.averageResponseTime),
        errorRate: ((stats.errorCount / stats.totalRequests) * 100).toFixed(2) + '%'
      })),
      recentActivity: {
        uniqueIPsLastHour: new Set(recentActivity.map(r => r.ip)).size,
        requestsPerMinute: Math.round(recentActivity.length / 60)
      }
    };
  }
}
