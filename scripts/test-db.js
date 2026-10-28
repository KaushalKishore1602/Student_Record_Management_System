require('dotenv').config();
const mongoose = require('mongoose');
const Student = require('../models/Student');
const Department = require('../models/Department');
const Course = require('../models/Course');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const BSON = mongoose.mongo.BSON;

const results = [];

function recordTest(id, name, status, details = '') {
  results.push({ id, name, status, details });
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} [${id}] ${name} -> ${status} ${details ? '(' + details + ')' : ''}`);
}

async function runTests() {
  console.log('===============================================================');
  console.log('       STUDENT RECORD MANAGEMENT SYSTEM - TEST SUITE           ');
  console.log('===============================================================\n');

  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/record_management_system';
    await mongoose.connect(mongoUri);
    recordTest('TC-01', 'MongoDB Connection Test', 'PASS', 'Connected successfully to local instance');

    // TC-02: Read / Query Existing Records
    const count = await Student.countDocuments();
    if (count > 0) {
      recordTest('TC-02', 'Read / Count Student Records', 'PASS', `Found ${count} student records`);
    } else {
      recordTest('TC-02', 'Read / Count Student Records', 'FAIL', 'Zero records found. Run seed script first.');
    }

    // TC-03: Create Record (CRUD - Create)
    const testRegNo = 'RA2311TEST999';
    await Student.deleteOne({ regNo: testRegNo }); // clean if present

    const newStudent = new Student({
      regNo: testRegNo,
      firstName: 'Test',
      lastName: 'Candidate',
      email: 'test.candidate@campus.edu',
      phone: '9999999999',
      gender: 'Other',
      department: 'CSE',
      semester: 4,
      attendance: 90,
      feeStatus: 'Paid',
      status: 'Active',
      address: {
        street: '123 Test Avenue',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001'
      },
      guardian: {
        name: 'Guardian Test',
        relationship: 'Guardian',
        phone: '9999999990'
      },
      grades: [
        { courseCode: 'CS101', courseTitle: 'Data Structures', credits: 4, marks: 95, grade: 'O', semester: 3 }
      ]
    });

    const saved = await newStudent.save();
    recordTest('TC-03', 'CRUD - Create Student Record with Embedded Data', 'PASS', `Created with ID: ${saved._id}, CGPA: ${saved.cgpa}`);

    // TC-04: Negative Test - Unique Constraint on regNo
    let duplicateCaught = false;
    try {
      const dup = new Student({
        regNo: testRegNo,
        firstName: 'Duplicate',
        lastName: 'Person',
        email: 'dup.unique@campus.edu',
        department: 'CSE',
        semester: 2
      });
      await dup.save();
    } catch (err) {
      duplicateCaught = true;
    }
    if (duplicateCaught) {
      recordTest('TC-04', 'Schema Validation - Unique regNo Constraint', 'PASS', 'Duplicate registration rejected as expected');
    } else {
      recordTest('TC-04', 'Schema Validation - Unique regNo Constraint', 'FAIL', 'Duplicate was permitted');
    }

    // TC-05: Update Record (CRUD - Update)
    const updated = await Student.findOneAndUpdate(
      { regNo: testRegNo },
      { $set: { attendance: 98, 'address.city': 'Mysuru' } },
      { returnDocument: 'after' }
    );
    if (updated && updated.attendance === 98 && updated.address.city === 'Mysuru') {
      recordTest('TC-05', 'CRUD - Update Student Record & Embedded Fields', 'PASS', 'Attendance updated to 98 and city to Mysuru');
    } else {
      recordTest('TC-05', 'CRUD - Update Student Record & Embedded Fields', 'FAIL', 'Failed to update');
    }

    // TC-06: Query / Filter / Search (CRUD - Read with regex)
    const searchMatch = await Student.find({
      $or: [
        { regNo: new RegExp('TEST', 'i') },
        { firstName: new RegExp('Test', 'i') }
      ]
    });
    if (searchMatch.length > 0) {
      recordTest('TC-06', 'Query Search with Regex Operator', 'PASS', `Matched ${searchMatch.length} record(s)`);
    } else {
      recordTest('TC-06', 'Query Search with Regex Operator', 'FAIL', 'Search returned no records');
    }

    // TC-07: Delete Record (CRUD - Delete)
    const deleted = await Student.findOneAndDelete({ regNo: testRegNo });
    if (deleted) {
      recordTest('TC-07', 'CRUD - Delete Student Record', 'PASS', `Removed record ${testRegNo}`);
    } else {
      recordTest('TC-07', 'CRUD - Delete Student Record', 'FAIL', 'Failed to delete');
    }

    // TC-08: Aggregation Pipeline 1 - Department Summary
    const deptAgg = await Student.aggregate([
      {
        $group: {
          _id: '$department',
          totalStudents: { $sum: 1 },
          avgCgpa: { $avg: '$cgpa' }
        }
      },
      {
        $lookup: {
          from: 'departments',
          localField: '_id',
          foreignField: 'code',
          as: 'deptInfo'
        }
      }
    ]);
    if (deptAgg.length > 0) {
      recordTest('TC-08', 'MongoDB Aggregation - Department Summary & $lookup', 'PASS', `Aggregated ${deptAgg.length} departments`);
    } else {
      recordTest('TC-08', 'MongoDB Aggregation - Department Summary & $lookup', 'FAIL', 'Aggregation returned empty');
    }

    // TC-09: Aggregation Pipeline 2 - $unwind Embedded Grades Array
    const gradeAgg = await Student.aggregate([
      { $unwind: '$grades' },
      {
        $group: {
          _id: '$grades.grade',
          count: { $sum: 1 }
        }
      }
    ]);
    if (gradeAgg.length > 0) {
      recordTest('TC-09', 'MongoDB Aggregation - $unwind Embedded Array', 'PASS', `Counted grades across ${gradeAgg.length} grade categories`);
    } else {
      recordTest('TC-09', 'MongoDB Aggregation - $unwind Embedded Array', 'FAIL', 'No grades aggregated');
    }

    // TC-10: MongoDB Index Check
    const indexes = await Student.collection.indexes();
    const hasRegNoIndex = indexes.some(idx => idx.key.regNo === 1 && idx.unique === true);
    const hasCompoundIndex = indexes.some(idx => idx.key.department === 1 && idx.key.semester === 1);
    if (hasRegNoIndex && hasCompoundIndex) {
      recordTest('TC-10', 'MongoDB Indexes - Unique & Compound Index Validation', 'PASS', 'Verified unique regNo index and compound (dept, sem) index');
    } else {
      recordTest('TC-10', 'MongoDB Indexes - Unique & Compound Index Validation', 'FAIL', 'Missing expected indexes');
    }

    // TC-11: Authentication & Password Hash Verification (bcryptjs)
    const adminUser = await User.findOne({ email: 'admin@campus.edu' });
    if (adminUser) {
      const passwordMatches = await adminUser.comparePassword('Admin@123');
      const wrongPasswordFails = !(await adminUser.comparePassword('WrongPassword'));
      if (passwordMatches && wrongPasswordFails) {
        recordTest('TC-11', 'Authentication - Role & Password Hash Verification', 'PASS', `Verified Admin (${adminUser.role}) with bcrypt password hash`);
      } else {
        recordTest('TC-11', 'Authentication - Role & Password Hash Verification', 'FAIL', 'Password check mismatch');
      }
    } else {
      recordTest('TC-11', 'Authentication - Role & Password Hash Verification', 'FAIL', 'Admin user not found');
    }

    // TC-12: BSON Serialization & Deserialization
    const sampleDoc = { testReg: 'BSON_TEST', name: 'Binary JSON Test', val: 123.45 };
    const serialized = BSON.serialize(sampleDoc);
    const deserialized = BSON.deserialize(serialized);
    if (deserialized && deserialized.testReg === 'BSON_TEST' && deserialized.val === 123.45) {
      recordTest('TC-12', 'BSON Serialization & Ingestion Engine', 'PASS', `Successfully serialized & deserialized ${serialized.length} bytes`);
    } else {
      recordTest('TC-12', 'BSON Serialization & Ingestion Engine', 'FAIL', 'BSON parsing failed');
    }

    // TC-13: Activity Audit Log Persistence in MongoDB
    const testLog = new ActivityLog({
      action: 'CREATE_STUDENT',
      performedBy: 'Test Runner',
      role: 'Admin',
      targetRegNo: 'RA2311TEST999',
      details: 'Audit log persistence test verified'
    });
    await testLog.save();
    const retrievedLog = await ActivityLog.findById(testLog._id);
    if (retrievedLog && retrievedLog.action === 'CREATE_STUDENT') {
      recordTest('TC-13', 'MongoDB Audit Log Persistence', 'PASS', `Saved & retrieved log [${retrievedLog._id}]`);
      await ActivityLog.findByIdAndDelete(testLog._id);
    } else {
      recordTest('TC-13', 'MongoDB Audit Log Persistence', 'FAIL', 'Failed to retrieve saved log');
    }

    console.log('\n===============================================================');
    console.log('                     TEST EXECUTION REPORT                     ');
    console.log('===============================================================');
    console.table(results);

    const allPassed = results.every(r => r.status === 'PASS');
    console.log(`\nOverall Result: ${allPassed ? 'ALL TESTS PASSED (' + results.length + '/' + results.length + ') ✅' : 'SOME TESTS FAILED ❌'}`);

    await mongoose.disconnect();
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('Test Suite Error:', error);
    process.exit(1);
  }
}

runTests();
