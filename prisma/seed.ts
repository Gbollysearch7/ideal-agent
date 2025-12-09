import { PrismaClient, PlanType, ContactStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create a demo user
  const hashedPassword = await bcrypt.hash('demo123456', 12);

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@emailplatform.com' },
    update: {},
    create: {
      email: 'demo@emailplatform.com',
      passwordHash: hashedPassword,
      name: 'Demo User',
      companyName: 'Demo Company',
      planType: PlanType.PRO,
    },
  });

  console.log('Created demo user:', demoUser.email);

  // Create sample lists
  const newsletterList = await prisma.list.upsert({
    where: { id: 'demo-newsletter-list' },
    update: {},
    create: {
      id: 'demo-newsletter-list',
      userId: demoUser.id,
      name: 'Newsletter Subscribers',
      description: 'Main newsletter subscriber list',
      contactCount: 0,
    },
  });

  const vipList = await prisma.list.upsert({
    where: { id: 'demo-vip-list' },
    update: {},
    create: {
      id: 'demo-vip-list',
      userId: demoUser.id,
      name: 'VIP Customers',
      description: 'High-value customers with priority access',
      contactCount: 0,
    },
  });

  console.log('Created sample lists');

  // Create sample contacts
  const sampleContacts = [
    {
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      status: ContactStatus.SUBSCRIBED,
      tags: ['customer', 'newsletter'],
    },
    {
      email: 'jane.smith@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      status: ContactStatus.SUBSCRIBED,
      tags: ['customer', 'vip'],
    },
    {
      email: 'bob.wilson@example.com',
      firstName: 'Bob',
      lastName: 'Wilson',
      status: ContactStatus.SUBSCRIBED,
      tags: ['prospect'],
    },
    {
      email: 'alice.johnson@example.com',
      firstName: 'Alice',
      lastName: 'Johnson',
      status: ContactStatus.SUBSCRIBED,
      tags: ['customer', 'newsletter', 'vip'],
    },
    {
      email: 'charlie.brown@example.com',
      firstName: 'Charlie',
      lastName: 'Brown',
      status: ContactStatus.UNSUBSCRIBED,
      tags: ['former-customer'],
    },
  ];

  for (const contactData of sampleContacts) {
    const contact = await prisma.contact.upsert({
      where: {
        userId_email: {
          userId: demoUser.id,
          email: contactData.email,
        },
      },
      update: {},
      create: {
        userId: demoUser.id,
        ...contactData,
        metadata: {
          company: 'Sample Company',
          source: 'website',
        },
      },
    });

    // Add to newsletter list if has newsletter tag
    if (contactData.tags.includes('newsletter')) {
      await prisma.listContact.upsert({
        where: {
          listId_contactId: {
            listId: newsletterList.id,
            contactId: contact.id,
          },
        },
        update: {},
        create: {
          listId: newsletterList.id,
          contactId: contact.id,
        },
      });
    }

    // Add to VIP list if has vip tag
    if (contactData.tags.includes('vip')) {
      await prisma.listContact.upsert({
        where: {
          listId_contactId: {
            listId: vipList.id,
            contactId: contact.id,
          },
        },
        update: {},
        create: {
          listId: vipList.id,
          contactId: contact.id,
        },
      });
    }
  }

  // Update list contact counts
  const newsletterCount = await prisma.listContact.count({
    where: { listId: newsletterList.id },
  });
  await prisma.list.update({
    where: { id: newsletterList.id },
    data: { contactCount: newsletterCount },
  });

  const vipCount = await prisma.listContact.count({
    where: { listId: vipList.id },
  });
  await prisma.list.update({
    where: { id: vipList.id },
    data: { contactCount: vipCount },
  });

  console.log('Created sample contacts');

  // Create a sample email template
  const welcomeTemplate = await prisma.emailTemplate.upsert({
    where: { id: 'demo-welcome-template' },
    update: {},
    create: {
      id: 'demo-welcome-template',
      userId: demoUser.id,
      name: 'Welcome Email',
      subject: 'Welcome to {{company_name}}!',
      htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #2563eb;">Welcome, {{first_name}}!</h1>
  <p>Thank you for joining our community. We're thrilled to have you on board!</p>
  <p>Here's what you can expect from us:</p>
  <ul>
    <li>Weekly newsletters with valuable insights</li>
    <li>Exclusive offers and promotions</li>
    <li>Early access to new features</li>
  </ul>
  <p>If you have any questions, feel free to reply to this email.</p>
  <p>Best regards,<br>The Team</p>
</body>
</html>
      `,
      textContent: `
Welcome, {{first_name}}!

Thank you for joining our community. We're thrilled to have you on board!

Here's what you can expect from us:
- Weekly newsletters with valuable insights
- Exclusive offers and promotions
- Early access to new features

If you have any questions, feel free to reply to this email.

Best regards,
The Team
      `,
      previewText: 'Welcome aboard! Here\'s what to expect...',
      isDraft: false,
    },
  });

  console.log('Created sample email template');

  // Create a sample draft campaign
  await prisma.campaign.upsert({
    where: { id: 'demo-draft-campaign' },
    update: {},
    create: {
      id: 'demo-draft-campaign',
      userId: demoUser.id,
      name: 'Monthly Newsletter - January',
      subject: 'Your January Newsletter is Here!',
      fromName: 'Demo Company',
      fromEmail: 'newsletter@demo.com',
      replyTo: 'support@demo.com',
      templateId: welcomeTemplate.id,
      htmlContent: welcomeTemplate.htmlContent,
      textContent: welcomeTemplate.textContent,
      listIds: [newsletterList.id],
    },
  });

  console.log('Created sample campaign');

  console.log('Database seed completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Error seeding database:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
