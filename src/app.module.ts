import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { QueryFailedErrorFilter } from "common/QueryFailedErrorFilter";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { AgentsModule } from "./agents/agents.module";
import { PropertiesModule } from "./properties/properties.module";
import { AppointmentsModule } from "./appointments/appointments.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { PaymentsModule } from "./payments/payments.module";
import { CampaignsModule } from "./campaigns/campaigns.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { CmsModule } from "./cms/cms.module";
import { QualityModule } from "./quality/quality.module";
import { ReportsModule } from "./reports/reports.module";
import { TrafficModule } from "./traffic/traffic.module";
import { PropertyListingRequestsModule } from "./property-listing-requests/property-listing-requests.module";
import { AgentAvailabilityModule } from "./agent-availability/agent-availability.module";
import { CalendarModule } from "./calendar/calendar.module";
import { TimelineModule } from "./timeline/timeline.module";
import { PayoutAccountsModule } from "./payout-accounts/payout-accounts.module";
import { MasterDataModule } from "./master-data/master-data.module";
import { MessageTemplatesModule } from "./message-templates/message-templates.module";
import { Role, UserRole } from "entities/global.entity";
import { SystemModule } from "./system-status/system-status.module";
import { FavoritesModule } from "./favorite-property/favorite-property.module";
import { ExportModule } from "./export/export.module";
import { TeamModule } from "./team-member/team-member.module";
import { ContactUsModule } from "./contactUs/contactUs.module";
import { BlogModule } from "./blog/blog.module,";
import { AppController } from "./app.controller";
@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT, 10),
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      entities: [__dirname + "/../**/*.entity{.ts,.js}"], // Adjusted path
      synchronize: true,
    }),

    // JwtModule.register({
    //   global: true,
    //   secret: process.env.JWT_SECRET,
    //   signOptions: { expiresIn: process.env.JWT_EXPIRE },
    // }),
    TypeOrmModule.forFeature([UserRole, Role]),
    AuthModule,
    UsersModule,
    AgentsModule,
    PropertiesModule,
    AppointmentsModule,
    ReviewsModule,
    PaymentsModule,
    CampaignsModule,
    NotificationsModule,
    CmsModule,
    QualityModule,
    ReportsModule,
    TrafficModule,
    PropertyListingRequestsModule,
    AgentAvailabilityModule,
    CalendarModule,
    TimelineModule,
    PayoutAccountsModule,
    MasterDataModule,
    MessageTemplatesModule,
    SystemModule,
    FavoritesModule,
    ExportModule,
    TeamModule,
    ContactUsModule,
    BlogModule
  ],
  providers: [
    QueryFailedErrorFilter,
    // { provide: APP_GUARD, useClass: JwtAuthGuard },
    // { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [],
})
export class AppModule {}
