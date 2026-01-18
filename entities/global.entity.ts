import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index, ManyToOne, OneToMany, OneToOne, JoinColumn, Unique, RelationId, BaseEntity, ManyToMany, JoinTable } from 'typeorm';
export enum AgentAppointmentRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  CONFIRMED = 'confirmed',
}

/* ===================== Core / Base ===================== */
export abstract class CoreEntity extends BaseEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @CreateDateColumn({
    type: 'timestamptz',
    name: 'created_at',
    default: () => 'NOW()',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    name: 'updated_at',
    default: () => 'NOW()',
  })
  updatedAt: Date;

  @DeleteDateColumn({
    type: 'timestamptz',
    name: 'deleted_at',
    nullable: true,
    select: false,
  })
  deletedAt?: Date | null;
}

/* ===================== Enums (TS) ===================== */
export enum UserType {
  CUSTOMER = 'customer',
  AGENT = 'agent',
  ADMIN = 'admin',
  MARKETER = 'marketer',
  QUALITY = 'quality_team',
}

export enum VerificationStatus {
  UNVERIFIED = 'unverified',
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

export enum AgentApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum SocialPlatform {
  INSTAGRAM = 'instagram',
  SNAPCHAT = 'snapchat',
  TIKTOK = 'tiktok',
  YOUTUBE = 'youtube',
  X = 'x',
  OTHER = 'other',
}

export enum TrafficSource {
  SNAPCHAT = 'snapchat',
  INSTAGRAM = 'instagram',
  WHATSAPP = 'whatsapp',
  TIKTOK = 'tiktok',
  DIRECT = 'direct',
  OTHER = 'other',
}

export enum AccessType {
  DIRECT = 'direct',
  MEDIATED = 'mediated',
  RESTRICTED = 'restricted',
}

export enum RelationshipType {
  OWNER = 'owner',
  AUTH_REP = 'authorized_representative',
}

export enum ListingRequestStatus {
  PENDING = 'pending',
  INSPECTED = 'inspected',
  REJECTED = 'rejected',
  PUBLISHED = 'published',
}

export enum AppointmentStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
  EXPIRED = 'expired',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

export enum CreatedChannel {
  WEB = 'web',
  APP = 'app',
  ADMIN_PANEL = 'admin_panel',
  WHATSAPP = 'whatsapp',
}

export enum ConversionType {
  REGISTRATION = 'registration',
  APPOINTMENT = 'appointment',
}

export enum TimelineEventType {
  VISIT = 'visit',
  REGISTRATION = 'registration',
  APPOINTMENT_CREATED = 'appointment_created',
  APPOINTMENT_ASSIGNED = 'appointment_assigned',
  APPOINTMENT_CONFIRMED = 'appointment_confirmed',
  APPOINTMENT_IN_PROGRESS = 'appointment_in_progress',
  APPOINTMENT_COMPLETED = 'appointment_completed',
  APPOINTMENT_CANCELLED = 'appointment_cancelled',
  APPOINTMENT_NO_SHOW = 'appointment_no_show',
  CUSTOMER_REVIEW_SUBMITTED = 'customer_review_submitted',
  AGENT_REVIEW_SUBMITTED = 'agent_review_submitted',
  CAMPAIGN_MESSAGE_SENT = 'campaign_message_sent',
  DOCUMENT_VERIFIED = 'document_verified',
  DOCUMENT_REJECTED = 'document_rejected',
}

export enum RatingDimension {
  COOPERATION = 'cooperation',
  COMMUNICATION = 'communication',
  PROFESSIONALISM = 'professionalism',
  CLARITY = 'clarity',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum PaymentGateway {
  MANUAL = 'manual',
  TAP = 'tap',
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  HYPERPAY = 'hyperpay',
}

export enum CampaignChannel {
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
}

export enum CampaignAudience {
  ALL_USERS = 'all_users',
  AGENTS = 'agents',
  MARKETERS = 'marketers',
  CUSTOMERS = 'customers',
  NEW_CUSTOMERS = 'new_customers',
}

export enum CampaignRunType {
  ONCE = 'once',
  RECURRING = 'recurring',
}

export enum CampaignFrequency {
  DAILY = 'daily',
  EVERY_2_DAYS = 'every_2_days',
  WEEKLY = 'weekly',
  EVERY_2_WEEKS = 'every_2_weeks',
  MONTHLY = 'monthly',
}

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  RUNNING = 'running',
  COMPLETED = 'completed',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
}

export enum NotificationType {
  APPOINTMENT_REMINDER = 'appointment_reminder',
  RATING_REQUEST = 'rating_request',
  FOLLOW_UP = 'follow_up',
  SYSTEM = 'system',
  CAMPAIGN = 'campaign',
}

export enum NotificationChannel {
  WHATSAPP = 'whatsapp',
  EMAIL = 'email',
  SMS = 'sms',
  IN_APP = 'in_app',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENDING = 'sending',
  DELIVERED = 'delivered',
}

export enum StaticPageSlug {
  MAIN = 'main',
  ABOUT = 'about-us',
  TERMS = 'terms',
  PRIVACY = 'privacy',
  FAQ = 'faq',
}

export enum SectionKey {
  // home
  CATEGORIES = 'categories',
  PROJECTS = 'projects',
  SERVICES = 'services',
  LATEST_PROJECTS = 'latest-projects',
  TESTIMONIALS = 'testimonials',
  PARTNERS = 'partners',
  COMMON_QUESTIONS = 'common_questions',
  // about
  BOOKING_PROCESS = 'booking-process',
  WHY_US = 'why-us',
  EXPLORE = 'explore',
  TEAM = 'team',
  // shared
  MAIN = 'main',
}

export enum CalendarProvider {
  GOOGLE = 'google',
  MICROSOFT = 'microsoft',
}

export enum QualityCaseStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum QualityCasePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ReportSnapshotType {
  ADMIN_DASHBOARD = 'admin_dashboard',
  AGENT_PERFORMANCE = 'agent_performance',
  MARKETING_PERFORMANCE = 'marketing_performance',
  FINANCIAL = 'financial',
}

/* ===================== Users & Roles ===================== */
@Index('UQ_users_phone', ['phoneNumber'], { unique: true })
@Index('UQ_users_email', ['email'], { unique: true })
@Entity('users')
export class User extends CoreEntity {
  @Column({ name: 'phone_number', type: 'varchar', length: 20, unique: true, nullable: true })
  phoneNumber: string;

