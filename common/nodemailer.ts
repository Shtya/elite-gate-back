
import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  public transporter: nodemailer.Transporter;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    const emailHost = process.env.EMAIL_HOST || 'smtp.mailgun.org';
    const emailPort = parseInt(process.env.EMAIL_PORT, 10) || 587;
    const emailSecure = process.env.EMAIL_SECURE === 'true'; // true for 465, false for other ports

    if (!emailUser || !emailPass) {
      this.logger.warn('⚠️ Email credentials not found. Email service will be disabled.');
      this.logger.warn('📝 Please set EMAIL_USER and EMAIL_PASS environment variables');
      // Create a mock transporter that logs instead of sending
      this.transporter = {
        sendMail: async (options: any) => {
          this.logger.log(`📧 Mock email would be sent to: ${options.to}`);
          this.logger.log(`📝 Subject: ${options.subject}`);
          this.logger.log(`📄 Content length: ${options.html?.length || 0} characters`);
          return { messageId: 'mock-message-id' };
        },
        verify: async () => true,
      } as any;
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: emailHost,
        port: emailPort,
        secure: emailSecure, // true for 465, false for other ports
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });

      this.logger.log(`✅ Email service initialized successfully with host: ${emailHost}`);
    } catch (error) {
      this.logger.error('❌ Failed to initialize email service:', error);
      throw new Error(`Email service initialization failed: ${error.message}`);
    }
  }

  async sendOtpEmail(
    userEmail: string,
    data: {
      otp: string;
      userName: string;
      purpose: 'registration' | 'password_reset' | 'login';
    },
  ) {
    const subject = this.getEmailSubject(data.purpose);
    const htmlContent = this.generateOtpTemplate(data);

    await this.transporter.sendMail({
      to: userEmail,
      subject,
      html: htmlContent,
    });
  }

  async sendWelcomeEmail(
    userEmail: string,
    data: {
      userName: string;
      userType: string;
    },
  ) {
    const subject = 'Welcome to Our Real Estate Platform - مرحباً بك في منصة العقارات';

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Welcome</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f9f9f9;
            }
            .container {
                background: white;
                border-radius: 10px;
                padding: 30px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                border: 1px solid #e0e0e0;
            }
            .header {
                text-align: center;
                background: linear-gradient(135deg, #1e328b, #2c5aa0);
                color: white;
                padding: 20px;
                border-radius: 10px 10px 0 0;
                margin: -30px -30px 30px -30px;
            }
            .logo {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 10px;
            }
            .welcome-text {
                font-size: 20px;
                margin-bottom: 20px;
                color: #1e328b;
                text-align: center;
            }
            .user-info {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
                border-left: 4px solid #1e328b;
            }
            .features {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin: 25px 0;
            }
            .feature {
                text-align: center;
                padding: 15px;
                background: #f5f7fa;
                border-radius: 8px;
                border: 1px solid #e0e0e0;
            }
            .feature-icon {
                font-size: 24px;
                margin-bottom: 10px;
                color: #1e328b;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e0e0e0;
                color: #666;
                font-size: 14px;
            }
            .button {
                display: inline-block;
                background: #1e328b;
                color: white;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 5px;
                margin: 10px 5px;
                font-weight: bold;
            }
            .language-section {
                margin: 20px 0;
                padding: 15px;
                border-radius: 8px;
            }
            .english { border-right: 4px solid #1e328b; }
            .arabic {
                border-left: 4px solid #2c5aa0;
                text-align: right;
                direction: rtl;
            }
            .section-title {
                font-weight: bold;
                color: #1e328b;
                margin-bottom: 10px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🏠 Real Estate Platform - منصة العقارات</div>
                <h1>Welcome to Our Family - مرحباً بك في عائلتنا</h1>
            </div>

            <!-- English Section -->
            <div class="language-section english">
                <div class="section-title">English</div>
                <div class="welcome-text">
                    Hello ${data.userName} 👋
                </div>

                <p>We're delighted to have you on board! Your account as a <strong>${data.userType}</strong> has been successfully activated.</p>

                <div class="user-info">
                    <strong>Your Account Details:</strong><br>
                    - Email: ${userEmail}<br>
                    - Account Type: ${data.userType}<br>
                    - Registration Date: ${new Date().toLocaleDateString('en-US')}
                </div>

                <div class="features">
                    <div class="feature">
                        <div class="feature-icon">🔍</div>
                        <h3>Browse Properties</h3>
                        <p>Explore thousands of listings that match your preferences.</p>
                    </div>
                    <div class="feature">
                        <div class="feature-icon">📅</div>
                        <h3>Book Appointments</h3>
                        <p>Schedule property viewings quickly and easily.</p>
                    </div>
                    <div class="feature">
                        <div class="feature-icon">🤝</div>
                        <h3>Trusted Agents</h3>
                        <p>Work with verified and reliable real estate professionals.</p>
                    </div>
                    <div class="feature">
                        <div class="feature-icon">🛡️</div>
                        <h3>Secure Service</h3>
                        <p>Enjoy safe transactions and guaranteed protection.</p>
                    </div>
                </div>
            </div>

            <!-- Arabic Section -->
            <div class="language-section arabic">
                <div class="section-title">العربية</div>
                <div class="welcome-text">
                    مرحباً ${data.userName} 👋
                </div>

                <p>يسرنا انضمامك إلينا! تم تفعيل حسابك كـ <strong>${this.getArabicUserType(data.userType)}</strong> بنجاح.</p>

                <div class="user-info">
                    <strong>تفاصيل حسابك:</strong><br>
                    - البريد الإلكتروني: ${userEmail}<br>
                    - نوع الحساب: ${this.getArabicUserType(data.userType)}<br>
                    - تاريخ التسجيل: ${new Date().toLocaleDateString('ar-SA')}
                </div>

                <div class="features">
                    <div class="feature">
                        <div class="feature-icon">🔍</div>
                        <h3>تصفح العقارات</h3>
                        <p>استكشف الآلاف من العقارات التي تطابق تفضيلاتك.</p>
                    </div>
                    <div class="feature">
                        <div class="feature-icon">📅</div>
                        <h3>حجز المواعيد</h3>
                        <p>قم بحجز مواعيد معاينة العقارات بسرعة وسهولة.</p>
                    </div>
                    <div class="feature">
                        <div class="feature-icon">🤝</div>
                        <h3>وكلاء موثوقون</h3>
                        <p>تعامل مع محترفي العقارات الموثوقين والمعتمدين.</p>
                    </div>
                    <div class="feature">
                        <div class="feature-icon">🛡️</div>
                        <h3>خدمة آمنة</h3>
                        <p>استمتع بمعاملات آمنة وحماية مضمونة.</p>
                    </div>
                </div>
            </div>

            <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}" class="button">Start Your Journey - ابدأ رحلتك</a>
            </div>

            <div class="footer">
                <p>If you have any questions, feel free to reach out - إذا كان لديك أي أسئلة، فلا تتردد في التواصل معنا:</p>
                <p>📞 ${process.env.SUPPORT_PHONE || '+966500000000'}</p>
                <p>✉️ ${process.env.SUPPORT_EMAIL || 'support@realestate.com'}</p>
                <p>© 2024 Real Estate Platform. All rights reserved. - © 2024 منصة العقارات. جميع الحقوق محفوظة.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    await this.transporter.sendMail({
      to: userEmail,
      subject,
      html: htmlContent,
    });
  }

  private getEmailSubject(purpose: string): string {
    const subjects = {
      registration: 'Verification Code - New Registration - رمز التحقق - تسجيل جديد',
      password_reset: 'Password Reset Code - رمز إعادة تعيين كلمة المرور',
      login: 'Login Verification Code - رمز التحقق لتسجيل الدخول',
    };
    return subjects[purpose] || 'Verification Code - رمز التحقق';
  }

  private generateOtpTemplate(data: { otp: string; userName: string; purpose: 'registration' | 'password_reset' | 'login' }): string {
    const purposeText = {
      registration: { en: 'Register a New Account', ar: 'تسجيل حساب جديد' },
      password_reset: { en: 'Reset Your Password', ar: 'إعادة تعيين كلمة المرور' },
      login: { en: 'Login to Your Account', ar: 'تسجيل الدخول إلى حسابك' },
    };

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Verification Code</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f9f9f9;
            }
            .container {
                background: white;
                border-radius: 10px;
                padding: 30px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                border: 1px solid #e0e0e0;
            }
            .header {
                text-align: center;
                background: linear-gradient(135deg, #1e328b, #2c5aa0);
                color: white;
                padding: 20px;
                border-radius: 10px 10px 0 0;
                margin: -30px -30px 30px -30px;
            }
            .otp-code {
                background: linear-gradient(135deg, #1e328b, #2c5aa0);
                color: white;
                font-size: 32px;
                font-weight: bold;
                padding: 20px;
                text-align: center;
                border-radius: 8px;
                margin: 20px 0;
                letter-spacing: 8px;
                font-family: 'Courier New', monospace;
            }
            .warning {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                color: #856404;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
                text-align: center;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e0e0e0;
                color: #666;
                font-size: 14px;
            }
            .purpose-badge {
                display: inline-block;
                background: #e3f2fd;
                color: #1e328b;
                padding: 8px 16px;
                border-radius: 20px;
                font-weight: bold;
                margin: 10px 0;
            }
            .language-section {
                margin: 20px 0;
                padding: 15px;
                border-radius: 8px;
            }
            .english { border-right: 4px solid #1e328b; }
            .arabic {
                border-left: 4px solid #2c5aa0;
                text-align: right;
                direction: rtl;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏠 Real Estate Platform - منصة العقارات</h1>
                <p>Secure Verification Code - رمز التحقق الآمن</p>
            </div>

            <!-- English Section -->
            <div class="language-section english">
                <p>Dear <strong>${data.userName}</strong>,</p>

                <div class="purpose-badge">
                    ${purposeText[data.purpose].en}
                </div>

                <p>Please use the verification code below to complete your request:</p>

                <div class="otp-code">
                    ${data.otp}
                </div>

                <div class="warning">
                    ⚠️ <strong>Important:</strong><br>
                    This code is valid for 10 minutes only.<br>
                    Do not share this code with anyone.
                </div>

                <p>If you did not request this code, please ignore this message.</p>
            </div>

            <!-- Arabic Section -->
            <div class="language-section arabic">
                <p>عزيزي <strong>${data.userName}</strong>,</p>

                <div class="purpose-badge">
                    ${purposeText[data.purpose].ar}
                </div>

                <p>يرجى استخدام رمز التحقق أدناه لإكمال طلبك:</p>

                <div class="otp-code">
                    ${data.otp}
                </div>

                <div class="warning">
                    ⚠️ <strong>مهم:</strong><br>
                    هذا الرمز صالح لمدة 10 دقائق فقط.<br>
                    لا تشارك هذا الرمز مع أي شخص.
                </div>

                <p>إذا لم تطلب هذا الرمز، يرجى تجاهل هذه الرسالة.</p>
            </div>

            <div class="footer">
                <p>Best regards,<br>The Real Estate Platform Team 🏠</p>
                <p>مع أطيب التحيات,<br>فريق منصة العقارات 🏠</p>
                <p>📞 ${process.env.SUPPORT_PHONE || '+966500000000'} | ✉️ ${process.env.SUPPORT_EMAIL || 'support@realestate.com'}</p>
                <p>© 2024 Real Estate Platform. All rights reserved. - © 2024 منصة العقارات. جميع الحقوق محفوظة.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  generateApprovalTemplate(email: string, p0: string, data: { userName: string; propertyTitle: string; requestId: number; }) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Listing Request Approved</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f9f9f9;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background: white;
          border-radius: 10px;
          padding: 30px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          border: 1px solid #e0e0e0;
        }
        .header {
          text-align: center;
          background: linear-gradient(135deg, #1e328b, #2c5aa0);
          color: white;
          padding: 20px;
          border-radius: 10px 10px 0 0;
          margin: -30px -30px 30px -30px;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
          color: #666;
          font-size: 14px;
        }
        .button {
          display: inline-block;
          background: #1e328b;
          color: white;
          padding: 12px 25px;
          border-radius: 5px;
          text-decoration: none;
          margin: 20px 0;
          font-weight: bold;
        }
        .language-section {
          margin: 20px 0;
          padding: 15px;
          border-radius: 8px;
        }
        .english { border-right: 4px solid #1e328b; }
        .arabic {
          border-left: 4px solid #2c5aa0;
          text-align: right;
          direction: rtl;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏠 Listing Approved - تم الموافقة على القائمة</h1>
        </div>

        <!-- English Section -->
        <div class="language-section english">
          <p>Dear <strong>${data.userName}</strong>,</p>
          <p>Good news! Your property listing request <strong>#${data.requestId}</strong> for <strong>${data.propertyTitle}</strong> has been <span style="color:green;font-weight:bold;">approved</span> after inspection.</p>
          <p>You can now proceed to publish your property or review the details on your dashboard.</p>
        </div>

        <!-- Arabic Section -->
        <div class="language-section arabic">
          <p>عزيزي <strong>${data.userName}</strong>,</p>
          <p>أخبار سعيدة! تم <span style="color:green;font-weight:bold;">الموافقة</span> على طلب قائمة العقار الخاص بك <strong>#${data.requestId}</strong> للملكية <strong>${data.propertyTitle}</strong> بعد التفتيش.</p>
          <p>يمكنك الآن المتابعة لنشر عقارك أو مراجعة التفاصيل في لوحة التحكم.</p>
        </div>

        <div style="text-align:center;">
          <a href="${process.env.FRONTEND_URL}/dashboard/listings/${data.requestId}" class="button">View Listing - عرض القائمة</a>
        </div>

        <div class="footer">
          <p>📞 ${process.env.SUPPORT_PHONE || '+966500000000'} | ✉️ ${process.env.SUPPORT_EMAIL || 'support@realestate.com'}</p>
          <p>© 2024 Real Estate Platform. All rights reserved. - © 2024 منصة العقارات. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </body>
    </html>`;
  }

  generateRejectionTemplate(email: string, p0: string, p1: { userName: string; propertyTitle: any; requestId: number; }, data: { userName: string; propertyTitle: string; reason: string; requestId: number; }) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Listing Request Rejected</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f9f9f9;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background: white;
          border-radius: 10px;
          padding: 30px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          border: 1px solid #e0e0e0;
        }
        .header {
          text-align: center;
          background: linear-gradient(135deg, #a83232, #c94b4b);
          color: white;
          padding: 20px;
          border-radius: 10px 10px 0 0;
          margin: -30px -30px 30px -30px;
        }
        .reason {
          background: #fff3f3;
          border-left: 4px solid #c94b4b;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
          color: #666;
          font-size: 14px;
        }
        .language-section {
          margin: 20px 0;
          padding: 15px;
          border-radius: 8px;
        }
        .english { border-right: 4px solid #a83232; }
        .arabic {
          border-left: 4px solid #c94b4b;
          text-align: right;
          direction: rtl;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>❌ Listing Request Rejected - تم رفض طلب القائمة</h1>
        </div>

        <!-- English Section -->
        <div class="language-section english">
          <p>Dear <strong>${data.userName}</strong>,</p>
          <p>We regret to inform you that your property listing request <strong>#${data.requestId}</strong> for <strong>${data.propertyTitle}</strong> has been <span style="color:red;font-weight:bold;">rejected</span>.</p>
          <div class="reason">
            <strong>Reason:</strong><br>${data.reason}
          </div>
          <p>You may review your submission and make the necessary corrections before resubmitting.</p>
        </div>

        <!-- Arabic Section -->
        <div class="language-section arabic">
          <p>عزيزي <strong>${data.userName}</strong>,</p>
          <p>نأسف لإبلاغك بأن طلب قائمة العقار الخاص بك <strong>#${data.requestId}</strong> للملكية <strong>${data.propertyTitle}</strong> قد تم <span style="color:red;font-weight:bold;">رفضه</span>.</p>
          <div class="reason">
            <strong>السبب:</strong><br>${data.reason}
          </div>
          <p>يمكنك مراجعة طلبك وإجراء التصحيحات اللازمة قبل إعادة الإرسال.</p>
        </div>

        <div class="footer">
          <p>📞 ${process.env.SUPPORT_PHONE || '+966500000000'} | ✉️ ${process.env.SUPPORT_EMAIL || 'support@realestate.com'}</p>
          <p>© 2024 Real Estate Platform. All rights reserved. - © 2024 منصة العقارات. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </body>
    </html>`;
  }

  generatePublishTemplate(data: { userName: string; propertyTitle: string; propertyUrl: string }) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Listing Published</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f9f9f9;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background: white;
          border-radius: 10px;
          padding: 30px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          border: 1px solid #e0e0e0;
        }
        .header {
          text-align: center;
          background: linear-gradient(135deg, #1e8b42, #2ca04e);
          color: white;
          padding: 20px;
          border-radius: 10px 10px 0 0;
          margin: -30px -30px 30px -30px;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
          color: #666;
          font-size: 14px;
        }
        .button {
          display: inline-block;
          background: #1e8b42;
          color: white;
          padding: 12px 25px;
          border-radius: 5px;
          text-decoration: none;
          margin: 20px 0;
          font-weight: bold;
        }
        .language-section {
          margin: 20px 0;
          padding: 15px;
          border-radius: 8px;
        }
        .english { border-right: 4px solid #1e8b42; }
        .arabic {
          border-left: 4px solid #2ca04e;
          text-align: right;
          direction: rtl;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Listing Published Successfully - تم نشر القائمة بنجاح</h1>
        </div>

        <!-- English Section -->
        <div class="language-section english">
          <p>Dear <strong>${data.userName}</strong>,</p>
          <p>Congratulations! Your property <strong>${data.propertyTitle}</strong> has been successfully <span style="color:green;font-weight:bold;">published</span> on our platform.</p>
          <p>Your listing is now live and visible to potential buyers and renters.</p>
        </div>

        <!-- Arabic Section -->
        <div class="language-section arabic">
          <p>عزيزي <strong>${data.userName}</strong>,</p>
          <p>مبروك! تم <span style="color:green;font-weight:bold;">نشر</span> عقارك <strong>${data.propertyTitle}</strong> بنجاح على منصتنا.</p>
          <p>قائمتك الآن نشطة ومرئية للمشترين والمستأجرين المحتملين.</p>
        </div>

        <div class="footer">
          <p>📞 ${process.env.SUPPORT_PHONE || '+966500000000'} | ✉️ ${process.env.SUPPORT_EMAIL || 'support@realestate.com'}</p>
          <p>© 2024 Real Estate Platform. All rights reserved. - © 2024 منصة العقارات. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </body>
    </html>`;
  }

  private getArabicUserType(userType: string): string {
    const userTypes: { [key: string]: string } = {
      'buyer': 'مشتري',
      'seller': 'بائع',
      'tenant': 'مستأجر',
      'landlord': 'مالك',
      'agent': 'وسيط عقاري',
      'admin': 'مدير',
      'user': 'مستخدم'
    };
    return userTypes[userType.toLowerCase()] || userType;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('✅ Email server connection established');
      return true;
    } catch (error) {
      console.error('❌ Email server connection failed:', error);
      return false;
    }
  }
}