import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createAdmin() {
  const email = 'admin@pedja.com';
  const password = 'Admin@123';
  const firstName = 'Admin';
  const lastName = 'Pédja';

  try {
    // Check if admin already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log('⚠️  Admin user already exists!');
      console.log('Email:', existingUser.email);
      console.log('Role:', existingUser.role);

      if (existingUser.role !== 'ADMIN') {
        console.log('\n🔄 Updating role to ADMIN...');
        const updated = await prisma.user.update({
          where: { email },
          data: { role: 'ADMIN' },
        });
        console.log('✅ User role updated to ADMIN!');
      }

      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    console.log('✅ Admin user created successfully!');
    console.log('\n📧 Login credentials:');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('\n⚠️  Please change the password after first login!');

  } catch (error) {
    console.error('❌ Error creating admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
