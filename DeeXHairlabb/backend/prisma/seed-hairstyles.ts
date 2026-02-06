import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// All 15 hairstyles for DeeXHairlabb
const hairstyles = [
  {
    name: 'Large Knotless Braids',
    description: 'Bold, beautiful jumbo knotless braids. Quick to install with no tension on your edges. Perfect for a statement look that lasts 4-6 weeks.',
    price: 150,
    duration: 180, // 3 hours
    tags: ['knotless', 'large', 'protective', 'popular'],
    featured: true,
  },
  {
    name: 'Medium Knotless Braids',
    description: 'Classic medium-sized knotless braids. The perfect balance of fullness and manageability. Lasts 6-8 weeks with proper care.',
    price: 200,
    duration: 300, // 5 hours
    tags: ['knotless', 'medium', 'protective', 'classic'],
    featured: true,
  },
  {
    name: 'Small Knotless Braids',
    description: 'Intricate small knotless braids for a sleek, polished look. More braids mean longer lasting style - up to 8-10 weeks.',
    price: 300,
    duration: 480, // 8 hours
    tags: ['knotless', 'small', 'protective', 'detailed'],
    featured: false,
  },
  {
    name: 'Smedium Knotless Braids',
    description: 'The perfect in-between size! Not too big, not too small. Our most requested size for versatile styling options.',
    price: 180,
    duration: 240, // 4 hours
    tags: ['knotless', 'smedium', 'protective', 'versatile', 'popular'],
    featured: true,
  },
  {
    name: 'Smedium Knotless Braids (Thigh Length)',
    description: 'Extra long smedium knotless braids reaching thigh length. Maximum drama and elegance for those who love length.',
    price: 250,
    duration: 360, // 6 hours
    tags: ['knotless', 'smedium', 'long', 'thigh-length', 'protective'],
    featured: false,
  },
  {
    name: 'Large Knotless Bob',
    description: 'Short, chic and absolutely stunning! Shoulder-length large knotless braids. Low maintenance, high impact style.',
    price: 120,
    duration: 120, // 2 hours
    tags: ['knotless', 'bob', 'short', 'trendy', 'popular'],
    featured: true,
  },
  {
    name: 'Boho Bob Braids',
    description: 'Trendy bohemian-style bob with curly ends. Lightweight, carefree and perfect for summer. The ultimate vacation hairstyle.',
    price: 160,
    duration: 180, // 3 hours
    tags: ['boho', 'bob', 'curly-ends', 'trendy', 'summer'],
    featured: true,
  },
  {
    name: 'Kids Fulani Braids',
    description: 'Beautiful Fulani-style braids sized perfectly for children. Gentle installation with fun beads and accessories included.',
    price: 80,
    duration: 120, // 2 hours
    tags: ['kids', 'fulani', 'children', 'beads', 'accessories'],
    featured: false,
  },
  {
    name: 'Fulani Braids',
    description: 'Traditional Fulani braids with signature center braid, side cornrows, and beautiful beaded accessories. A timeless African classic.',
    price: 180,
    duration: 240, // 4 hours
    tags: ['fulani', 'traditional', 'beads', 'cultural', 'popular'],
    featured: true,
  },
  {
    name: 'Fulani Twist Braids',
    description: 'A modern twist on classic Fulani! Combines the iconic Fulani pattern with twisted braids for a unique, textured look.',
    price: 200,
    duration: 270, // 4.5 hours
    tags: ['fulani', 'twist', 'textured', 'modern', 'unique'],
    featured: false,
  },
  {
    name: 'Tribal Braids',
    description: 'Bold tribal-inspired braiding patterns. Features intricate cornrow designs with chunky braids. A powerful, statement-making style.',
    price: 220,
    duration: 300, // 5 hours
    tags: ['tribal', 'cornrows', 'bold', 'statement', 'cultural'],
    featured: false,
  },
  {
    name: 'Alicia Keys-Style Braids',
    description: 'Iconic cornrow style inspired by Alicia Keys. Sleek, elegant braids swept to one side or styled in artistic patterns.',
    price: 160,
    duration: 180, // 3 hours
    tags: ['cornrows', 'celebrity', 'elegant', 'sleek', 'artistic'],
    featured: false,
  },
  {
    name: 'Lemonade Braids',
    description: 'Side-swept cornrows made famous by Beyoncé. All braids feed to one side for a dramatic, red-carpet-ready look.',
    price: 180,
    duration: 210, // 3.5 hours
    tags: ['lemonade', 'side-swept', 'beyonce', 'cornrows', 'celebrity'],
    featured: true,
  },
  {
    name: 'Feed-In Braids to the Back',
    description: 'Classic straight-back feed-in cornrows. Clean, sleek and timeless. Perfect for any occasion, professional or casual.',
    price: 140,
    duration: 150, // 2.5 hours
    tags: ['feed-in', 'straight-back', 'cornrows', 'classic', 'professional'],
    featured: false,
  },
  {
    name: 'Braided Ponytail',
    description: 'Sleek cornrows leading into a stunning braided ponytail. Elegant, versatile and perfect for special occasions.',
    price: 150,
    duration: 180, // 3 hours
    tags: ['ponytail', 'cornrows', 'elegant', 'special-occasion', 'updo'],
    featured: false,
  },
]

async function main() {
  console.log('🌱 Seeding hairstyles database...')
  console.log('')

  // Clear existing hairstyles
  await prisma.hairstyle.deleteMany({})
  console.log('✅ Cleared existing hairstyles')

  // Create all hairstyles
  for (const style of hairstyles) {
    await prisma.hairstyle.create({
      data: {
        name: style.name,
        description: style.description,
        price: style.price,
        duration: style.duration,
        tags: style.tags,
        featured: style.featured,
        published: true,
        imageUrl: null, // Admin will upload real photos
        galleryUrls: [],
      },
    })
    console.log(`   ✅ Added: ${style.name}`)
  }

  console.log('')
  console.log(`🎉 Successfully added ${hairstyles.length} hairstyles!`)
  console.log('')
  console.log('📋 HAIRSTYLE CATALOG:')
  console.log('─'.repeat(50))

  const categories = {
    'Knotless Braids': hairstyles.filter(h => h.tags.includes('knotless')),
    'Fulani Styles': hairstyles.filter(h => h.tags.includes('fulani')),
    'Cornrow Styles': hairstyles.filter(h => h.tags.includes('cornrows') && !h.tags.includes('fulani')),
    'Other Styles': hairstyles.filter(h => h.tags.includes('tribal') || h.tags.includes('ponytail')),
  }

  for (const [category, styles] of Object.entries(categories)) {
    console.log(`\n${category}:`)
    styles.forEach(s => {
      const hours = Math.floor(s.duration / 60)
      const mins = s.duration % 60
      const timeStr = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
      console.log(`   • ${s.name} - $${s.price} (${timeStr})${s.featured ? ' ⭐' : ''}`)
    })
  }

  console.log('')
  console.log('─'.repeat(50))
  console.log('')
  console.log('💡 Next Steps:')
  console.log('   1. Go to /admin/hairstyles')
  console.log('   2. Click on each hairstyle to upload photos')
  console.log('   3. Add main image + gallery images for each style')
  console.log('')
}

main()
  .catch((e) => {
    console.error('Error seeding hairstyles:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
