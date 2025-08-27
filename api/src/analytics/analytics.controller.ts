import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService, IpStatistics } from '../services/analytics.service';

// Простая защита для эндпоинта аналитики (можно заменить на более сложную)
@Controller('analytics')
@ApiTags('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('stats')
  @ApiOkResponse({ description: 'General statistics' })
  @ApiQuery({ name: 'auth', required: false, description: 'Simple auth token' })
  getGeneralStats(@Query('auth') auth?: string) {
    // Простая проверка авторизации (замените на более безопасную)
    if (auth !== process.env.ANALYTICS_AUTH_TOKEN && process.env.NODE_ENV === 'production') {
      return { error: 'Unauthorized' };
    }

    return {
      totalRequests: this.analyticsService.getTotalRequests(),
      uniqueIPs: this.analyticsService.getUniqueIPs(),
      timestamp: new Date().toISOString()
    };
  }

  @Get('top-ips')
  @ApiOkResponse({ description: 'Top active IP addresses' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of IPs to return' })
  @ApiQuery({ name: 'auth', required: false, description: 'Simple auth token' })
  getTopIPs(@Query('limit') limit?: string, @Query('auth') auth?: string) {
    if (auth !== process.env.ANALYTICS_AUTH_TOKEN && process.env.NODE_ENV === 'production') {
      return { error: 'Unauthorized' };
    }

    const limitNum = limit ? parseInt(limit, 10) : 10;
    const topIPs = this.analyticsService.getTopIPs(limitNum);
    
    return {
      topIPs: topIPs.map(([ip, stats]) => ({
        ip,
        totalRequests: stats.totalRequests,
        uniqueEndpoints: stats.uniqueEndpoints.size,
        userAgents: Array.from(stats.userAgents),
        firstSeen: stats.firstSeen,
        lastSeen: stats.lastSeen,
        averageResponseTime: Math.round(stats.averageResponseTime),
        errorRate: ((stats.errorCount / stats.totalRequests) * 100).toFixed(2) + '%'
      })),
      timestamp: new Date().toISOString()
    };
  }

  @Get('ip-details')
  @ApiOkResponse({ description: 'Detailed statistics for specific IP' })
  @ApiQuery({ name: 'ip', required: true, description: 'IP address to analyze' })
  @ApiQuery({ name: 'auth', required: false, description: 'Simple auth token' })
  getIpDetails(@Query('ip') ip: string, @Query('auth') auth?: string) {
    if (auth !== process.env.ANALYTICS_AUTH_TOKEN && process.env.NODE_ENV === 'production') {
      return { error: 'Unauthorized' };
    }

    if (!ip) {
      return { error: 'IP parameter is required' };
    }

    const stats = this.analyticsService.getIpStatistics(ip);
    
    if (!stats) {
      return { error: 'IP not found in statistics' };
    }

    return {
      ip: stats.ip,
      totalRequests: stats.totalRequests,
      uniqueEndpoints: Array.from(stats.uniqueEndpoints),
      userAgents: Array.from(stats.userAgents),
      firstSeen: stats.firstSeen,
      lastSeen: stats.lastSeen,
      averageResponseTime: Math.round(stats.averageResponseTime),
      successCount: stats.successCount,
      errorCount: stats.errorCount,
      errorRate: ((stats.errorCount / stats.totalRequests) * 100).toFixed(2) + '%',
      timestamp: new Date().toISOString()
    };
  }

  @Get('recent-activity')
  @ApiOkResponse({ description: 'Recent request activity' })
  @ApiQuery({ name: 'minutes', required: false, description: 'Time window in minutes (default: 60)' })
  @ApiQuery({ name: 'auth', required: false, description: 'Simple auth token' })
  getRecentActivity(@Query('minutes') minutes?: string, @Query('auth') auth?: string) {
    if (auth !== process.env.ANALYTICS_AUTH_TOKEN && process.env.NODE_ENV === 'production') {
      return { error: 'Unauthorized' };
    }

    const minutesNum = minutes ? parseInt(minutes, 10) : 60;
    const recentRequests = this.analyticsService.getRecentRequests(minutesNum);
    
    // Группируем по IP для краткой статистики
    const ipActivity = new Map<string, number>();
    recentRequests.forEach(req => {
      ipActivity.set(req.ip, (ipActivity.get(req.ip) || 0) + 1);
    });

    const sortedActivity = Array.from(ipActivity.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20); // Топ 20 IP за период

    return {
      timeWindow: `${minutesNum} minutes`,
      totalRequests: recentRequests.length,
      uniqueIPs: ipActivity.size,
      topActiveIPs: sortedActivity.map(([ip, count]) => ({ ip, requests: count })),
      timestamp: new Date().toISOString()
    };
  }
}
