import sgMail from '@sendgrid/mail';
import { Article, User } from '@shared/schema';

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('SendGrid API initialized successfully');
} else {
  console.warn('SENDGRID_API_KEY not found. Email notifications will not work.');
}

export async function sendSubmissionNotification(article: Article, user: User, adminEmails: string[]) {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.log('SendGrid API key not configured. Skipping email notification.');
      return false;
    }

    // Get category display name
    const getCategoryName = (category: string) => {
      const categoryMap: { [key: string]: string } = {
        'local': 'Local News',
        'business': 'Business',
        'technology': 'Technology',
        'arts': 'Arts & Culture',
        'sports': 'Sports',
        'opinion': 'Opinion',
        'lifestyle': 'Lifestyle',
        'newsletter': 'Newsletter'
      };
      return categoryMap[category] || category;
    };

    // Send email to each admin separately for better delivery
    const emailPromises = adminEmails.map(async (adminEmail) => {
      const msg = {
        to: adminEmail,
        from: process.env.EMAIL_FROM || 'admin@ourtimepress.com',
        subject: `New Article Submission: ${article.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <div style="background: linear-gradient(135deg, #0F2C4D 0%, #1a4068 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 300;">Our Time Press</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">New Article Submission</p>
            </div>

            <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <p style="font-size: 16px; line-height: 1.6; margin-top: 0;">
                A new article has been submitted for review by <strong>${user.username}</strong>.
              </p>

              <div style="background: #f8f9fa; border-left: 4px solid #0F2C4D; padding: 20px; margin: 25px 0; border-radius: 4px;">
                <h2 style="margin: 0 0 10px 0; color: #0F2C4D; font-size: 20px;">${article.title}</h2>
                <p style="margin: 0; color: #6c757d; font-size: 14px;">
                  <strong>Author:</strong> ${user.username} (${user.email})<br>
                  <strong>Category:</strong> ${getCategoryName(article.category)}<br>
                  <strong>Status:</strong> ${article.status}<br>
                  <strong>Submitted:</strong> ${new Date(article.createdAt).toLocaleString()}
                </p>
              </div>

              <div style="margin: 25px 0;">
                <h3 style="color: #0F2C4D; margin-bottom: 10px;">Summary:</h3>
                <p style="line-height: 1.6; color: #555;">${article.summary}</p>
              </div>

              <div style="text-align: center; margin-top: 35px;">
                <a href="${process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/auth` : 'http://localhost:5000/auth'}"
                   style="background: #0F2C4D; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: 500; display: inline-block;">
                  Review Article
                </a>
              </div>

              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #6c757d; font-size: 12px; text-align: center;">
                <p style="margin: 0;">This is an automated notification from Our Time Press.</p>
              </div>
            </div>
          </div>
        `
      };

      return sgMail.send(msg);
    });

    await Promise.all(emailPromises);
    console.log(`Email notifications sent to ${adminEmails.length} admin(s) for article: ${article.title}`);
    return true;

  } catch (error) {
    console.error('Failed to send email notification:', error);
    return false;
  }
}