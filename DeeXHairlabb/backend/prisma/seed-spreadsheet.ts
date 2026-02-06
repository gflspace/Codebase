import { PrismaClient, AppointmentStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Data from spreadsheet
const appointments = [
  { client: 'Trisha', phone: '', date: 'June 19', deposit: 0, balance: 50, style: 'Large knotless' },
  { client: 'Haley', phone: '', date: 'June 24', deposit: 10, balance: 60, style: 'Medium knotless' },
  { client: 'Lay', phone: '', date: 'June 25', deposit: 10, balance: 45, style: 'Large knotless' },
  { client: 'Miya', phone: '', date: 'July 3', deposit: 0, balance: 50, style: 'Large knotless' },
  { client: 'Paisley', phone: '', date: 'July 4', deposit: 0, balance: 60, style: 'Kids Fulani' },
  { client: 'Trin', phone: '', date: 'July 8', deposit: 10, balance: 80, style: 'Boho bob' },
  { client: 'Sierra', phone: '', date: 'July 12', deposit: 10, balance: 115, style: 'Smedium knotless' },
  { client: 'Marie', phone: '', date: 'July 15', deposit: 10, balance: 70, style: 'Fulani' },
  { client: 'Faith Mom', phone: '', date: 'July 16', deposit: 0, balance: 70, style: 'Braids' },
  { client: 'Hailey', phone: '', date: 'July 20', deposit: 10, balance: 110, style: 'Small knotless' },
  { client: 'Steph', phone: '', date: 'July 26', deposit: 10, balance: 115, style: 'Smedium knotless' },
  { client: 'Kyri', phone: '', date: 'August 8', deposit: 10, balance: 85, style: 'Fulani twist' },
  { client: 'Kaeyln', phone: '+1 (830) 475-2697', date: 'August 9', deposit: 10, balance: 90, style: 'Knotless braids' },
  { client: 'Kaylee', phone: '+1 (830) 475-2697', date: 'August 10', deposit: 10, balance: 85, style: 'Knotless braids' },
  { client: 'Neveah', phone: '', date: 'August 16', deposit: 10, balance: 115, style: 'Small knotless' },
  { client: 'Hailey', phone: '', date: 'August 16', deposit: 10, balance: 60, style: 'Large knotless bob' },
  { client: 'Trisha', phone: '', date: 'September 1', deposit: 0, balance: 90, style: 'Tribal braids' },
  { client: 'Bre', phone: '', date: 'September 12', deposit: 10, balance: 80, style: 'Alicia Keys braids' },
  { client: 'Tori', phone: '', date: 'September 20', deposit: 10, balance: 110, style: 'Smedium knotless' },
  { client: 'Kori', phone: '', date: 'October 10', deposit: 0, balance: 90, style: 'Braided ponytail' },
  { client: 'Haley', phone: '', date: 'October 14', deposit: 10, balance: 110, style: 'Boho bob' },
  { client: 'Trisha', phone: '', date: 'October 15', deposit: 0, balance: 120, style: 'Smedium knotless' },
  { client: 'Ronelle', phone: '', date: 'October 16', deposit: 0, balance: 60, style: 'Braided ponytail' },
  { client: 'Rylie', phone: '', date: 'October 18', deposit: 0, balance: 60, style: 'Braided ponytail' },
  { client: 'Kaylee', phone: '+1 (830) 475-2697', date: 'October 24', deposit: 10, balance: 95, style: 'Knotless braids' },
  { client: 'Kaeyln', phone: '+1 (830) 475-2697', date: 'October 25', deposit: 10, balance: 120, style: 'Knotless braids' },
  { client: 'Nunu', phone: '', date: 'November 14', deposit: 10, balance: 75, style: 'Lemonade braids' },
  { client: 'Trisha', phone: '', date: 'November 21', deposit: 0, balance: 70, style: 'Large knotless' },
  { client: 'Faith', phone: '', date: 'November 22', deposit: 0, balance: 90, style: 'Feed-ins to back' },
  { client: 'Kaylee', phone: '+1 (830) 475-2697', date: 'November 29', deposit: 10, balance: 105, style: 'Knotless braids' },
  { client: 'Kori', phone: '', date: 'November 30', deposit: 0, balance: 110, style: 'Smedium knotless' },
  { client: 'Kaeyln', phone: '+1 (830) 475-2697', date: 'December 5', deposit: 10, balance: 90, style: 'Knotless braids' },
  { client: 'Leah', phone: '+1 (214) 228-9858', date: 'December 6', deposit: 10, balance: 90, style: 'Braided ponytail' },
  { client: 'TikTok girl', phone: '', date: 'December 13', deposit: 10, balance: 60, style: 'Large knotless' },
  { client: 'Steph', phone: '', date: 'December 20', deposit: 10, balance: 115, style: 'Small knotless' },
  { client: 'Correa', phone: '', date: 'December 26', deposit: 0, balance: 80, style: 'Smedium knotless' },
  { client: 'Faith', phone: '', date: 'January 5', deposit: 0, balance: 100, style: 'Smedium knotless to thigh' },
  { client: 'Mariah', phone: '', date: 'January 8', deposit: 10, balance: 95, style: 'Fulani' },
  { client: 'Gladys', phone: '', date: 'January 10', deposit: 0, balance: 180, style: 'Medium knotless' },
];

// Hairstyles with estimated durations
const hairstyleData: Record<string, { price: number; duration: number }> = {
  'Large knotless': { price: 60, duration: 180 },
  'Medium knotless': { price: 80, duration: 240 },
  'Small knotless': { price: 120, duration: 360 },
  'Smedium knotless': { price: 125, duration: 300 },
  'Smedium knotless to thigh': { price: 100, duration: 330 },
  'Kids Fulani': { price: 60, duration: 120 },
  'Boho bob': { price: 90, duration: 210 },
  'Fulani': { price: 80, duration: 240 },
  'Fulani twist': { price: 95, duration: 270 },
  'Braids': { price: 70, duration: 180 },
  'Knotless braids': { price: 90, duration: 240 },
  'Tribal braids': { price: 90, duration: 240 },
  'Alicia Keys braids': { price: 90, duration: 210 },
  'Braided ponytail': { price: 70, duration: 150 },
  'Lemonade braids': { price: 85, duration: 240 },
  'Feed-ins to back': { price: 90, duration: 210 },
  'Large knotless bob': { price: 70, duration: 150 },
};

function parseDate(dateStr: string): Date {
  const currentYear = new Date().getFullYear();
  const months: Record<string, number> = {
    'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
    'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
  };

  const parts = dateStr.split(' ');
  const month = months[parts[0]];
  const day = parseInt(parts[1]);

  // Use 2024 for past months to make data historical, 2025 for future
  let year = currentYear;
  if (month >= 6) { // June onwards - 2024
    year = 2024;
  } else { // January-May - 2025
    year = 2025;
  }

  const date = new Date(year, month, day, 10, 0, 0); // 10 AM default
  return date;
}

async function main() {
  console.log('Starting seed from spreadsheet data...');

  // Clear existing data
  console.log('Clearing existing data...');
  await prisma.revenueLog.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.client.deleteMany();
  await prisma.hairstyle.deleteMany();

  // Create hairstyles
  console.log('Creating hairstyles...');
  const createdHairstyles: Record<string, string> = {};
  for (const [name, data] of Object.entries(hairstyleData)) {
    const hairstyle = await prisma.hairstyle.create({
      data: {
        name,
        price: data.price,
        duration: data.duration,
        published: true,
        featured: ['Large knotless', 'Medium knotless', 'Smedium knotless', 'Fulani', 'Boho bob'].includes(name),
        tags: name.toLowerCase().includes('knotless') ? ['knotless', 'braids'] : ['braids'],
      }
    });
    createdHairstyles[name] = hairstyle.id;
  }
  console.log(`Created ${Object.keys(createdHairstyles).length} hairstyles`);

  // Create clients and appointments
  console.log('Creating clients and appointments...');
  const clientMap: Record<string, string> = {};
  let appointmentCount = 0;
  let revenueCount = 0;
  let totalRevenue = 0;

  for (const apt of appointments) {
    // Create or get client
    let clientId = clientMap[apt.client];
    if (!clientId) {
      const nameParts = apt.client.split(' ');
      const client = await prisma.client.create({
        data: {
          firstName: nameParts[0],
          lastName: nameParts.slice(1).join(' ') || '',
          phone: apt.phone || `555-${String(Object.keys(clientMap).length + 1).padStart(4, '0')}`,
          notes: apt.phone ? '' : 'Phone number pending',
        }
      });
      clientId = client.id;
      clientMap[apt.client] = clientId;
    }

    // Calculate total price and determine status
    const totalPrice = apt.deposit + apt.balance;
    const appointmentDate = parseDate(apt.date);
    const now = new Date();
    const isPast = appointmentDate < now;

    // Get hairstyle info
    const styleInfo = hairstyleData[apt.style] || { price: totalPrice, duration: 180 };
    const endTime = new Date(appointmentDate.getTime() + styleInfo.duration * 60000);

    // Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        clientId,
        hairstyleName: apt.style,
        price: totalPrice,
        startTime: appointmentDate,
        endTime: endTime,
        duration: styleInfo.duration,
        status: isPast ? AppointmentStatus.COMPLETED : AppointmentStatus.CONFIRMED,
        notes: apt.deposit > 0 ? `Deposit: $${apt.deposit}` : 'No deposit',
      }
    });
    appointmentCount++;

    // Create revenue log for completed appointments
    if (isPast) {
      await prisma.revenueLog.create({
        data: {
          appointmentId: appointment.id,
          clientId,
          amount: totalPrice,
          hairstyleName: apt.style,
          date: appointmentDate,
        }
      });
      revenueCount++;
      totalRevenue += totalPrice;
    }
  }

  console.log(`Created ${Object.keys(clientMap).length} clients`);
  console.log(`Created ${appointmentCount} appointments`);
  console.log(`Created ${revenueCount} revenue logs`);
  console.log(`Total revenue: $${totalRevenue}`);

  // Summary
  const summary = await prisma.$transaction([
    prisma.client.count(),
    prisma.appointment.count(),
    prisma.hairstyle.count(),
    prisma.revenueLog.count(),
  ]);

  console.log('\n--- Seed Complete ---');
  console.log(`Clients: ${summary[0]}`);
  console.log(`Appointments: ${summary[1]}`);
  console.log(`Hairstyles: ${summary[2]}`);
  console.log(`Revenue Logs: ${summary[3]}`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