  @Column({ type: 'varchar', length: 400, unique: true, nullable: true })
  email: string;

  @Column({ name: 'full_name', type: 'varchar', length: 255 })
  fullName: string;

  @Column({
    name: 'user_type',
    type: 'enum',
    enum: UserType,
    default: UserType.CUSTOMER,
  })
  userType: UserType;

  @Column({
    name: 'profile_photo_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  profilePhotoUrl?: string | null;
  @OneToMany(() => ReferralPartner, partner => partner.user)
  referralPartners: ReferralPartner[];
  // WhatsApp OTP
  @Column({
    name: 'whatsapp_otp',
    type: 'varchar',
    length: 6,
    nullable: true,
    select: false,
  })
  whatsappOtp?: string | null;

  @Column({
    name: 'whatsapp_otp_expires_at',
    type: 'timestamptz',
    nullable: true,
    select: false,
  })
  whatsappOtpExpiresAt?: Date | null;

  // KYC
  @Column({
    name: 'national_id_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  nationalIdUrl?: string | null;

  @Column({
    name: 'residency_id_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  residencyIdUrl?: string | null;

  @Column({
    name: 'verification_status',
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.UNVERIFIED,
  })
  verificationStatus: VerificationStatus;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt?: Date | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'verified_by' })
  verifiedBy?: User | null;

  @Column({ nullable: true, select: false })
  passwordHash?: string;

  @Column({ nullable: true })
  emailOtp?: string;

  @Column({ type: 'timestamp', nullable: true })
  emailOtpExpiresAt?: Date;

  @Column({ nullable: true })
  resetOtp?: string;

  @Column({ type: 'timestamp', nullable: true })
  resetOtpExpiresAt?: Date;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
  @Column({ nullable: true })
  phoneOtp?: string;

  @Column({ type: 'timestamp', nullable: true })
  phoneOtpExpiresAt?: Date;
}

@Entity('cities')
@Index('IDX_cities_active', ['isActive'])
export class City extends CoreEntity {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'is_active', type: 'boolean', default: false })
  isActive: boolean;
  @OneToMany(() => Area, area => area.city)
  areas: Area[];
}
@Entity('areas')
@Index('IDX_areas_active', ['isActive'])
export class Area extends CoreEntity {
  @ManyToOne(() => City, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'city_id' })
  city: City;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'is_active', type: 'boolean', default: false })
  isActive: boolean;
}

