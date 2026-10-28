const Student = require('../models/Student');
const mongoose = require('mongoose');
const BSON = mongoose.mongo.BSON;
const logActivity = require('../utils/logger');

/**
 * Robust CSV parser that handles quotes, commas, and line breaks
 */
function parseCSV(text) {
  const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0 || (values.length === 1 && values[0].trim() === '')) continue;

    const row = {};
    headers.forEach((h, index) => {
      row[h] = values[index] !== undefined ? values[index].trim() : '';
    });
    records.push(row);
  }

  return records;
}

function parseCSVLine(line) {
  const values = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      values.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  values.push(cur);
  return values;
}

/**
 * Transform CSV Row Object to Student Document Schema
 */
function mapRowToStudent(row) {
  const regNo = (row.regno || row['registration number'] || row.reg_no || '').toUpperCase().trim();
  const firstName = row.firstname || row['first name'] || row.first_name || '';
  const lastName = row.lastname || row['last name'] || row.last_name || '';
  const email = (row.email || '').toLowerCase().trim();
  const phone = row.phone || row['phone number'] || '9876543210';
  const gender = row.gender || 'Male';
  const department = (row.department || row.dept || 'CSE').toUpperCase().trim();
  const semester = parseInt(row.semester || row.sem || '1', 10);
  const attendance = parseFloat(row.attendance || '85');
  const feeStatus = row.feestatus || row['fee status'] || 'Paid';
  const status = row.status || 'Active';
  const academicYear = row.academicyear || row['academic year'] || '2025-2026';

  // Address
  const address = {
    street: row.street || row.address || '',
    city: row.city || '',
    state: row.state || '',
    pincode: row.pincode || row.zip || ''
  };

  // Guardian
  const guardian = {
    name: row.guardianname || row['guardian name'] || '',
    relationship: row.guardianrelationship || row.relationship || 'Parent',
    phone: row.guardianphone || row['guardian phone'] || ''
  };

  // Grade parsing if provided (e.g. courseCode:marks, or initial course)
  const grades = [];
  if (row.coursecode && row.coursetitle) {
    grades.push({
      courseCode: row.coursecode.toUpperCase(),
      courseTitle: row.coursetitle,
      credits: parseFloat(row.credits || 4),
      marks: parseFloat(row.marks || 80),
      grade: row.grade || 'A',
      semester: parseInt(row.gradesemester || semester, 10)
    });
  }

  return {
    regNo,
    firstName,
    lastName,
    email,
    phone,
    gender,
    department,
    semester: isNaN(semester) ? 1 : semester,
    attendance: isNaN(attendance) ? 85 : attendance,
    feeStatus,
    status,
    academicYear,
    address,
    guardian,
    grades
  };
}

/**
 * @desc    Upload and Batch Ingest Data (CSV, JSON, BSON)
 * @route   POST /api/upload/batch
 */
