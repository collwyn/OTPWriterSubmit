import nodemailer from 'nodemailer';
import { Article, User } from '@shared/schema';

// Create a test account if no email credentials provided
let testAccount: nodemailer.TestAccount | null = null;

// Initialize transporter
async function getTransporter() {
  // Use environment variables if available
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // Create a test account for development
  if (!testAccount) {
    testAccount = await nodemailer.createTestAccount();
  }

  // Create a test SMTP service
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

export async function sendSubmissionNotification(article: Article, user: User, adminEmails: string[]) {
  try {
    const transporter = await getTransporter();
    
    // Format email to admins
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'newspaper@example.com',
      to: adminEmails.join(', '),
      subject: `New Article Submission: ${article.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0F2C4D;">New Article Submission</h2>
          <p>A new article has been submitted to The Chronicle.</p>
          
          <div style="border-left: 4px solid #0F2C4D; padding-left: 15px; margin: 20px 0;">
            <h3 style="margin-bottom: 5px;">${article.title}</h3>
            <p style="color: #757575; margin-top: 0;">By: ${user.username} (${user.email})</p>
          </div>
          
          <h4>Summary:</h4>
          <p>${article.summary}</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 20px;">
            <p style="margin: 0;"><strong>Category:</strong> ${article.category}</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> ${article.status}</p>
            <p style="margin: 5px 0;"><strong>Submitted On:</strong> ${article.createdAt.toLocaleString()}</p>
          </div>
          
          <p style="margin-top: 30px;">
            Please log in to the <a href="http://localhost:5000/admin" style="color: #0F2C4D;">admin dashboard</a> to review this submission.
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    
    // Log ethereal URL for testing in development
    if (testAccount) {
      console.log('Email preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    
    return true;
  } catch (error) {
    console.error('Failed to send email notification:', error);
    return false;
  }
}