@Entity('property_types')
export class PropertyType extends CoreEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
@Entity('properties')
@Index('IDX_properties_active', ['isActive'])
export class Property extends CoreEntity {
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 1000 })
  description: string;

  @ManyToOne(() => PropertyType, { eager: true })
  @JoinColumn({ name: 'property_type_id' })
  propertyType: PropertyType;

  @ManyToOne(() => City, { eager: true, onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'city_id' })
  city: City;

  @ManyToOne(() => Area, { eager: true, onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'area_id' })
  area: Area;
  @RelationId((p: Property) => p.city)
  cityId: number;

  @RelationId((p: Property) => p.area)
  areaId: number;

  @Column({ type: 'smallint' })
  bedrooms: number;

  @Column({type:'varchar',nullable:true})
  videoUrl:string
  @Column({ type: 'smallint' })
  bathrooms: number;

  @Column({ name: 'area_m2', type: 'numeric', precision: 10, scale: 2 })
  areaM2: string;

  @Column({ type: 'numeric', precision: 15, scale: 2, nullable: true })
  price?: string | null;

  @Column({ name: 'property_listing_request_id', type: 'int', nullable: true })
  propertyListingRequestId?: number | null;

  @Column({ type: 'varchar', length: 500 ,nullable:true})
  locationUrl?:string
  @Column({ type: 'jsonb' })
  specifications: Record<string, any>;

  @Column({ type: 'jsonb' })
  guarantees: Record<string, any>;

  @Column({
    name: 'access_type',
    type: 'enum',
    enum: AccessType,
    default: AccessType.MEDIATED,
  })
  accessType: AccessType;

  @Column({ name: 'owner_name', type: 'varchar', length: 255, nullable: true })
  ownerName?: string | null;

  @Column({ name: 'owner_phone', type: 'varchar', length: 20, nullable: true })
  ownerPhone?: string | null;

  @Column({
    name: 'owner_notes',
    type: 'varchar',
    length: 1000,
    nullable: true,
  })
  ownerNotes?: string | null;
  @Column({ type: 'decimal', nullable: true })
  agentsPercentage?: number | null;
  // NEW: Geo/Maps integration
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude?: string | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude?: string | null;

  @Column({
    name: 'map_place_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  mapPlaceId?: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @OneToMany(() => PropertyMedia, m => m.property, { cascade: true })
  medias: PropertyMedia[];
}
@Entity('property_medias')
export class PropertyMedia extends CoreEntity {
  @ManyToOne(() => Property, p => p.medias, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property: Property;

  @Column({ name: 'media_url', type: 'varchar', length: 500 })
  mediaUrl: string;

  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary: boolean;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex: number;
}

@Entity('appointments')
@Index('IDX_appt_customer', ['customer'])
@Index('IDX_appt_agent', ['agent'])
@Index('IDX_appt_property', ['property'])
export class Appointment extends CoreEntity {
  @ManyToOne(() => Property, { eager: true })
  @JoinColumn({ name: 'property_id' })
  property: Property;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'agent_id' })
  agent?: User | null;

  @Column({ name: 'appointment_date', type: 'date' })
  appointmentDate: string;

  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime: string;

  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.PENDING,
  })
  status: AppointmentStatus;

  @ManyToOne(() => Appointment, { nullable: true })
  @JoinColumn({ name: 'previous_appointment_id' })
  previousAppointment?: Appointment | null;

  @Column({
    name: 'customer_notes',
    type: 'varchar',
    length: 1000,
    nullable: true,
  })
  customerNotes?: string | null;

  @Column({
    name: 'agent_notes',
    type: 'varchar',
    length: 1000,
    nullable: true,
  })
  agentNotes?: string | null;
  @OneToMany(() => AgentAppointmentRequest, req => req.appointment, { cascade: true })
  agentRequests: AgentAppointmentRequest[];
  @Column({
    name: 'created_channel',
    type: 'enum',
    enum: CreatedChannel,
    default: CreatedChannel.WEB,
  })
  createdChannel: CreatedChannel;
}
/* ===================== Agent Earnings ===================== */
@Entity('agent_earnings')
@Index('IDX_agent_earnings_agent', ['agent'])
export class AgentEarning extends CoreEntity {
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'agent_id' })
  agent: User;

  @Column({
    name: 'amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
  })
  amount: number;

  @Column({
    name: 'type',
    type: 'varchar',
    length: 50,
  })
  type: 'appointment_commission' | 'property_sale_commission';

  // Scenario 1: From AgentAppointmentRequest - store only the ID to avoid circular dependency
  @Column({ name: 'agent_appointment_request_id', nullable: true })
  agentAppointmentRequestId?: number | null;

  // Scenario 2: From Property Sale
  @ManyToOne(() => Property, { eager: true, nullable: true })
  @JoinColumn({ name: 'property_id' })
  property?: Property | null;

  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer?: User | null;

  @Column({
    name: 'sale_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  saleAmount?: number | null;

  @Column({
    name: 'commission_rate',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  commissionRate?: number | null;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'added_by' })
  addedBy: User;
}

/* ===================== Agent Appointment Requests ===================== */
@Entity('agent_appointment_requests')
@Unique('UQ_agent_appointment', ['agent', 'appointment', 'respondedAt'])
export class AgentAppointmentRequest extends CoreEntity {
  @ManyToOne(() => Appointment, a => a.agentRequests, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'appointment_id' })
  appointment: Appointment;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent: User;

  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.PENDING,
  })
  status: AppointmentStatus;

  @Column({ type: 'timestamptz', nullable: true })
  respondedAt?: Date;

  // When appointment is completed, this gets set
  @Column({
    name: 'commission_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  commissionAmount?: number | null;

  @Column({
    name: 'is_commission_added',
    type: 'boolean',
    default: false,
  })
  isCommissionAdded: boolean;

  @Column({
    name: 'commission_added_at',
    type: 'timestamptz',
    nullable: true,
  })
  commissionAddedAt?: Date | null;

  @OneToOne(() => AgentEarning, earning => earning.agentAppointmentRequestId)
  earning: AgentEarning;
}

Object.defineProperty(Appointment.prototype, 'agentRequests', {
  get() {
    return this._agentRequests;
  },
  set(value) {
    this._agentRequests = value;
  },
  enumerable: true,
  configurable: true,
});

// Add the relationship decorator to Appointment prototype
Reflect.defineMetadata(
  'typeorm:relations',
  [
    {
      target: () => AgentAppointmentRequest,
      propertyName: 'agentRequests',
      relationType: 'one-to-many',
      inverseSideProperty: 'appointment',
      options: { cascade: true },
    },
  ],
  Appointment.prototype,
);

/* ===================== Campaigns & Messaging ===================== */
@Entity('campaigns')
export class Campaign extends CoreEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string; // internal

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({
    name: 'target_channel',
    type: 'enum',
    enum: CampaignChannel,
    default: CampaignChannel.WHATSAPP,
  })
  targetChannel: CampaignChannel;

  @Column({
    name: 'target_audience',
    type: 'enum',
    enum: CampaignAudience,
    default: CampaignAudience.ALL_USERS,
  })
  targetAudience: CampaignAudience;

  @Column({
    name: 'run_type',
    type: 'enum',
    enum: CampaignRunType,
    default: CampaignRunType.ONCE,
  })
  runType: CampaignRunType;

  @Column({ name: 'run_once_datetime', type: 'timestamptz', nullable: true })
  runOnceDatetime?: Date | null;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate?: string | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate?: string | null;

  @Column({
    name: 'run_frequency',
    type: 'enum',
    enum: CampaignFrequency,
    nullable: true,
  })
  runFrequency?: CampaignFrequency | null;

  @Column({ name: 'run_time', type: 'time', nullable: true })
  runTime?: string | null;

  @Column({ type: 'enum', enum: CampaignStatus, default: CampaignStatus.DRAFT })
  status: CampaignStatus;

  @Column({ name: 'message_content', type: 'varchar', length: 4000 })
  messageContent: string;

  @Column({ name: 'actual_recipients', type: 'int', nullable: true })
  actualRecipients?: number | null;

  @Column({ type: 'int', nullable: true })
  views?: number | null;

  @Column({ type: 'int', nullable: true })
  responses?: number | null;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @OneToMany(() => CampaignImage, i => i.campaign, { cascade: true })
  images: CampaignImage[];
}

