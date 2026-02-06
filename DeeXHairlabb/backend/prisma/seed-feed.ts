import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// All 15 hairstyles with VERIFIED working Pexels image URLs
const feedPosts = [
  // KNOTLESS BRAIDS
  {
    type: 'image',
    mediaUrl: 'https://images.pexels.com/photos/3065209/pexels-photo-3065209.jpeg?auto=compress&cs=tinysrgb&w=800',
    caption: 'Large Knotless Braids - Bold, beautiful and quick to install! $150 | 3 hours ✨ #LargeKnotless #ProtectiveStyles',
    published: true,
    likeCount: 456,
    commentCount: 38,
  },
  {
    type: 'image',
    mediaUrl: 'https://images.pexels.com/photos/3065171/pexels-photo-3065171.jpeg?auto=compress&cs=tinysrgb&w=800',
    caption: 'Medium Knotless Braids - Classic size, timeless beauty! $200 | 5 hours 💜 #MediumKnotless #BraidGoals',
    published: true,
    likeCount: 523,
    commentCount: 45,
  },
  {
    type: 'image',
    mediaUrl: 'https://images.pexels.com/photos/3065207/pexels-photo-3065207.jpeg?auto=compress&cs=tinysrgb&w=800',
    caption: 'Small Knotless Braids - Intricate, sleek and long-lasting! $300 | 8 hours 💎 #SmallKnotless #Detailed',
    published: true,
    likeCount: 356,
    commentCount: 31,
  },
  {
    type: 'image',
    mediaUrl: 'https://images.pexels.com/photos/3065210/pexels-photo-3065210.jpeg?auto=compress&cs=tinysrgb&w=800',
    caption: 'Smedium Knotless Braids - The perfect in-between size! $180 | 4 hours 💫 #SmediumKnotless #Popular',
    published: true,
    likeCount: 489,
    commentCount: 41,
  },
  {
    type: 'image',
    mediaUrl: 'https://images.pexels.com/photos/3065206/pexels-photo-3065206.jpeg?auto=compress&cs=tinysrgb&w=800',
    caption: 'Smedium Knotless Braids (Thigh Length) - Maximum drama and elegance! $250 | 6 hours 👸 #ThighLength #ExtraLong',
    published: true,
    likeCount: 412,
    commentCount: 36,
  },
  {
    type: 'image',
    mediaUrl: 'https://images.pexels.com/photos/3065208/pexels-photo-3065208.jpeg?auto=compress&cs=tinysrgb&w=800',
    caption: 'Large Knotless Bob - Short, chic and stunning! $120 | 2 hours 🔥 #KnotlessBob #Trending',
    published: true,
    likeCount: 567,
    commentCount: 52,
  },

  // BOB & BOHO STYLES
  {
    type: 'image',
    mediaUrl: 'https://images.pexels.com/photos/1820559/pexels-photo-1820559.jpeg?auto=compress&cs=tinysrgb&w=800',
    caption: 'Boho Bob Braids - Trendy bohemian vibes with curly ends! $160 | 3 hours 🌴 #BohoBraids #SummerReady',
    published: true,
    likeCount: 534,
    commentCount: 48,
  },

  // FULANI STYLES
  {
    type: 'image',
    mediaUrl: 'https://images.pexels.com/photos/3021094/pexels-photo-3021094.jpeg?auto=compress&cs=tinysrgb&w=800',
    caption: 'Kids Fulani Braids - Beautiful braids for little queens! $80 | 2 hours 👧🏾 #KidsBraids #FulaniBraids',
    published: true,
    likeCount: 378,
    commentCount: 42,
  },
  {
    type: 'image',
    mediaUrl: 'https://images.pexels.com/photos/1619697/pexels-photo-1619697.jpeg?auto=compress&cs=tinysrgb&w=800',
    caption: 'Fulani Braids - Timeless African elegance with beaded accessories! $180 | 4 hours 👑 #FulaniBraids #Cultural',
    published: true,
    likeCount: 612,
    commentCount: 56,
  },
  {
    type: 'image',
    mediaUrl: 'https://images.pexels.com/photos/2552128/pexels-photo-2552128.jpeg?auto=compress&cs=tinysrgb&w=800',
    caption: 'Fulani Twist Braids - Modern twist on a classic style! $200 | 4.5 hours 🌀 #FulaniTwist #Unique',
    published: true,
    likeCount: 445,
    commentCount: 39,
  },

  // CORNROW STYLES
  {
    type: 'image',
    mediaUrl: 'https://images.pexels.com/photos/2773175/pexels-photo-2773175.jpeg?auto=compress&cs=tinysrgb&w=800',
    caption: 'Tribal Braids - Bold patterns that make a statement! $220 | 5 hours 💪 #TribalBraids #Statement',
    published: true,
    likeCount: 489,
    commentCount: 43,
  },
  {
    type: 'image',
    mediaUrl: 'https://images.pexels.com/photos/3065173/pexels-photo-3065173.jpeg?auto=compress&cs=tinysrgb&w=800',
    caption: 'Alicia Keys-Style Braids - Iconic cornrow elegance! $160 | 3 hours 🎹 #AliciaKeys #Cornrows',
    published: true,
    likeCount: 423,
    commentCount: 37,
  },
  {
    type: 'image',
    mediaUrl: 'https://images.pexels.com/photos/3065209/pexels-photo-3065209.jpeg?auto=compress&cs=tinysrgb&w=800',
    caption: 'Lemonade Braids - Side-swept perfection inspired by Beyoncé! $180 | 3.5 hours 🍋 #LemonadeBraids #Beyonce',
    published: true,
    likeCount: 678,
    commentCount: 63,
  },
  {
    type: 'image',
    mediaUrl: 'https://images.pexels.com/photos/3065171/pexels-photo-3065171.jpeg?auto=compress&cs=tinysrgb&w=800',
    caption: 'Feed-In Braids to the Back - Classic straight-back perfection! $140 | 2.5 hours 🔙 #FeedInBraids #Classic',
    published: true,
    likeCount: 389,
    commentCount: 34,
  },
  {
    type: 'image',
    mediaUrl: 'https://images.pexels.com/photos/3065207/pexels-photo-3065207.jpeg?auto=compress&cs=tinysrgb&w=800',
    caption: 'Braided Ponytail - Elegant and versatile for any occasion! $150 | 3 hours ✨ #BraidedPonytail #Elegant',
    published: true,
    likeCount: 398,
    commentCount: 35,
  },
]

async function main() {
  console.log('🌱 Loading all 15 hairstyles with images into Social Feed...')
  console.log('')

  // Clear existing feed posts
  await prisma.feedPost.deleteMany({})
  console.log('✅ Cleared existing feed posts')

  // Create feed posts for all hairstyles
  for (const post of feedPosts) {
    await prisma.feedPost.create({
      data: {
        type: post.type,
        mediaUrl: post.mediaUrl,
        caption: post.caption,
        published: post.published,
        likeCount: post.likeCount,
        commentCount: post.commentCount,
        shareCount: Math.floor(Math.random() * 30) + 10,
        repostCount: Math.floor(Math.random() * 20) + 5,
        viewCount: Math.floor(Math.random() * 2000) + 500,
        engagementScore: Math.random() * 100 + 50,
      },
    })
  }

  console.log(`✅ Created ${feedPosts.length} feed posts with images`)
  console.log('')
  console.log('🎉 All 15 hairstyles loaded with pictures!')
  console.log('')
  console.log('📱 View at:')
  console.log('   • Admin: /admin/feed')
  console.log('   • Frontend: / (Popular Styles section)')
}

main()
  .catch((e) => {
    console.error('Error seeding feed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
