import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { DnsModule } from './dns/dns.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ProgramEntity } from './entities/program.entity';
import { DnsEntity } from './entities/dns.entity';
import { AnalyticsModule } from './analytics/analytics.module';
import { RequestLoggerMiddleware } from './middleware/request-logger.middleware';
import { AnalyticsService } from './services/analytics.service';
import { MonitoringService } from './services/monitoring.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number.parseInt(process.env.DB_PORT, 10),
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      entities: [ProgramEntity, DnsEntity],
      synchronize: false,
    }),
    DnsModule,
    AnalyticsModule,
  ],
  controllers: [],
  providers: [AnalyticsService, MonitoringService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestLoggerMiddleware)
      .forRoutes('*'); // Применяем ко всем маршрутам
  }
}
