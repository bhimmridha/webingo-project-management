const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Generic email sender
 */
const sendEmail = async (to, subject, html) => {
  const msg = {
    to,
    from: process.env.FROM_EMAIL,
    subject,
    html,
  };

  try {
    await sgMail.send(msg);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error("SendGrid Error:", error.response?.body || error);
    throw error;
  }
};

/**
 * Password Reset Email
 */
exports.sendPasswordResetEmail = async (to, resetToken) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  const html = `
    <div style="font-family: Arial; max-width:500px;margin:auto;background:#1a1a2e;padding:32px;border-radius:12px;">
      <h2 style="color:#6c63ff;">Password Reset Request</h2>
      <p style="color:#e8e8f0;">Click below to reset your password:</p>
      <a href="${resetUrl}" style="display:inline-block;background:#6c63ff;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">
        Reset Password
      </a>
      <p style="color:#a0a0b8;font-size:12px;">Link expires in 1 hour.</p>
    </div>
  `;

  await sendEmail(to, "Password Reset - Webingo Project Management", html);
};

/**
 * Invitation Email
 */
exports.sendInvitationEmail = async (to, inviterName, projectName, inviteLink) => {
  const html = `
    <div style="font-family: Arial; max-width:500px;margin:auto;background:#1a1a2e;padding:32px;border-radius:12px;">
      <h2 style="color:#6c63ff;">Project Invitation</h2>
      <p style="color:#e8e8f0;">${inviterName} invited you to <b>${projectName}</b>.</p>
      <a href="${inviteLink}" style="display:inline-block;background:#6c63ff;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">
        Accept Invitation
      </a>
    </div>
  `;

  await sendEmail(to, `You're invited to ${projectName}`, html);
};

/**
 * Project Member Added Email
 */
exports.sendProjectMemberEmail = async (to, inviterName, projectName, role) => {
  const html = `
    <div style="font-family: Arial; max-width:500px;margin:auto;background:#1a1a2e;padding:32px;border-radius:12px;">
      <h2 style="color:#6c63ff;">Project Access Granted</h2>
      <p style="color:#e8e8f0;">
        ${inviterName} added you to <b>${projectName}</b> as <b>${role}</b>.
      </p>
    </div>
  `;

  await sendEmail(to, `Added to ${projectName}`, html);
};

/**
 * Task Assignment Email
 */
exports.sendTaskAssignmentEmail = async (to, assignerName, taskTitle, projectName) => {
  const html = `
    <div style="font-family: Arial; max-width:500px;margin:auto;background:#1a1a2e;padding:32px;border-radius:12px;">
      <h2 style="color:#6c63ff;">New Task Assigned</h2>
      <p style="color:#e8e8f0;">
        ${assignerName} assigned you <b>${taskTitle}</b> in <b>${projectName}</b>.
      </p>
    </div>
  `;

  await sendEmail(to, `New Task: ${taskTitle}`, html);
};

/**
 * Task Status Change Email
 */
exports.sendTaskStatusChangeEmail = async (to, updaterName, taskTitle, status, projectName) => {
  const html = `
    <div style="font-family: Arial; max-width:500px;margin:auto;background:#1a1a2e;padding:32px;border-radius:12px;">
      <h2 style="color:#6c63ff;">Task Status Updated</h2>
      <p style="color:#e8e8f0;">
        ${updaterName} changed <b>${taskTitle}</b> to <b>${status}</b> in <b>${projectName}</b>.
      </p>
    </div>
  `;

  await sendEmail(to, `Status Updated: ${taskTitle}`, html);
};

/**
 * Email Verification
 */
exports.sendEmailVerificationEmail = async (to, verificationToken) => {
  const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;

  const html = `
    <div style="font-family: Arial; max-width:500px;margin:auto;background:#1a1a2e;padding:32px;border-radius:12px;">
      <h2 style="color:#6c63ff;">Verify Your Email</h2>
      <p style="color:#e8e8f0;">Click below to verify your email:</p>
      <a href="${verificationUrl}" style="display:inline-block;background:#6c63ff;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">
        Verify Email
      </a>
      <p style="color:#a0a0b8;font-size:12px;">This link expires in 1 minute.</p>
    </div>
  `;

  await sendEmail(to, "Verify Your Email - Webingo Project Management", html);
};