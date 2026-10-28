require('dotenv').config();
const mongoose = require('mongoose');
const Student = require('../models/Student');
const Department = require('../models/Department');
const Course = require('../models/Course');
const User = require('../models/User');

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/record_management_system';
    await mongoose.connect(mongoUri);
    console.log('[Seeder] Connected to MongoDB:', mongoUri);

    // Clean existing records
    await Promise.all([
      Student.deleteMany({}),
      Department.deleteMany({}),
      Course.deleteMany({}),
      User.deleteMany({})
    ]);
    console.log('[Seeder] Cleared previous records.');

    // 0. Seed Authentication Users (Admin, Faculty, Student)
    const usersData = [
      {
        name: 'Dr. Ramesh Sharma (Admin)',
        email: 'admin@campus.edu',
        password: 'Admin@123',
        role: 'Admin',
        department: 'CSE'
      },
      {
        name: 'Prof. Ananya Sen (Faculty)',
        email: 'faculty@campus.edu',
        password: 'Faculty@123',
        role: 'Faculty',
        department: 'IT'
      },
      {
        name: 'Aarav Sharma (Student)',
        email: 'student@campus.edu',
        password: 'Student@123',
        role: 'Student',
        department: 'CSE',
        regNo: 'RA2311003010001'
      }
    ];

    for (const u of usersData) {
      const userDoc = new User(u);
      await userDoc.save();
    }
    console.log(`[Seeder] Seeded ${usersData.length} Auth Users (Admin, Faculty, Student).`);

    // 1. Seed Departments (Referenced Entities)
    const departmentsData = [
      {
        code: 'CSE',
        name: 'Computer Science and Engineering',
        hod: 'Dr. Ramesh Sharma',
        building: 'Turing Block - Floor 3',
        establishedYear: 2002,
        contactEmail: 'hod.cse@university.edu'
      },
      {
        code: 'IT',
        name: 'Information Technology',
        hod: 'Dr. Priya Sundaram',
        building: 'Ada Lovelace Hall - Floor 2',
        establishedYear: 2005,
        contactEmail: 'hod.it@university.edu'
      },
      {
        code: 'ECE',
        name: 'Electronics and Communication Engineering',
        hod: 'Dr. Arvind Swaminathan',
        building: 'Tesla Block - Floor 1',
        establishedYear: 2001,
        contactEmail: 'hod.ece@university.edu'
      },
      {
        code: 'MECH',
        name: 'Mechanical Engineering',
        hod: 'Dr. Vikram Malhotra',
        building: 'Newton Engineering Workshop',
        establishedYear: 1998,
        contactEmail: 'hod.mech@university.edu'
      },
      {
        code: 'CIVIL',
        name: 'Civil and Structural Engineering',
        hod: 'Dr. Meenakshi Sundaram',
        building: 'Visvesvaraya Tower',
        establishedYear: 1995,
        contactEmail: 'hod.civil@university.edu'
      }
    ];

    const insertedDepartments = await Department.insertMany(departmentsData);
    console.log(`[Seeder] Seeded ${insertedDepartments.length} Departments.`);

    // 2. Seed Courses (Referenced Entities)
    const coursesData = [
      { courseCode: 'CS101', title: 'Data Structures and Algorithms', credits: 4, department: 'CSE', instructor: 'Dr. Anita Roy', maxCapacity: 60 },
      { courseCode: 'CS102', title: 'Database Management Systems & NoSQL', credits: 4, department: 'CSE', instructor: 'Prof. Rajesh K', maxCapacity: 60 },
      { courseCode: 'CS103', title: 'Operating Systems & Concurrency', credits: 3, department: 'CSE', instructor: 'Dr. S. Nair', maxCapacity: 60 },
      { courseCode: 'CS104', title: 'Artificial Intelligence & Machine Learning', credits: 4, department: 'CSE', instructor: 'Dr. K. Rao', maxCapacity: 50 },
      { courseCode: 'IT201', title: 'Full Stack Web Architecture', credits: 3, department: 'IT', instructor: 'Prof. Ananya Sen', maxCapacity: 60 },
      { courseCode: 'IT202', title: 'Cloud Computing and Microservices', credits: 3, department: 'IT', instructor: 'Dr. M. Patel', maxCapacity: 55 },
      { courseCode: 'EC301', title: 'Digital Signal Processing', credits: 4, department: 'ECE', instructor: 'Dr. T. Joseph', maxCapacity: 60 },
      { courseCode: 'EC302', title: 'Embedded Systems & IoT', credits: 3, department: 'ECE', instructor: 'Prof. V. Iyer', maxCapacity: 50 },
      { courseCode: 'ME401', title: 'Thermodynamics & Heat Transfer', credits: 4, department: 'MECH', instructor: 'Dr. H. Verma', maxCapacity: 60 },
      { courseCode: 'CV501', title: 'Structural Analysis & Design', credits: 4, department: 'CIVIL', instructor: 'Dr. R. Gupta', maxCapacity: 60 }
    ];

    const insertedCourses = await Course.insertMany(coursesData);
    console.log(`[Seeder] Seeded ${insertedCourses.length} Courses.`);

    const cseCourseIds = insertedCourses.filter(c => c.department === 'CSE').map(c => c._id);
    const itCourseIds = insertedCourses.filter(c => c.department === 'IT').map(c => c._id);
    const eceCourseIds = insertedCourses.filter(c => c.department === 'ECE').map(c => c._id);
    const mechCourseIds = insertedCourses.filter(c => c.department === 'MECH').map(c => c._id);
    const civilCourseIds = insertedCourses.filter(c => c.department === 'CIVIL').map(c => c._id);

    // 3. Seed Students (Demonstrating Embedding + Referencing + Indexes)
    const sampleStudents = [
      {
        regNo: 'RA2311003010001',
        firstName: 'Aarav',
        lastName: 'Sharma',
        email: 'aarav.sharma@campus.edu',
        phone: '9840123456',
        dob: new Date('2003-05-14'),
        gender: 'Male',
        department: 'CSE',
        semester: 6,
        academicYear: '2025-2026',
        attendance: 94,
        feeStatus: 'Paid',
        status: 'Active',
        address: { street: '14 Gandhi Marg, Sector 4', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
        guardian: { name: 'Sanjay Sharma', relationship: 'Father', phone: '9840123400' },
        enrolledCourses: cseCourseIds.slice(0, 3),
        grades: [
          { courseCode: 'CS101', courseTitle: 'Data Structures and Algorithms', credits: 4, marks: 95, grade: 'O', semester: 5 },
          { courseCode: 'CS102', courseTitle: 'Database Management Systems & NoSQL', credits: 4, marks: 92, grade: 'O', semester: 5 },
          { courseCode: 'CS103', courseTitle: 'Operating Systems & Concurrency', credits: 3, marks: 88, grade: 'A+', semester: 5 }
        ]
      },
      {
        regNo: 'RA2311003010002',
        firstName: 'Diya',
        lastName: 'Patel',
        email: 'diya.patel@campus.edu',
        phone: '9840234567',
        dob: new Date('2003-08-22'),
        gender: 'Female',
        department: 'CSE',
        semester: 6,
        academicYear: '2025-2026',
        attendance: 96,
        feeStatus: 'Paid',
        status: 'Active',
        address: { street: '88 MG Road, Ellis Bridge', city: 'Ahmedabad', state: 'Gujarat', pincode: '380006' },
        guardian: { name: 'Kiran Patel', relationship: 'Mother', phone: '9840234500' },
        enrolledCourses: cseCourseIds.slice(0, 3),
        grades: [
          { courseCode: 'CS101', courseTitle: 'Data Structures and Algorithms', credits: 4, marks: 98, grade: 'O', semester: 5 },
          { courseCode: 'CS102', courseTitle: 'Database Management Systems & NoSQL', credits: 4, marks: 96, grade: 'O', semester: 5 },
          { courseCode: 'CS104', courseTitle: 'Artificial Intelligence & Machine Learning', credits: 4, marks: 94, grade: 'O', semester: 5 }
        ]
      },
      {
        regNo: 'RA2311003010003',
        firstName: 'Rohan',
        lastName: 'Verma',
        email: 'rohan.verma@campus.edu',
        phone: '9840345678',
        dob: new Date('2004-01-10'),
        gender: 'Male',
        department: 'IT',
        semester: 4,
        academicYear: '2025-2026',
        attendance: 88,
        feeStatus: 'Paid',
        status: 'Active',
        address: { street: '22 Park Street', city: 'Kolkata', state: 'West Bengal', pincode: '700016' },
        guardian: { name: 'Alok Verma', relationship: 'Father', phone: '9840345600' },
        enrolledCourses: itCourseIds,
        grades: [
          { courseCode: 'IT201', courseTitle: 'Full Stack Web Architecture', credits: 3, marks: 84, grade: 'A', semester: 3 },
          { courseCode: 'IT202', courseTitle: 'Cloud Computing and Microservices', credits: 3, marks: 86, grade: 'A', semester: 3 }
        ]
      },
      {
        regNo: 'RA2311003010004',
        firstName: 'Ananya',
        lastName: 'Iyer',
        email: 'ananya.iyer@campus.edu',
        phone: '9840456789',
        dob: new Date('2003-11-05'),
        gender: 'Female',
        department: 'ECE',
        semester: 6,
        academicYear: '2025-2026',
        attendance: 91,
        feeStatus: 'Paid',
        status: 'Active',
        address: { street: '45 Cathedral Road', city: 'Chennai', state: 'Tamil Nadu', pincode: '600086' },
        guardian: { name: 'Subramanian Iyer', relationship: 'Father', phone: '9840456700' },
        enrolledCourses: eceCourseIds,
        grades: [
          { courseCode: 'EC301', courseTitle: 'Digital Signal Processing', credits: 4, marks: 91, grade: 'O', semester: 5 },
          { courseCode: 'EC302', courseTitle: 'Embedded Systems & IoT', credits: 3, marks: 89, grade: 'A+', semester: 5 }
        ]
      },
      {
        regNo: 'RA2311003010005',
        firstName: 'Kabir',
        lastName: 'Mehta',
        email: 'kabir.mehta@campus.edu',
        phone: '9840567890',
        dob: new Date('2004-03-18'),
        gender: 'Male',
        department: 'MECH',
        semester: 4,
        academicYear: '2025-2026',
        attendance: 79,
        feeStatus: 'Partial',
        status: 'Active',
        address: { street: '7 Civil Lines', city: 'Jaipur', state: 'Rajasthan', pincode: '302006' },
        guardian: { name: 'Rajesh Mehta', relationship: 'Father', phone: '9840567800' },
        enrolledCourses: mechCourseIds,
        grades: [
          { courseCode: 'ME401', courseTitle: 'Thermodynamics & Heat Transfer', credits: 4, marks: 74, grade: 'B+', semester: 3 }
        ]
      },
      {
        regNo: 'RA2311003010006',
        firstName: 'Sneha',
        lastName: 'Reddy',
        email: 'sneha.reddy@campus.edu',
        phone: '9840678901',
        dob: new Date('2003-09-12'),
        gender: 'Female',
        department: 'CSE',
        semester: 6,
        academicYear: '2025-2026',
        attendance: 95,
        feeStatus: 'Paid',
        status: 'Active',
        address: { street: '102 Banjara Hills', city: 'Hyderabad', state: 'Telangana', pincode: '500034' },
        guardian: { name: 'Venkat Reddy', relationship: 'Father', phone: '9840678900' },
        enrolledCourses: cseCourseIds.slice(1, 4),
        grades: [
          { courseCode: 'CS102', courseTitle: 'Database Management Systems & NoSQL', credits: 4, marks: 95, grade: 'O', semester: 5 },
          { courseCode: 'CS104', courseTitle: 'Artificial Intelligence & Machine Learning', credits: 4, marks: 92, grade: 'O', semester: 5 }
        ]
      },
      {
        regNo: 'RA2311003010007',
        firstName: 'Aditya',
        lastName: 'Deshmukh',
        email: 'aditya.deshmukh@campus.edu',
        phone: '9840789012',
        dob: new Date('2004-06-30'),
        gender: 'Male',
        department: 'CIVIL',
        semester: 4,
        academicYear: '2025-2026',
        attendance: 82,
        feeStatus: 'Pending',
        status: 'Active',
        address: { street: '5 Shivaji Nagar', city: 'Pune', state: 'Maharashtra', pincode: '411005' },
        guardian: { name: 'Suresh Deshmukh', relationship: 'Father', phone: '9840789000' },
        enrolledCourses: civilCourseIds,
        grades: [
          { courseCode: 'CV501', courseTitle: 'Structural Analysis & Design', credits: 4, marks: 78, grade: 'B+', semester: 3 }
        ]
      },
      {
        regNo: 'RA2311003010008',
        firstName: 'Pooja',
        lastName: 'Nair',
        email: 'pooja.nair@campus.edu',
        phone: '9840890123',
        dob: new Date('2003-12-04'),
        gender: 'Female',
        department: 'IT',
        semester: 6,
        academicYear: '2025-2026',
        attendance: 90,
        feeStatus: 'Paid',
        status: 'Active',
        address: { street: '33 Marine Drive', city: 'Kochi', state: 'Kerala', pincode: '682011' },
        guardian: { name: 'Gopal Nair', relationship: 'Father', phone: '9840890100' },
        enrolledCourses: itCourseIds,
        grades: [
          { courseCode: 'IT201', courseTitle: 'Full Stack Web Architecture', credits: 3, marks: 88, grade: 'A+', semester: 5 },
          { courseCode: 'IT202', courseTitle: 'Cloud Computing and Microservices', credits: 3, marks: 85, grade: 'A', semester: 5 }
        ]
      },
      {
        regNo: 'RA2311003010009',
        firstName: 'Vikram',
        lastName: 'Choudhary',
        email: 'vikram.choudhary@campus.edu',
        phone: '9840901234',
        dob: new Date('2004-04-15'),
        gender: 'Male',
        department: 'ECE',
        semester: 4,
        academicYear: '2025-2026',
        attendance: 73,
        feeStatus: 'Pending',
        status: 'Active',
        address: { street: '19 Gomti Nagar', city: 'Lucknow', state: 'Uttar Pradesh', pincode: '226010' },
        guardian: { name: 'Mahesh Choudhary', relationship: 'Father', phone: '9840901200' },
        enrolledCourses: eceCourseIds,
        grades: [
          { courseCode: 'EC301', courseTitle: 'Digital Signal Processing', credits: 4, marks: 68, grade: 'B', semester: 3 }
        ]
      },
      {
        regNo: 'RA2311003010010',
        firstName: 'Meera',
        lastName: 'Banerjee',
        email: 'meera.banerjee@campus.edu',
        phone: '9841012345',
        dob: new Date('2003-07-19'),
        gender: 'Female',
        department: 'CSE',
        semester: 8,
        academicYear: '2024-2025',
        attendance: 97,
        feeStatus: 'Paid',
        status: 'Active',
        address: { street: '9 Salt Lake Sector V', city: 'Kolkata', state: 'West Bengal', pincode: '700091' },
        guardian: { name: 'Debashis Banerjee', relationship: 'Father', phone: '9841012300' },
        enrolledCourses: cseCourseIds,
        grades: [
          { courseCode: 'CS101', courseTitle: 'Data Structures and Algorithms', credits: 4, marks: 99, grade: 'O', semester: 7 },
          { courseCode: 'CS102', courseTitle: 'Database Management Systems & NoSQL', credits: 4, marks: 97, grade: 'O', semester: 7 },
          { courseCode: 'CS104', courseTitle: 'Artificial Intelligence & Machine Learning', credits: 4, marks: 96, grade: 'O', semester: 7 }
        ]
      },
      {
        regNo: 'RA2311003010011',
        firstName: 'Karan',
        lastName: 'Gill',
        email: 'karan.gill@campus.edu',
        phone: '9841123456',
        dob: new Date('2004-02-11'),
        gender: 'Male',
        department: 'MECH',
        semester: 4,
        academicYear: '2025-2026',
        attendance: 84,
        feeStatus: 'Paid',
        status: 'Active',
        address: { street: '44 Model Town', city: 'Chandigarh', state: 'Punjab', pincode: '160022' },
        guardian: { name: 'Harpreet Gill', relationship: 'Father', phone: '9841123400' },
        enrolledCourses: mechCourseIds,
        grades: [
          { courseCode: 'ME401', courseTitle: 'Thermodynamics & Heat Transfer', credits: 4, marks: 82, grade: 'A', semester: 3 }
        ]
      },
      {
        regNo: 'RA2311003010012',
        firstName: 'Tanvi',
        lastName: 'Kulkarni',
        email: 'tanvi.kulkarni@campus.edu',
        phone: '9841234567',
        dob: new Date('2003-10-27'),
        gender: 'Female',
        department: 'IT',
        semester: 6,
        academicYear: '2025-2026',
        attendance: 93,
        feeStatus: 'Paid',
        status: 'Active',
        address: { street: '12 Kothrud', city: 'Pune', state: 'Maharashtra', pincode: '411038' },
        guardian: { name: 'Anil Kulkarni', relationship: 'Father', phone: '9841234500' },
        enrolledCourses: itCourseIds,
        grades: [
          { courseCode: 'IT201', courseTitle: 'Full Stack Web Architecture', credits: 3, marks: 90, grade: 'O', semester: 5 },
          { courseCode: 'IT202', courseTitle: 'Cloud Computing and Microservices', credits: 3, marks: 88, grade: 'A+', semester: 5 }
        ]
      },
      {
        regNo: 'RA2311003010013',
        firstName: 'Harsh',
        lastName: 'Singhania',
        email: 'harsh.singhania@campus.edu',
        phone: '9841345678',
        dob: new Date('2004-05-08'),
        gender: 'Male',
        department: 'CIVIL',
        semester: 2,
        academicYear: '2025-2026',
        attendance: 87,
        feeStatus: 'Paid',
        status: 'Active',
        address: { street: '56 South City 1', city: 'Gurugram', state: 'Haryana', pincode: '122001' },
        guardian: { name: 'Pankaj Singhania', relationship: 'Father', phone: '9841345600' },
        enrolledCourses: civilCourseIds,
        grades: [
          { courseCode: 'CV501', courseTitle: 'Structural Analysis & Design', credits: 4, marks: 80, grade: 'A', semester: 1 }
        ]
      },
      {
        regNo: 'RA2311003010014',
        firstName: 'Ishita',
        lastName: 'Sen',
        email: 'ishita.sen@campus.edu',
        phone: '9841456789',
        dob: new Date('2003-04-14'),
        gender: 'Female',
        department: 'ECE',
        semester: 6,
        academicYear: '2025-2026',
        attendance: 92,
        feeStatus: 'Paid',
        status: 'Active',
        address: { street: '3 Ballygunge Circular Rd', city: 'Kolkata', state: 'West Bengal', pincode: '700019' },
        guardian: { name: 'Sourav Sen', relationship: 'Father', phone: '9841456700' },
        enrolledCourses: eceCourseIds,
        grades: [
          { courseCode: 'EC301', courseTitle: 'Digital Signal Processing', credits: 4, marks: 87, grade: 'A+', semester: 5 },
          { courseCode: 'EC302', courseTitle: 'Embedded Systems & IoT', credits: 3, marks: 91, grade: 'O', semester: 5 }
        ]
      },
      {
        regNo: 'RA2311003010015',
        firstName: 'Dev',
        lastName: 'Kapoor',
        email: 'dev.kapoor@campus.edu',
        phone: '9841567890',
        dob: new Date('2004-09-25'),
        gender: 'Male',
        department: 'CSE',
        semester: 2,
        academicYear: '2025-2026',
        attendance: 80,
        feeStatus: 'Partial',
        status: 'Active',
        address: { street: '80 Defence Colony', city: 'New Delhi', state: 'Delhi', pincode: '110024' },
        guardian: { name: 'Deepak Kapoor', relationship: 'Father', phone: '9841567800' },
        enrolledCourses: cseCourseIds.slice(0, 2),
        grades: [
          { courseCode: 'CS101', courseTitle: 'Data Structures and Algorithms', credits: 4, marks: 76, grade: 'B+', semester: 1 }
        ]
      }
    ];

    for (const studentData of sampleStudents) {
      const studentDoc = new Student(studentData);
      await studentDoc.save();
    }

    console.log(`[Seeder] Seeded ${sampleStudents.length} Students with embedded address, guardian & grades.`);

    // Build & list indexes
    const indexes = await Student.collection.indexes();
    console.log('[Seeder] Active MongoDB Indexes on students collection:');
    indexes.forEach(idx => {
      console.log(` - Index: ${idx.name} | Key: ${JSON.stringify(idx.key)} | Unique: ${idx.unique ? true : false}`);
    });

    console.log('[Seeder] Database seeding completed successfully.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[Seeder Error]:', error);
    process.exit(1);
  }
};

seedData();