@Entity('campaigns_images')
export class CampaignImage extends CoreEntity {
  @ManyToOne(() => Campaign, c => c.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;

  @Column({ name: 'image_url', type: 'varchar', length: 500 })
  imageUrl: string;
}

@Entity('message_templates')
@Index('UQ_message_templates_name_channel', ['name', 'channel'], {
  unique: true,
})
export class MessageTemplate extends CoreEntity {
  @Column({ type: 'varchar', length: 150 })
  name: string; // e.g., APPOINTMENT_REMINDER_AR

  @Column({ type: 'enum', enum: NotificationChannel })
  channel: NotificationChannel;

  @Column({ type: 'text' })
  body: string; // supports placeholders like {{customer_name}}

  @Column({ type: 'boolean', default: false })
  approved: boolean; // WhatsApp Business approval

  @Column({ name: 'locale', type: 'varchar', length: 10, default: 'ar' })
  locale: string;
}

/* ===================== RBAC (Optional Granular) ===================== */
@Entity('roles')
@Index('UQ_roles_name', ['name'], { unique: true })
export class Role extends CoreEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string | null;

  @OneToMany(() => UserRole, ur => ur.role)
  userRoles: UserRole[];

  @OneToMany(() => RolePermission, rp => rp.role)
  rolePermissions: RolePermission[];
}

@Entity('permissions')
@Index('UQ_permissions_key', ['key'], { unique: true })
export class Permission extends CoreEntity {
  @Column({ type: 'varchar', length: 150 })
  key: string; // e.g., 'properties.publish'

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string | null;

  @OneToMany(() => RolePermission, rp => rp.permission)
  rolePermissions: RolePermission[];
}

@Entity('role_permissions')
@Unique('UQ_role_permission_pair', ['role', 'permission'])
export class RolePermission extends CoreEntity {
  @ManyToOne(() => Role, r => r.rolePermissions, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @ManyToOne(() => Permission, p => p.rolePermissions, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'permission_id' })
  permission: Permission;
}

@Entity('user_roles')
@Unique('UQ_user_role_pair', ['user', 'role'])
export class UserRole extends CoreEntity {
  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Role, r => r.userRoles, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'role_id' })
  role: Role;
}

/* ===================== Auth Sessions ===================== */
@Entity('auth_sessions')
@Index('IDX_auth_sessions_expires_at', ['expiresAt'])
export class AuthSession extends CoreEntity {
  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'refresh_token', type: 'varchar', length: 255, unique: true })
  refreshToken: string;

  @Column({ name: 'user_agent', type: 'varchar', length: 255, nullable: true })
  userAgent?: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress?: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt?: Date | null;
}

/* ===================== Traffic & UTM ===================== */

@Entity('referral_partners')
@Unique('UQ_partner_campaign_name_kind', ['campaign.id', 'name', 'kind']) // ✅ جديد
@Index('IDX_partner_campaign', ['campaign'])
@Index('UQ_referral_partner_code', ['referralCode'], { unique: true })
export class ReferralPartner extends CoreEntity {
  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;

  // external | internal
  @Column({ type: 'varchar', length: 20, default: 'external' })
  kind: 'external' | 'internal';

  @Column({ type: 'varchar', length: 100, nullable: true })
  platform?: string | null;

