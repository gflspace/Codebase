import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@deexhairlabb.com' },
    update: {},
    create: {
      email: 'admin@deexhairlabb.com',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      phone: '+1234567890',
    },
  });

  // Seed business hours (Monday-Saturday, 9 AM - 6 PM)
  const businessHours = [
    { dayOfWeek: 0, isOpen: false, openTime: null, closeTime: null }, // Sunday
    { dayOfWeek: 1, isOpen: true, openTime: '09:00', closeTime: '18:00' }, // Monday
    { dayOfWeek: 2, isOpen: true, openTime: '09:00', closeTime: '18:00' }, // Tuesday
    { dayOfWeek: 3, isOpen: true, openTime: '09:00', closeTime: '18:00' }, // Wednesday
    { dayOfWeek: 4, isOpen: true, openTime: '09:00', closeTime: '18:00' }, // Thursday
    { dayOfWeek: 5, isOpen: true, openTime: '09:00', closeTime: '18:00' }, // Friday
    { dayOfWeek: 6, isOpen: true, openTime: '09:00', closeTime: '18:00' }, // Saturday
  ];

  for (const hours of businessHours) {
    await prisma.businessHours.upsert({
      where: { dayOfWeek: hours.dayOfWeek },
      update: hours,
      create: hours,
    });
  }

  // Seed sample hairstyles with images
  await prisma.hairstyle.createMany({
    data: [
      {
        name: 'Box Braids',
        description: 'Classic box braids in various lengths and styles',
        imageUrl: 'https://images.unsplash.com/photo-1560869713-7d0a8a5e0b0a?w=800&q=80',
        galleryUrls: [
          'https://images.unsplash.com/photo-1560869713-7d0a8a5e0b0a?w=800&q=80',
          'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=800&q=80',
        ],
        price: 150.00,
        duration: 180,
        tags: ['braids', 'protective', 'long-lasting'],
        featured: true,
        published: true,
      },
      {
        name: 'Cornrows',
        description: 'Elegant cornrow designs and patterns',
        imageUrl: 'https://images.unsplash.com/photo-1594736797933-d0cbc0c0e0a0?w=800&q=80',
        galleryUrls: [
          'https://images.unsplash.com/photo-1594736797933-d0cbc0c0e0a0?w=800&q=80',
        ],
        price: 80.00,
        duration: 120,
        tags: ['braids', 'cornrows', 'versatile'],
        featured: true,
        published: true,
      },
      {
        name: 'Goddess Braids',
        description: 'Beautiful goddess braids with extensions',
        imageUrl: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800&q=80',
        galleryUrls: [
          'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800&q=80',
        ],
        price: 200.00,
        duration: 240,
        tags: ['braids', 'goddess', 'elegant'],
        featured: false,
        published: true,
      },
      {
        name: 'Knotless Braids',
        description: 'Natural-looking knotless braids for comfort',
        imageUrl: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=800&q=80',
        galleryUrls: [
          'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=800&q=80',
        ],
        price: 180.00,
        duration: 240,
        tags: ['braids', 'knotless', 'comfortable'],
        featured: true,
        published: true,
      },
      {
        name: 'Fulani Braids',
        description: 'Traditional Fulani braids with decorative beads',
        imageUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&q=80',
        galleryUrls: [
          'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&q=80',
        ],
        price: 160.00,
        duration: 200,
        tags: ['braids', 'fulani', 'traditional'],
        featured: true,
        published: true,
      },
    ],
    skipDuplicates: true,
  });

  // Seed sample social media links
  await prisma.socialMedia.createMany({
    data: [
      {
        platform: 'Instagram',
        url: 'https://instagram.com/deexhairlabb',
        icon: 'instagram',
        order: 1,
        active: true,
      },
      {
        platform: 'Facebook',
        url: 'https://facebook.com/deexhairlabb',
        icon: 'facebook',
        order: 2,
        active: true,
      },
      {
        platform: 'TikTok',
        url: 'https://tiktok.com/@deexhairlabb',
        icon: 'tiktok',
        order: 3,
        active: true,
      },
    ],
    skipDuplicates: true,
  });

  // Seed sample clients
  const clients = await prisma.client.createMany({
    data: [
      {
        firstName: 'Sarah',
        lastName: 'Johnson',
        phone: '+15551234567',
        email: 'sarah.johnson@example.com',
        notes: 'Prefers box braids, regular client',
      },
      {
        firstName: 'Maria',
        lastName: 'Garcia',
        phone: '+15552345678',
        email: 'maria.garcia@example.com',
        notes: 'Loves goddess braids',
      },
      {
        firstName: 'Jessica',
        lastName: 'Williams',
        phone: '+15553456789',
        email: 'jessica.williams@example.com',
      },
      {
        firstName: 'Amanda',
        lastName: 'Brown',
        phone: '+15554567890',
        email: 'amanda.brown@example.com',
      },
      {
        firstName: 'Nicole',
        lastName: 'Davis',
        phone: '+15555678901',
        email: 'nicole.davis@example.com',
      },
    ],
    skipDuplicates: true,
  });

  // Get created clients for appointments
  const clientList = await prisma.client.findMany();
  const sarah = clientList.find(c => c.firstName === 'Sarah');
  const maria = clientList.find(c => c.firstName === 'Maria');
  const jessica = clientList.find(c => c.firstName === 'Jessica');
  const amanda = clientList.find(c => c.firstName === 'Amanda');

  // Create future appointments
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const dayAfter = new Date(now);
  dayAfter.setDate(dayAfter.getDate() + 2);
  dayAfter.setHours(14, 0, 0, 0);

  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(11, 0, 0, 0);

  const appointments = [];
  if (sarah) {
    const end1 = new Date(tomorrow);
    end1.setHours(13, 0, 0, 0);
    appointments.push({
      clientId: sarah.id,
      adminId: admin.id,
      hairstyleName: 'Box Braids',
      price: 150.00,
      startTime: tomorrow,
      endTime: end1,
      duration: 180,
      status: 'CONFIRMED',
      notes: 'Regular appointment',
    });
  }

  if (maria) {
    const end2 = new Date(dayAfter);
    end2.setHours(18, 0, 0, 0);
    appointments.push({
      clientId: maria.id,
      adminId: admin.id,
      hairstyleName: 'Goddess Braids',
      price: 200.00,
      startTime: dayAfter,
      endTime: end2,
      duration: 240,
      status: 'CONFIRMED',
    });
  }

  if (jessica) {
    const end3 = new Date(nextWeek);
    end3.setHours(15, 0, 0, 0);
    appointments.push({
      clientId: jessica.id,
      adminId: admin.id,
      hairstyleName: 'Cornrows',
      price: 80.00,
      startTime: nextWeek,
      endTime: end3,
      duration: 120,
      status: 'CONFIRMED',
    });
  }

  const createdAppointments = await prisma.appointment.createMany({
    data: appointments,
    skipDuplicates: true,
  });

  // Create revenue logs for completed appointments (past appointments)
  const pastAppointments = await prisma.appointment.findMany({
    where: {
      status: 'COMPLETED',
    },
  });

  for (const apt of pastAppointments.slice(0, 5)) {
    await prisma.revenueLog.upsert({
      where: { appointmentId: apt.id },
      update: {},
      create: {
        appointmentId: apt.id,
        clientId: apt.clientId,
        amount: apt.price,
        hairstyleName: apt.hairstyleName,
        date: apt.startTime,
      },
    });
  }

  // Seed calendar blocks (some blocked days, some open)
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(1);
  nextMonth.setHours(0, 0, 0, 0);

  // Block a holiday (e.g., New Year's Day)
  const holiday = new Date(now);
  holiday.setMonth(0, 1); // January 1st
  holiday.setHours(0, 0, 0, 0);
  if (holiday < now) {
    holiday.setFullYear(holiday.getFullYear() + 1);
  }

  await prisma.calendarBlock.createMany({
    data: [
      {
        date: holiday,
        isBlocked: true,
        reason: 'New Year Holiday',
        createdBy: admin.id,
      },
      // Block a specific time slot (lunch break)
      {
        date: tomorrow,
        startTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 12, 0, 0),
        endTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 13, 0, 0),
        isBlocked: true,
        reason: 'Lunch Break',
        createdBy: admin.id,
      },
    ],
    skipDuplicates: true,
  });

  // Seed media - Images and Videos
  const mediaItems = await prisma.media.createMany({
    data: [
      {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1560869713-7d0a8a5e0b0a?w=800&q=80',
        caption: 'Beautiful Box Braids',
        description: 'Classic box braids style in various lengths',
        uploadedBy: admin.id,
        featured: true,
        published: true,
        order: 1,
      },
      {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800&q=80',
        caption: 'Elegant Goddess Braids',
        description: 'Goddess braids with extensions - stunning results',
        uploadedBy: admin.id,
        featured: true,
        published: true,
        order: 2,
      },
      {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1594736797933-d0cbc0c0e0a0?w=800&q=80',
        caption: 'Stylish Cornrows',
        description: 'Intricate cornrow patterns and designs',
        uploadedBy: admin.id,
        featured: false,
        published: true,
        order: 3,
      },
      {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=800&q=80',
        caption: 'Knotless Braids',
        description: 'Natural-looking knotless braids for comfort',
        uploadedBy: admin.id,
        featured: true,
        published: true,
        order: 4,
      },
      {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=800&q=80',
        caption: 'Protective Style',
        description: 'Beautiful protective hairstyle',
        uploadedBy: admin.id,
        featured: false,
        published: true,
        order: 5,
      },
      {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&q=80',
        caption: 'Fulani Braids',
        description: 'Traditional Fulani braids with beads',
        uploadedBy: admin.id,
        featured: true,
        published: true,
        order: 6,
      },
      {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1580619305218-8423a7ef79b4?w=800&q=80',
        caption: 'Twist Out Style',
        description: 'Beautiful twist out hairstyle',
        uploadedBy: admin.id,
        featured: false,
        published: true,
        order: 7,
      },
      {
        type: 'video',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1560869713-7d0a8a5e0b0a?w=800&q=80',
        caption: 'Braiding Process Video',
        description: 'Watch our expert stylist create beautiful braids',
        uploadedBy: admin.id,
        featured: true,
        published: true,
        order: 8,
      },
      {
        type: 'video',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800&q=80',
        caption: 'Hairstyle Transformation',
        description: 'Before and after transformation',
        uploadedBy: admin.id,
        featured: true,
        published: true,
        order: 9,
      },
      {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80',
        caption: 'Colorful Braids',
        description: 'Vibrant colored braids for a bold look',
        uploadedBy: admin.id,
        featured: true,
        published: true,
        order: 10,
      },
    ],
    skipDuplicates: true,
  });

  // Seed feed posts with images and videos
  const mediaList = await prisma.media.findMany();
  const sessionIds = ['session-1', 'session-2', 'session-3', 'session-4', 'session-5'];

  const feedPosts = [];
  const postCaptions = [
    'Just finished this stunning box braids set! ✨',
    'Goddess braids are always a favorite 💫',
    'Check out this intricate cornrow design!',
    'Knotless braids for maximum comfort and style',
    'Protective styles that look amazing',
    'Fulani braids with traditional beads',
    'Beautiful twist out transformation',
    'Watch our braiding process in action!',
    'Colorful braids for a bold statement',
    'Another satisfied client! 🎉',
  ];

  for (let i = 0; i < 12; i++) {
    const postDate = new Date(now);
    postDate.setDate(postDate.getDate() - i);
    postDate.setHours(10 + (i % 12), 0, 0, 0);

    const media = mediaList[i % mediaList.length];
    const isVideo = media?.type === 'video';
    
    feedPosts.push({
      mediaId: media?.id,
      type: isVideo ? 'video' : 'image',
      mediaUrl: media?.url || `https://images.unsplash.com/photo-${1560869713 + i}?w=800&q=80`,
      thumbnailUrl: isVideo ? media?.thumbnailUrl : undefined,
      caption: postCaptions[i % postCaptions.length],
      postedBy: admin.id,
      published: true,
      createdAt: postDate,
      likeCount: Math.floor(Math.random() * 100) + 20,
      commentCount: Math.floor(Math.random() * 30) + 5,
      shareCount: Math.floor(Math.random() * 15) + 2,
      repostCount: Math.floor(Math.random() * 10) + 1,
      viewCount: isVideo ? Math.floor(Math.random() * 500) + 100 : Math.floor(Math.random() * 300) + 50,
    });
  }

  await prisma.feedPost.createMany({
    data: feedPosts,
    skipDuplicates: true,
  });

  // Get created posts for engagement
  const posts = await prisma.feedPost.findMany({
    orderBy: { createdAt: 'desc' },
    take: 12,
  });

  // Seed likes, comments, shares, reposts
  for (const post of posts) {
    // Add likes
    const likeCount = Math.floor(Math.random() * 30) + 5;
    for (let i = 0; i < likeCount && i < sessionIds.length; i++) {
      await prisma.postLike.upsert({
        where: {
          postId_sessionId: {
            postId: post.id,
            sessionId: sessionIds[i],
          },
        },
        update: {},
        create: {
          postId: post.id,
          sessionId: sessionIds[i],
        },
      });
    }

    // Add comments
    const commentCount = Math.floor(Math.random() * 10) + 2;
    for (let i = 0; i < commentCount && i < sessionIds.length; i++) {
      await prisma.postComment.create({
        data: {
          postId: post.id,
          sessionId: sessionIds[i],
          content: `Love this style! ${i === 0 ? 'So beautiful!' : 'Amazing work!'}`,
        },
      });
    }

    // Add shares
    const shareCount = Math.floor(Math.random() * 5) + 1;
    for (let i = 0; i < shareCount && i < sessionIds.length; i++) {
      await prisma.postShare.create({
        data: {
          postId: post.id,
          sessionId: sessionIds[i],
          shareType: 'link',
        },
      });
    }

    // Add reposts
    const repostCount = Math.floor(Math.random() * 3);
    for (let i = 0; i < repostCount && i < sessionIds.length; i++) {
      await prisma.postRepost.upsert({
        where: {
          postId_sessionId: {
            postId: post.id,
            sessionId: sessionIds[i],
          },
        },
        update: {},
        create: {
          postId: post.id,
          sessionId: sessionIds[i],
        },
      });
    }

    // Add engagement tracking
    const viewCount = Math.floor(Math.random() * 100) + 50;
    for (let i = 0; i < viewCount && i < 20; i++) {
      await prisma.feedEngagement.create({
        data: {
          postId: post.id,
          sessionId: sessionIds[i % sessionIds.length],
          action: 'view',
          value: Math.random() * 30 + 5, // Watch time in seconds
        },
      });
    }
  }

  // Create some past completed appointments for revenue tracking
  const pastDate1 = new Date(now);
  pastDate1.setDate(pastDate1.getDate() - 5);
  pastDate1.setHours(10, 0, 0, 0);

  const pastDate2 = new Date(now);
  pastDate2.setDate(pastDate2.getDate() - 3);
  pastDate2.setHours(14, 0, 0, 0);

  if (sarah && amanda) {
    const pastApts = await prisma.appointment.createMany({
      data: [
        {
          clientId: sarah.id,
          adminId: admin.id,
          hairstyleName: 'Box Braids',
          price: 150.00,
          startTime: pastDate1,
          endTime: new Date(pastDate1.getTime() + 180 * 60 * 1000),
          duration: 180,
          status: 'COMPLETED',
        },
        {
          clientId: amanda.id,
          adminId: admin.id,
          hairstyleName: 'Cornrows',
          price: 80.00,
          startTime: pastDate2,
          endTime: new Date(pastDate2.getTime() + 120 * 60 * 1000),
          duration: 120,
          status: 'COMPLETED',
        },
      ],
      skipDuplicates: true,
    });

    // Create revenue logs for completed appointments
    const completedApts = await prisma.appointment.findMany({
      where: { status: 'COMPLETED' },
    });

    for (const apt of completedApts) {
      await prisma.revenueLog.upsert({
        where: { appointmentId: apt.id },
        update: {},
        create: {
          appointmentId: apt.id,
          clientId: apt.clientId,
          amount: apt.price,
          hairstyleName: apt.hairstyleName,
          date: apt.startTime,
        },
      });
    }
  }

  console.log('✅ Seeding completed!');
  console.log('Admin credentials:');
  console.log('  Email: admin@deexhairlabb.com');
  console.log('  Password: admin123');
  console.log('');
  const finalPosts = await prisma.feedPost.count();
  const finalClients = await prisma.client.count();
  const finalAppointments = await prisma.appointment.count();

  console.log('Sample data created:');
  console.log(`  - ${finalClients} clients`);
  console.log(`  - ${finalAppointments} appointments`);
  console.log(`  - ${finalPosts} social feed posts`);
  console.log(`  - Calendar blocks configured`);
  console.log(`  - Media items uploaded`);
  console.log(`  - Engagement data (likes, comments, shares, reposts)`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
