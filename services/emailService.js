const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: '587',
  secure: false,
  auth: {
    user: "a0878d001@smtp-brevo.com",
    pass: process.env.SMTP_PASS,
  },
});

exports.sendPasswordResetEmail = async (to, resetToken) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject: 'Password Reset - Webingo Project Management',
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #1a1a2e; padding: 32px; border-radius: 12px;">
        <h2 style="color: #6c63ff; margin-bottom: 16px;">Password Reset Request</h2>
        <p style="color: #e8e8f0;">You requested a password reset. Click the button below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; background: #6c63ff; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0; font-weight: 600;">Reset Password</a>
        <p style="color: #a0a0b8; font-size: 12px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

exports.sendInvitationEmail = async (to, inviterName, projectName, inviteLink) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject: `You're invited to ${projectName} - Webingo PM`,
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #1a1a2e; padding: 32px; border-radius: 12px;">
        <h2 style="color: #6c63ff; margin-bottom: 16px;">Project Invitation</h2>
        <p style="color: #e8e8f0;">${inviterName} invited you to join <strong>${projectName}</strong>.</p>
        <a href="${inviteLink}" style="display: inline-block; background: #6c63ff; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0; font-weight: 600;">Accept Invitation</a>
        <p style="color: #a0a0b8; font-size: 12px;">This invitation expires in 7 days.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

exports.sendProjectMemberEmail = async (to, inviterName, projectName, role) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject: `You were added to ${projectName} - Webingo PM`,
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #1a1a2e; padding: 32px; border-radius: 12px;">
        <h2 style="color: #6c63ff; margin-bottom: 16px;">Project Access Granted</h2>
        <p style="color: #e8e8f0;">${inviterName} has added you to <strong>${projectName}</strong> as <strong>${role}</strong>.</p>
        <p style="color: #a0a0b8; font-size: 12px;">You can sign in and start collaborating now.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

exports.sendTaskAssignmentEmail = async (to, assignerName, taskTitle, projectName) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject: `New task assigned: ${taskTitle}`,
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #1a1a2e; padding: 32px; border-radius: 12px;">
        <h2 style="color: #6c63ff; margin-bottom: 16px;">New Task Assigned</h2>
        <p style="color: #e8e8f0;">${assignerName} assigned you to <strong>${taskTitle}</strong> in <strong>${projectName}</strong>.</p>
        <p style="color: #a0a0b8; font-size: 12px;">Open Webingo PM to view the updated task and progress.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

exports.sendTaskStatusChangeEmail = async (to, updaterName, taskTitle, status, projectName) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject: `Task status updated: ${taskTitle}`,
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #1a1a2e; padding: 32px; border-radius: 12px;">
        <h2 style="color: #6c63ff; margin-bottom: 16px;">Task Status Changed</h2>
        <p style="color: #e8e8f0;">${updaterName} changed the status of <strong>${taskTitle}</strong> to <strong>${status}</strong> in <strong>${projectName}</strong>.</p>
        <p style="color: #a0a0b8; font-size: 12px;">Open Webingo PM to review the updated task.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

exports.sendEmailVerificationEmail = async (to, verificationToken) => {
  const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject: 'Verify Your Email - Webingo Project Management',
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #1a1a2e; padding: 32px; border-radius: 12px;">
        <h2 style="color: #6c63ff; margin-bottom: 16px;">Verify Your Email</h2>
        <p style="color: #e8e8f0;">Welcome to Webingo! Please verify your email address by clicking the button below:</p>
        <a href="${verificationUrl}" style="display: inline-block; background: #6c63ff; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0; font-weight: 600;">Verify Email</a>
        <p style="color: #a0a0b8; font-size: 12px;">This link expires in 1 minute. If you didn't create this account, ignore this email.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};