  @Column({
    name: 'referral_code',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  referralCode: string;

  @ManyToOne(() => Campaign, { eager: true, nullable: true })
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;
  @ManyToOne(() => User, user => user.referralPartners, { eager: true, nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;
  @Column({ name: 'user_id', nullable: true })
  userId: number;
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
  @Column({ type: 'text', nullable: true })
  shareUrl?: string;

  @Column({ name: 'visit_reward_amount', type: 'numeric', precision: 15, scale: 2, default: 0 })
  visitRewardAmount: string;

  @Column({ name: 'registration_reward_amount', type: 'numeric', precision: 15, scale: 2, default: 0 })
  registrationRewardAmount: string;

  @Column({ name: 'appointment_reward_amount', type: 'numeric', precision: 15, scale: 2, default: 0 })
  appointmentRewardAmount: string;

  @Column({ name: 'purchase_share_percent', type: 'numeric', precision: 5, scale: 2, default: 0 })
  purchaseSharePercent: string;

  @Column({ name: 'current_balance', type: 'numeric', precision: 15, scale: 2, default: 0 })
  currentBalance: string;

  @Column({ name: 'total_withdrawn', type: 'numeric', precision: 15, scale: 2, default: 0 })
  totalWithdrawn: string;
}

@Entity('visitor_tracking')
@Index('IDX_visit_partner_createdAt', ['partner', 'createdAt'])
@Index('IDX_visit_campaign_createdAt', ['campaign', 'createdAt'])
@Index('IDX_visit_referralCode_createdAt', ['referralCode', 'createdAt'])
export class VisitorTracking extends CoreEntity {
  @ManyToOne(() => ReferralPartner, { nullable: true })
  @JoinColumn({ name: 'partner_id' })
  partner?: ReferralPartner | null;

  @ManyToOne(() => Campaign, { nullable: true })
  @JoinColumn({ name: 'campaign_id' })
  campaign?: Campaign | null;

  @Column({
    name: 'referral_code',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  referralCode?: string | null;

  @Column({
    name: 'visited_url',
    type: 'varchar',
    length: 1000,
    nullable: true,
  })
  visitedUrl: string;

  @Column({
    name: 'landing_page',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  landingPage?: string | null;

  @Column({ name: 'utm_source', type: 'varchar', length: 100, nullable: true })
  utmSource?: string | null;

  @Column({
    name: 'utm_campaign',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  utmCampaign?: string | null;

  @Column({ name: 'utm_content', type: 'varchar', length: 150, nullable: true })
  utmContent?: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 255, nullable: true })
  userAgent?: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress?: string | null;
}

@Entity('conversions')
@Index('IDX_conv_partner_convertedAt', ['partner', 'convertedAt'])
@Index('IDX_conv_campaign_convertedAt', ['campaign', 'convertedAt'])
@Index('IDX_conv_user_convertedAt', ['user', 'convertedAt'])
export class Conversion extends CoreEntity {
  @ManyToOne(() => VisitorTracking, { eager: true, nullable: true })
  @JoinColumn({ name: 'visitor_id' })
  visitor?: VisitorTracking | null;

  @ManyToOne(() => ReferralPartner, { eager: true, nullable: true })
  @JoinColumn({ name: 'partner_id' })
  partner?: ReferralPartner | null;

  @ManyToOne(() => Campaign, { eager: true, nullable: true })
  @JoinColumn({ name: 'campaign_id' })
  campaign?: Campaign | null;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'varchar',
    length: 32,
    name: 'referral_code',
    nullable: true,
  })
  referralCode?: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  type: ConversionType;
  @Column({
    name: 'ip_address',
    type: 'varchar',
    length: 45,
    nullable: true,
  })
  ipAddress?: string | null;
  @Column({ name: 'converted_at', type: 'timestamptz', default: () => 'NOW()' })
  convertedAt: Date;
}

/* ===================== Master Data ===================== */

@Entity('agent_payments')
@Index('IDX_agent_payments_agent', ['agent'])
export class AgentPayment extends CoreEntity {
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'agent_id' })
  agent: User;

  @Column({
    name: 'amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
  })
  amount: number;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({
    name: 'payment_method',
    type: 'varchar',
    length: 50,
    default: 'manual',
  })
  paymentMethod: string;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({
    name: 'paid_at',
    type: 'timestamptz',
    nullable: true,
  })
  paidAt?: Date | null;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'processed_by' })
  processedBy: User;

  // For audit - balance before payment
  @Column({
    name: 'balance_before',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  balanceBefore: number;

  @Column({
    name: 'balance_after',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  balanceAfter: number;
}

@Entity('agents')
@Unique('UQ_agents_user', ['user'])
export class Agent extends CoreEntity {
  @OneToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToMany(() => City, { eager: true })
  @JoinTable({
    name: 'agent_cities',
    joinColumn: { name: 'agent_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'city_id', referencedColumnName: 'id' },
  })
  cities: City[];

  @ManyToMany(() => Area, { eager: true })
  @JoinTable({
    name: 'agent_areas',
    joinColumn: { name: 'agent_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'area_id', referencedColumnName: 'id' },
  })
  areas: Area[];

  @Column({
    name: 'identity_proof_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  identityProofUrl: string;

  @Column({
    name: 'residency_document_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  residencyDocumentUrl: string;

  @Column({
    type: 'enum',
    enum: AgentApprovalStatus,
    default: AgentApprovalStatus.PENDING,
  })
  status: AgentApprovalStatus;

  @Column({ name: 'kyc_notes', type: 'varchar', length: 1000, nullable: true })
  kycNotes?: string | null;
  @Column({
    name: 'wallet_balance',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  walletBalance: number;

  @Column({
    name: 'total_earned',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  totalEarned: number;

  @Column({
    name: 'total_paid',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  totalPaid: number;

  @Column({
    name: 'pending_payouts',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  pendingPayouts: number;

  @Column({
    name: 'viste_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  visitAmount: number;

  @Column({
    name: 'completed_appointments',
    type: 'int',
    default: 0,
  })
  completedAppointments: number;

  @Column({
    name: 'total_transactions',
    type: 'int',
    default: 0,
  })
  totalTransactions: number;

  @Column({
    name: 'last_payout_date',
    type: 'timestamptz',
    nullable: true,
  })
  lastPayoutDate?: Date | null;

  @OneToMany(() => AgentEarning, earning => earning.agent)
  earnings: AgentEarning[];

  @OneToMany(() => AgentPayment, payment => payment.agent)
  payments: AgentPayment[];

  @OneToMany(() => WalletTransaction, transaction => transaction.agent)
  walletTransactions: WalletTransaction[];

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedBy?: User | null;
}

@Entity('wallet_transactions')
@Index('IDX_wallet_transactions_agent', ['agent'])
@Index('IDX_wallet_transactions_created', ['createdAt'])
export class WalletTransaction extends CoreEntity {
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'agent_id' })
  agent: User;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.COMPLETED,
  })
  status: PaymentStatus;

  @Column({
    name: 'transaction_type',
    type: 'varchar',
    length: 50,
  })
  transactionType: 'earning' | 'payout' | 'adjustment' | 'refund';

  @Column({
    name: 'amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
  })
  amount: number;

  @Column({
    name: 'balance_before',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  balanceBefore: number;

  @Column({
    name: 'balance_after',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  balanceAfter: number;

  @Column({
    name: 'description',
    type: 'varchar',
    length: 500,
  })
  description: string;

  // Reference to related entities
  @ManyToOne(() => AgentPayment, { nullable: true })
  @JoinColumn({ name: 'agent_payment_id' })
  agentPayment?: AgentPayment | null;

  @ManyToOne(() => AgentAppointmentRequest, { nullable: true })
  @JoinColumn({ name: 'agent_appointment_request_id' })
  agentAppointmentRequest?: AgentAppointmentRequest | null;

  @ManyToOne(() => Appointment, { nullable: true })
  @JoinColumn({ name: 'appointment_id' })
  appointment?: Appointment | null;

  @ManyToOne(() => AgentEarning, { nullable: true })
  @JoinColumn({ name: 'agent_earning_id' })
  agentEarning?: AgentEarning | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'processed_by' })
  processedBy?: User | null;
}

/* ===================== Properties ===================== */

@Entity('favorite_properties')
@Unique('UQ_favorite_user_property', ['user', 'property'])
@Index('IDX_favorite_user', ['user'])
export class FavoriteProperty extends CoreEntity {
  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Property, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property: Property;

  // Optional note/tag (handy if you ever want it)
  @Column({ name: 'note', type: 'varchar', length: 255, nullable: true })
  note?: string | null;
}

/* ===================== "اعرض عقارك" Requests ===================== */

@Entity('property_listing_requests')
export class PropertyListingRequest extends CoreEntity {
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column({
    name: 'relationship_type',
    type: 'enum',
    enum: RelationshipType,
    default: RelationshipType.OWNER,
  })
  relationshipType: RelationshipType;

  @ManyToOne(() => PropertyType, { eager: true })
  @JoinColumn({ name: 'property_type_id' })
  propertyType: PropertyType;

  @Column({ type: 'varchar', length: 1000 })
  location: string;

  @Column({ type: 'jsonb' })
  specifications: Record<string, any>;

  @Column({
    name: 'asking_price',
    type: 'numeric',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  askingPrice?: string | null;

  @Column({
    name: 'authorization_doc_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  authorizationDocUrl?: string | null;

  @Column({
    name: 'ownership_doc_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  ownershipDocUrl?: string | null;

  @Column({
    type: 'enum',
    enum: ListingRequestStatus,
    default: ListingRequestStatus.PENDING,
  })
  status: ListingRequestStatus;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedBy?: User | null;

  @OneToMany(() => PropertyListingRequestAttachment, a => a.request, {
    cascade: true,
  })
  attachments: PropertyListingRequestAttachment[];
}

@Entity('property_listing_requests_attachments')
export class PropertyListingRequestAttachment extends CoreEntity {
  @ManyToOne(() => PropertyListingRequest, r => r.attachments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'property_listing_request_id' })
  request: PropertyListingRequest;

  @Column({ name: 'attachment_url', type: 'varchar', length: 500 })
  attachmentUrl: string;
}
/* ===================== Agents Matching & Availability ===================== */
@Entity('agent_availability')
export class AgentAvailability extends CoreEntity {
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'agent_id' })
  agent: User;

  @Column({ name: 'day_of_week', type: 'smallint' })
  dayOfWeek: number; // 0..6

  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime: string;
}

@Entity('agent_preferred_properties')
export class AgentPreferredProperty extends CoreEntity {
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'agent_id' })
  agent: User;

  @ManyToOne(() => Property, { eager: true })
  @JoinColumn({ name: 'property_id' })
  property: Property;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'added_by' })
  addedBy?: User | null;
}

/* ===================== Appointments & Timeline ===================== */

@Entity('appointment_status_history')
@Index('IDX_appt_history_created_at', ['createdAt'])
export class AppointmentStatusHistory extends CoreEntity {
  @ManyToOne(() => Appointment, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'appointment_id' })
  appointment: Appointment;

  @Column({ name: 'old_status', type: 'enum', enum: AppointmentStatus })
  oldStatus: AppointmentStatus;

  @Column({ name: 'new_status', type: 'enum', enum: AppointmentStatus })
  newStatus: AppointmentStatus;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'changed_by' })
  changedBy: User;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  notes?: string | null;
}

@Entity('customer_timeline_events')
@Index('IDX_timeline_customer_created', ['customer', 'createdAt'])
export class CustomerTimelineEvent extends CoreEntity {
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @Column({ name: 'event_type', type: 'enum', enum: TimelineEventType })
  eventType: TimelineEventType;

  @Column({ name: 'related_id', type: 'int', nullable: true })
  relatedId?: number | null;

  @Column({
    name: 'related_table',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  relatedTable?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'actor_user_id' })
  actorUser?: User | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  notes?: string | null;
}

/* ===================== Calendar Integration (NEW) ===================== */
@Entity('calendar_accounts')
@Unique('UQ_calendar_accounts_user_provider', ['user', 'provider'])
export class CalendarAccount extends CoreEntity {
  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: CalendarProvider })
  provider: CalendarProvider;

  @Column({ name: 'external_account_id', type: 'varchar', length: 255 })
  externalAccountId: string;

  @Column({ name: 'access_token', type: 'text' })
  accessToken: string;

  @Column({ name: 'refresh_token', type: 'text' })
  refreshToken: string;

  @Column({ name: 'token_expires_at', type: 'timestamptz' })
  tokenExpiresAt: Date;
}

@Entity('appointment_calendar_sync')
@Unique('UQ_appt_calendar_event', ['appointment', 'providerEventId'])
export class AppointmentCalendarSync extends CoreEntity {
  @ManyToOne(() => Appointment, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'appointment_id' })
  appointment: Appointment;

  @Column({ name: 'provider', type: 'enum', enum: CalendarProvider })
  provider: CalendarProvider;

  @Column({ name: 'provider_event_id', type: 'varchar', length: 255 })
  providerEventId: string;

  @Column({ name: 'synced_at', type: 'timestamptz' })
  syncedAt: Date;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError?: string | null;
}

/* ===================== Reviews & Ratings ===================== */
@Entity('customer_reviews')
@Index('IDX_cust_reviews_agent', ['agentId'])
export class CustomerReview extends CoreEntity {
  @ManyToOne(() => Appointment, { eager: true })
  @JoinColumn({ name: 'appointment_id' })
  appointment: Appointment;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  // denormalized agent_id
  @Column({ name: 'agent_id', type: 'int' })
  agentId: number;

  @Column({ type: 'smallint' })
  rating: number; // 1-5

  @Column({
    name: 'review_text',
    type: 'varchar',
    length: 1000,
    nullable: true,
  })
  reviewText?: string | null;

  @Column({ name: 'is_approved', type: 'boolean', default: true })
  isApproved: boolean;

  @OneToMany(() => CustomerReviewDimension, d => d.review, { cascade: true })
  dimensions: CustomerReviewDimension[];
}

@Entity('customer_review_dimensions')
export class CustomerReviewDimension extends CoreEntity {
  @ManyToOne(() => CustomerReview, r => r.dimensions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_review_id' })
  review: CustomerReview;

  @Column({ type: 'enum', enum: RatingDimension })
  dimension: RatingDimension;

  @Column({ type: 'smallint' })
  score: number; // 1..5
}

@Entity('agent_reviews')
@Index('IDX_agent_reviews_customer', ['customer'])
export class AgentReview extends CoreEntity {
  @ManyToOne(() => Appointment, { eager: true })
  @JoinColumn({ name: 'appointment_id' })
  appointment: Appointment;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'agent_id' })
  agent: User;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @Column({ type: 'smallint' })
  rating: number;

  @Column({
    name: 'review_text',
    type: 'varchar',
    length: 1000,
    nullable: true,
  })
  reviewText?: string | null;

  @OneToMany(() => AgentReviewDimension, d => d.review, { cascade: true })
  dimensions: AgentReviewDimension[];
}

@Entity('agent_review_dimensions')
export class AgentReviewDimension extends CoreEntity {
  @ManyToOne(() => AgentReview, r => r.dimensions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_review_id' })
  review: AgentReview;

  @Column({ type: 'enum', enum: RatingDimension })
  dimension: RatingDimension;

  @Column({ type: 'smallint' })
  score: number;
}

/* ===================== Agent Payouts & Balance ===================== */

@Entity('agent_balances')
@Unique('UQ_agent_balances_agent', ['agent'])
export class AgentBalance extends CoreEntity {
  @OneToOne(() => User, { eager: true })
  @JoinColumn({ name: 'agent_id' })
  agent: User;

  @Column({
    name: 'total_earnings',
    type: 'numeric',
    precision: 15,
    scale: 2,
    default: 0,
  })
  totalEarnings: string;

  @Column({
    name: 'pending_balance',
    type: 'numeric',
    precision: 15,
    scale: 2,
    default: 0,
  })
  pendingBalance: string;
}

@Entity('agent_payout_accounts')
@Unique('UQ_payout_account_agent', ['agent'])
export class AgentPayoutAccount extends CoreEntity {
  @OneToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent: User;

  @Column({ name: 'account_holder_name', type: 'varchar', length: 255 })
  accountHolderName: string;

  @Column({ name: 'iban', type: 'varchar', length: 34 })
  iban: string;

  @Column({ name: 'bank_name', type: 'varchar', length: 255 })
  bankName: string;

  @Column({ name: 'swift_code', type: 'varchar', length: 11, nullable: true })
  swiftCode?: string | null;
}

@Entity('notifications')
export class Notification extends CoreEntity {
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 1000 })
  message: string;

  @Column({ name: 'related_id', type: 'int', nullable: true })
  relatedId?: number | null;

  @Column({
    type: 'enum',
    enum: NotificationChannel,
    default: NotificationChannel.WHATSAPP,
  })
  channel: NotificationChannel;

  @Column({
    name: 'status',
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @Column({ name: 'scheduled_for', type: 'timestamptz', nullable: true })
  scheduledFor?: Date | null;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt?: Date | null;
}

/* ===================== Site & CMS ===================== */
@Entity('site_settings')
export class SiteSettings extends CoreEntity {
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude?: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude?: number | null;

  @Column({
    name: 'intro_video_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  introVideoUrl?: string | null;

  @Column({ name: 'customer_count', type: 'int', default: 0 })
  customerCount: number;

  @Column({ name: 'years_experience', type: 'int', default: 0 })
  yearsExperience: number;

  @Column({ name: 'project_count', type: 'int', default: 0 })
  projectCount: number;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string;

  @Column({ name: 'phone_number', type: 'varchar', length: 20 })
  phoneNumber: string;

  @Column({ name: 'twitter_url', type: 'varchar', length: 500, nullable: true })
  twitterUrl?: string | null;

  @Column({
    name: 'instagram_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  instagramUrl?: string | null;

  @Column({
    name: 'snapchat_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  snapchatUrl?: string | null;

  @Column({ name: 'tiktok_url', type: 'varchar', length: 500, nullable: true })
  tiktokUrl?: string | null;

  @Column({ name: 'youtube_url', type: 'varchar', length: 500, nullable: true })
  youtubeUrl?: string | null;

  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedBy?: User | null;

  @Column({ name: 'terms_html', type: 'text', nullable: true })
  termsHtml?: string | null;

  @Column({ name: 'privacy_html', type: 'text', nullable: true })
  privacyHtml?: string | null;
}

@Entity('footer_settings')
export class FooterSettings extends CoreEntity {
  @Column({ name: 'footer_paragraph', type: 'text', nullable: true })
  footerParagraph?: string | null;

  @Column({
    name: 'newsletter_title',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  newsletterTitle?: string | null;

  @Column({ name: 'newsletter_paragraph', type: 'text', nullable: true })
  newsletterParagraph?: string | null;

  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedBy?: User | null;
}

@Entity('static_pages')
export class StaticPage extends CoreEntity {
  @Column({ unique: true, nullable: true })
  slug: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title?: string | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description?: string | null;

  @OneToMany(() => PageSection, s => s.page)
  sections: PageSection[];
}

@Entity('page_sections')
export class PageSection extends CoreEntity {
  @ManyToOne(() => StaticPage, p => p.sections, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'static_page_id' })
  page: StaticPage;

  @Column({ name: 'section_key', unique: true, nullable: true })
  sectionKey: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 500 })
  description: string;
}

/* ====== Home assets ====== */
@Entity('home_backgrounds')
export class HomeBackground extends CoreEntity {
  @Column({ name: 'image_url', type: 'varchar', length: 255 })
  imageUrl: string;
}

@Entity('partner_logos')
export class PartnerLogo extends CoreEntity {
  @Column({ name: 'image_url', type: 'varchar', length: 255 })
  imageUrl: string;

  @Column({ name: 'alt_text', type: 'varchar', length: 100 })
  altText: string;
}

@Entity('home_common_questions')
export class HomeCommonQuestion extends CoreEntity {
  @Column({ type: 'varchar', length: 500 })
  question: string;

  @Column({ type: 'varchar', length: 1000 })
  answer: string;
}

/* ====== About content ====== */
@Entity('about_features')
export class AboutFeature extends CoreEntity {
  @Column({ name: 'feature_text', type: 'varchar', length: 100 })
  featureText: string;
}

@Entity('about_steps')
export class AboutStep extends CoreEntity {
  @Column({ name: 'step_number', type: 'int' })
  stepNumber: number;

  @Column({ type: 'varchar', length: 100 })
  title: string;

  @Column({ type: 'varchar', length: 500 })
  description: string;
}

@Entity('about_highlights')
export class AboutHighlight extends CoreEntity {
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 1000 })
  description: string;
}

@Entity('about_stats')
export class AboutStat extends CoreEntity {
  @Column({ type: 'varchar', length: 100 })
  label: string;

  @Column({ type: 'varchar', length: 50 })
  value: string;
}

@Entity('about_team')
export class AboutTeam extends CoreEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  role: string;

  @Column({ name: 'image_url', type: 'varchar', length: 255 })
  imageUrl: string;
}

/* ====== FAQs ====== */
@Entity('faq_groups')
export class FaqGroup extends CoreEntity {
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @OneToMany(() => FaqItem, i => i.group)
  items: FaqItem[];
}

@Entity('faq_items')
export class FaqItem extends CoreEntity {
  @ManyToOne(() => FaqGroup, g => g.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'faq_group_id' })
  group: FaqGroup;

  @Column({ type: 'varchar', length: 500 })
  question: string;

  @Column({ type: 'varchar', length: 1000 })
  answer: string;
}

/* ====== Privacy & Terms ====== */
@Entity('privacy_groups')
export class PrivacyGroup extends CoreEntity {
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @OneToMany(() => PrivacyItem, i => i.group)
  items: PrivacyItem[];
}

@Entity('privacy_items')
export class PrivacyItem extends CoreEntity {
  @ManyToOne(() => PrivacyGroup, g => g.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'privacy_group_id' })
  group: PrivacyGroup;

  @Column({ type: 'varchar', length: 500 })
  content: string;
}

@Entity('terms_blocks')
export class TermsBlock extends CoreEntity {
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 1000 })
  description: string;
}

/* ===================== Quality Cases (NEW) ===================== */
@Entity('quality_cases')
export class QualityCase extends CoreEntity {
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({
    name: 'related_table',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  relatedTable?: string | null;

  @Column({ name: 'related_id', type: 'int', nullable: true })
  relatedId?: number | null;

  @Column({
    type: 'enum',
    enum: QualityCaseStatus,
    default: QualityCaseStatus.OPEN,
  })
  status: QualityCaseStatus;

  @Column({
    type: 'enum',
    enum: QualityCasePriority,
    default: QualityCasePriority.MEDIUM,
  })
  priority: QualityCasePriority;

  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn({ name: 'assignee_id' })
  assignee?: User | null;

  @OneToMany(() => QualityCaseNote, n => n.case, { cascade: true })
  notes: QualityCaseNote[];
}

@Entity('quality_case_notes')
export class QualityCaseNote extends CoreEntity {
  @ManyToOne(() => QualityCase, c => c.notes, {
    onDelete: 'CASCADE',
    eager: true,
  })
  @JoinColumn({ name: 'case_id' })
  case: QualityCase;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ type: 'text' })
  note: string;
}

/* ===================== Report Snapshots (NEW / Optional) ===================== */
@Entity('report_snapshots')
@Index('IDX_report_snapshots_type_period', ['type', 'periodStart', 'periodEnd'])
export class ReportSnapshot extends CoreEntity {
  @Column({ type: 'enum', enum: ReportSnapshotType })
  type: ReportSnapshotType;

  @Column({ name: 'period_start', type: 'date' })
  periodStart: string;

  @Column({ name: 'period_end', type: 'date' })
  periodEnd: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @Column({ name: 'generated_at', type: 'timestamptz', default: () => 'NOW()' })
  generatedAt: Date;
}

@Entity('contact_us')
export class ContactUs extends CoreEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'text' })
  message: string;
}
