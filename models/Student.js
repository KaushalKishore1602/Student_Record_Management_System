const mongoose = require('mongoose');

// Embedded Sub-schema for Course Grades
const GradeSchema = new mongoose.Schema(
  {
    courseCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    courseTitle: {
      type: String,
      required: true,
      trim: true
    },
    credits: {
      type: Number,
      required: true,
      min: 1,
      max: 6
    },
    marks: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    grade: {
      type: String,
      required: true,
      enum: ['O', 'A+', 'A', 'B+', 'B', 'C', 'F'],
      default: 'A'
    },
    semester: {
      type: Number,
      min: 1,
      max: 8
    }
  },
  { _id: false }
);

// Embedded Sub-schema for Student Address
const AddressSchema = new mongoose.Schema(
  {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    pincode: { type: String, default: '' }
  },
  { _id: false }
);

// Embedded Sub-schema for Guardian Details
const GuardianSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    relationship: { type: String, default: 'Parent' },
    phone: { type: String, default: '' }
  },
  { _id: false }
);

// Main Student Document Schema
const StudentSchema = new mongoose.Schema(
  {
    regNo: {
      type: String,
      required: [true, 'Registration Number is required'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^[A-Z0-9]{5,15}$/, 'Registration number must be 5-15 alphanumeric characters']
    },
    firstName: {
      type: String,
      required: [true, 'First Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 50
    },
    lastName: {
      type: String,
      required: [true, 'Last Name is required'],
      trim: true,
      maxlength: 50
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Please provide a valid email']
    },
    phone: {
      type: String,
      trim: true,
      default: '9876543210'
    },
    dob: {
      type: Date,
      default: () => new Date('2004-01-01')
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      default: 'Male'
    },
    // Referencing Department by its Code
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
      uppercase: true
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required'],
      min: [1, 'Semester cannot be less than 1'],
      max: [8, 'Semester cannot exceed 8'],
      default: 1
    },
    academicYear: {
      type: String,
      default: '2025-2026'
    },
    cgpa: {
      type: Number,
      min: 0.0,
      max: 10.0,
      default: 0.0
    },
    attendance: {
      type: Number,
      min: 0,
      max: 100,
      default: 85
    },
    feeStatus: {
      type: String,
      enum: ['Paid', 'Pending', 'Partial'],
      default: 'Paid'
    },
    status: {
      type: String,
      enum: ['Active', 'Suspended', 'Graduated', 'Alumni'],
      default: 'Active'
    },

    // Embedded Documents
    address: {
      type: AddressSchema,
      default: () => ({})
    },
    guardian: {
      type: GuardianSchema,
      default: () => ({})
    },
    grades: [GradeSchema],

    // Referencing courses via ObjectId
    enrolledCourses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
      }
    ]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for Full Name
StudentSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Auto-calculate CGPA before saving if grades exist
StudentSchema.pre('save', function () {
  if (this.grades && this.grades.length > 0) {
    let totalCredits = 0;
    let weightedPoints = 0;
    
    // Mapping grade to points on 10.0 scale
    const gradePointMap = {
      'O': 10,
      'A+': 9,
      'A': 8,
      'B+': 7,
      'B': 6,
      'C': 5,
      'F': 0
    };

    this.grades.forEach(g => {
      const pts = gradePointMap[g.grade] !== undefined ? gradePointMap[g.grade] : Math.min(10, Math.max(0, g.marks / 10));
      totalCredits += g.credits;
      weightedPoints += pts * g.credits;
    });

    if (totalCredits > 0) {
      this.cgpa = parseFloat((weightedPoints / totalCredits).toFixed(2));
    }
  }
});

// Indexes for High Performance Querying per Section 5 Constraints
// 1. Unique index on regNo (automatically handled by unique: true)
// 2. Unique index on email (automatically handled by unique: true)
// 3. Compound index on department + semester
StudentSchema.index({ department: 1, semester: 1 });
// 4. Text index for full-text search across multiple fields
StudentSchema.index({
  regNo: 'text',
  firstName: 'text',
  lastName: 'text',
  email: 'text'
});

module.exports = mongoose.model('Student', StudentSchema);
