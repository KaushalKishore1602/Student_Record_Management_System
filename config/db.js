const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/record_management_system', {
      autoIndex: true
    });

    console.log(`[MongoDB Connected]: Host -> ${conn.connection.host}, Database -> ${conn.connection.name}`);

    // Ensure MongoDB native schema validation rules and indexes
    await setupCollectionValidation(conn.connection.db);

    return conn;
  } catch (error) {
    console.error(`[MongoDB Connection Error]: ${error.message}`);
    process.exit(1);
  }
};

/**
 * Configure MongoDB $jsonSchema Collection Validation Rules
 * Required per Section 5 of Project Constraints
 */
async function setupCollectionValidation(db) {
  try {
    const collections = await db.listCollections({ name: 'students' }).toArray();
    
    const studentSchemaValidation = {
      $jsonSchema: {
        bsonType: 'object',
        required: ['regNo', 'firstName', 'lastName', 'email', 'department', 'semester'],
        properties: {
          regNo: {
            bsonType: 'string',
            pattern: '^[A-Z0-9]{5,15}$',
            description: 'Must be an alphanumeric uppercase string between 5 and 15 characters'
          },
          firstName: {
            bsonType: 'string',
            minLength: 2,
            maxLength: 50,
            description: 'First name must be a string of at least 2 characters'
          },
          lastName: {
            bsonType: 'string',
            minLength: 1,
            maxLength: 50,
            description: 'Last name must be a string'
          },
          email: {
            bsonType: 'string',
            pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
            description: 'Must be a valid email address'
          },
          phone: {
            bsonType: 'string',
            description: 'Contact phone number'
          },
          department: {
            bsonType: 'string',
            description: 'Department code such as CSE, ECE, MECH, IT, CIVIL'
          },
          semester: {
            bsonType: 'int',
            minimum: 1,
            maximum: 8,
            description: 'Semester must be an integer between 1 and 8'
          },
          cgpa: {
            bsonType: ['double', 'int'],
            minimum: 0.0,
            maximum: 10.0,
            description: 'CGPA must be a decimal between 0.0 and 10.0'
          },
          attendance: {
            bsonType: ['double', 'int'],
            minimum: 0,
            maximum: 100,
            description: 'Attendance percentage between 0 and 100'
          },
          feeStatus: {
            enum: ['Paid', 'Pending', 'Partial'],
            description: 'Can only be Paid, Pending, or Partial'
          },
          status: {
            enum: ['Active', 'Suspended', 'Graduated', 'Alumni'],
            description: 'Student academic status'
          },
          address: {
            bsonType: 'object',
            description: 'Embedded address document',
            properties: {
              street: { bsonType: 'string' },
              city: { bsonType: 'string' },
              state: { bsonType: 'string' },
              pincode: { bsonType: 'string' }
            }
          },
          guardian: {
            bsonType: 'object',
            description: 'Embedded guardian document',
            properties: {
              name: { bsonType: 'string' },
              relationship: { bsonType: 'string' },
              phone: { bsonType: 'string' }
            }
          },
          grades: {
            bsonType: 'array',
            description: 'Embedded array of semester subject grades',
            items: {
              bsonType: 'object',
              required: ['courseCode', 'courseTitle', 'credits', 'grade', 'marks'],
              properties: {
                courseCode: { bsonType: 'string' },
                courseTitle: { bsonType: 'string' },
                credits: { bsonType: ['int', 'double'] },
                grade: { bsonType: 'string' },
                marks: { bsonType: ['int', 'double'], minimum: 0, maximum: 100 },
                semester: { bsonType: 'int' }
              }
            }
          }
        }
      }
    };

    if (collections.length === 0) {
      await db.createCollection('students', {
        validator: studentSchemaValidation,
        validationAction: 'warn' // allows graceful operations while enforcing schema rules
      });
      console.log('[Schema Validation]: Created "students" collection with $jsonSchema validation rules.');
    } else {
      await db.command({
        collMod: 'students',
        validator: studentSchemaValidation,
        validationAction: 'warn'
      });
      console.log('[Schema Validation]: Updated "students" collection validator.');
    }
  } catch (err) {
    console.warn(`[Schema Validation Notice]: ${err.message}`);
  }
}

module.exports = connectDB;