exports.uploadBatchData = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select a file to upload' });
    }

    const { duplicateStrategy = 'skip' } = req.body; // 'skip' or 'update'
    const fileName = req.file.originalname;
    const fileExt = fileName.split('.').pop().toLowerCase();
    let rawRecords = [];

    // Parse according to file format
    if (fileExt === 'json') {
      const fileContent = req.file.buffer.toString('utf8');
      const parsed = JSON.parse(fileContent);
      rawRecords = Array.isArray(parsed) ? parsed : (parsed.students || [parsed]);
    } else if (fileExt === 'csv') {
      const fileContent = req.file.buffer.toString('utf8');
      const parsedRows = parseCSV(fileContent);
      rawRecords = parsedRows.map(mapRowToStudent);
    } else if (fileExt === 'bson') {
      try {
        // BSON Deserialization using official BSON engine
        const buffer = req.file.buffer;
        let index = 0;
        while (index < buffer.length) {
          const docSize = buffer.readInt32LE(index);
          if (docSize <= 0 || index + docSize > buffer.length) break;
          const slice = buffer.slice(index, index + docSize);
          const doc = BSON.deserialize(slice);
          rawRecords.push(doc);
          index += docSize;
        }
      } catch (bsonErr) {
        // Fallback single document deserialization
        try {
          const single = BSON.deserialize(req.file.buffer);
          rawRecords = Array.isArray(single) ? single : (single.students || [single]);
        } catch (e2) {
          throw new Error('Failed to deserialize BSON file format: ' + bsonErr.message);
        }
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Unsupported file format! Please upload .csv, .json, or .bson files only.'
      });
    }

    if (rawRecords.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No records found inside the uploaded file'
      });
    }

    // Process & Insert into MongoDB
    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors = [];
    const processedList = [];

    for (let i = 0; i < rawRecords.length; i++) {
      const item = rawRecords[i];
      const rowNum = i + 1;

      try {
        const regNo = (item.regNo || item.regno || '').toUpperCase().trim();
        const email = (item.email || '').toLowerCase().trim();

        if (!regNo || !item.firstName || !item.lastName || !email || !item.department) {
          errors.push(`Row ${rowNum}: Missing mandatory fields (regNo, firstName, lastName, email, department).`);
          continue;
        }

        const existing = await Student.findOne({
          $or: [{ regNo }, { email }]
        });

        if (existing) {
          if (duplicateStrategy === 'update') {
            Object.assign(existing, item);
            existing.regNo = regNo;
            existing.email = email;
            await existing.save();
            updatedCount++;
            processedList.push({ regNo, name: `${existing.firstName} ${existing.lastName}`, action: 'UPDATED' });
          } else {
            skippedCount++;
            processedList.push({ regNo, name: `${item.firstName} ${item.lastName}`, action: 'SKIPPED (Already exists)' });
          }
        } else {
          // Normalize & Save new
          item.regNo = regNo;
          item.email = email;
          if (item._id) delete item._id; // avoid collision

          const newStudent = new Student(item);
          await newStudent.save();
          insertedCount++;
          processedList.push({ regNo, name: `${newStudent.firstName} ${newStudent.lastName}`, action: 'INSERTED' });
        }
      } catch (err) {
        errors.push(`Row ${rowNum} (${item.regNo || 'Unknown'}): ${err.message}`);
      }
    }

    await logActivity({
      action: 'BATCH_UPLOAD',
      performedBy: 'Administrator',
      role: 'Admin',
      details: `Batch uploaded ${fileName} (${fileExt.toUpperCase()}): Inserted ${insertedCount}, Updated ${updatedCount}, Skipped ${skippedCount}`
    });

    res.json({
      success: true,
      message: `Batch upload processed successfully from ${fileExt.toUpperCase()} file.`,
      fileType: fileExt.toUpperCase(),
      fileName,
      totalRecordsInFile: rawRecords.length,
      summary: {
        inserted: insertedCount,
        updated: updatedCount,
        skipped: skippedCount,
        errorCount: errors.length
      },
      errors,
      processedPreview: processedList.slice(0, 10)
    });
  } catch (error) {
    console.error('Error in uploadBatchData:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Download Sample CSV Template
 * @route   GET /api/upload/template/csv
 */
exports.downloadCsvTemplate = (req, res) => {
  const headers = [
    'regNo', 'firstName', 'lastName', 'email', 'phone', 'gender', 'department',
    'semester', 'attendance', 'feeStatus', 'status', 'street', 'city', 'state', 'pincode',
    'guardianName', 'guardianRelationship', 'guardianPhone', 'courseCode', 'courseTitle', 'credits', 'marks', 'grade'
  ];

  const sampleRow1 = [
    'RA2311003010091', 'Vivaan', 'Kapoor', 'vivaan.k@campus.edu', '9840111222', 'Male', 'CSE',
    '4', '92', 'Paid', 'Active', '12 Brigade Road', 'Bengaluru', 'Karnataka', '560025',
    'Rajesh Kapoor', 'Father', '9840111000', 'CS101', 'Data Structures and Algorithms', '4', '88', 'A+'
  ];

  const sampleRow2 = [
    'RA2311003010092', 'Saanvi', 'Joshi', 'saanvi.j@campus.edu', '9840333444', 'Female', 'IT',
    '6', '95', 'Paid', 'Active', '45 Law College Road', 'Pune', 'Maharashtra', '411004',
    'Milind Joshi', 'Father', '9840333000', 'IT201', 'Full Stack Web Architecture', '3', '94', 'O'
  ];

  const csvContent = [headers.join(','), sampleRow1.join(','), sampleRow2.join(',')].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=student_upload_template.csv');
  res.send(csvContent);
};

/**
 * @desc    Download Sample JSON Template
 * @route   GET /api/upload/template/json
 */
exports.downloadJsonTemplate = (req, res) => {
  const sample = [
    {
      regNo: 'RA2311003010095',
      firstName: 'Reyansh',
      lastName: 'Gupta',
      email: 'reyansh.g@campus.edu',
      phone: '9840555666',
      gender: 'Male',
      department: 'ECE',
      semester: 4,
      attendance: 89,
      feeStatus: 'Paid',
      status: 'Active',
      address: {
        street: '78 Sector 18',
        city: 'Noida',
        state: 'Uttar Pradesh',
        pincode: '201301'
      },
      guardian: {
        name: 'Sunil Gupta',
        relationship: 'Father',
        phone: '9840555000'
      },
      grades: [
        {
          courseCode: 'EC301',
          courseTitle: 'Digital Signal Processing',
          credits: 4,
          marks: 86,
          grade: 'A',
          semester: 3
        }
      ]
    }
  ];

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename=student_upload_template.json');
  res.json(sample);
};

/**
 * @desc    Export All Students in BSON Format
 * @route   GET /api/upload/export/bson
 */
exports.exportBson = async (req, res) => {
  try {
    const students = await Student.find().lean();
    
    // Concatenate serialized BSON documents into buffer
    const buffers = students.map(s => BSON.serialize(s));
    const combinedBuffer = Buffer.concat(buffers);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename=students_export.bson');
    res.send(combinedBuffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
