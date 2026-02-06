/**
 * Email Service - Resend integration for email verification
 */

interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
}

export class EmailService {
    private static apiKey = process.env.RESEND_API_KEY;
    private static fromEmail = process.env.EMAIL_FROM || 'Mimy <noreply@mimy.app>';

    /**
     * Send verification code email
     */
    static async sendVerificationCode(email: string, code: string): Promise<boolean> {
        if (!this.apiKey) {
            console.error('[EmailService] RESEND_API_KEY not configured');
            // In development, just log the code
            console.log(`[EmailService] DEV MODE - Verification code for ${email}: ${code}`);
            return true;
        }

        try {
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: this.fromEmail,
                    to: email,
                    subject: '[Mimy] 이메일 인증 코드',
                    html: this.getVerificationEmailTemplate(code),
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                console.error('[EmailService] Failed to send email:', error);
                return false;
            }

            console.log(`[EmailService] Verification email sent to ${email}`);
            return true;
        } catch (error) {
            console.error('[EmailService] Error sending email:', error);
            return false;
        }
    }

    /**
     * Generate 6-digit verification code
     */
    static generateCode(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * Get verification email HTML template
     */
    private static getVerificationEmailTemplate(code: string): string {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 400px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Mimy</h1>
        </div>
        <div style="padding: 32px;">
            <h2 style="margin: 0 0 16px; font-size: 20px; color: #333;">이메일 인증</h2>
            <p style="margin: 0 0 24px; color: #666; line-height: 1.5;">
                아래 인증 코드를 앱에 입력해주세요.
            </p>
            <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; text-align: center;">
                <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #333; font-family: 'SF Mono', Monaco, monospace;">
                    ${code}
                </div>
            </div>
            <p style="margin: 24px 0 0; color: #999; font-size: 14px; text-align: center;">
                이 코드는 5분간 유효합니다.
            </p>
        </div>
        <div style="background: #f8f9fa; padding: 16px; text-align: center;">
            <p style="margin: 0; color: #999; font-size: 12px;">
                본인이 요청하지 않았다면 이 이메일을 무시해주세요.
            </p>
        </div>
    </div>
</body>
</html>
        `.trim();
    }
}
