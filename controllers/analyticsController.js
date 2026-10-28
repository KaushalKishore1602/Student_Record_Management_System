const Student = require('../models/Student');
const Department = require('../models/Department');
const Course = require('../models/Course');

/**
 * @desc    MongoDB Aggregation Pipeline 1: Department-wise Academic Performance Analysis
 * @route   GET /api/analytics/department-summary
 */
exports.getDepartmentSummary = async (req, res) => {
  try {
    const pipeline = [
      {
        $match: {
          status: { $in: ['Active', 'Graduated'] }
        }
      },
      {
        $group: {
          _id: '$department',
          totalStudents: { $sum: 1 },
          avgCgpa: { $avg: '$cgpa' },
          maxCgpa: { $max: '$cgpa' },
          minCgpa: { $min: '$cgpa' },
          avgAttendance: { $avg: '$attendance' },
          feesPaidCount: {
            $sum: { $cond: [{ $eq: ['$feeStatus', 'Paid'] }, 1, 0] }
          }
        }
      },
      // $lookup: Joining referenced Department collection
      {
        $lookup: {
          from: 'departments',
          localField: '_id',
          foreignField: 'code',
          as: 'deptDetails'
        }
      },
      {
        $unwind: {
          path: '$deptDetails',
          preserveNullAndEmptyArrays: true
        }
      },
      // $project: Shaping the output document
      {
        $project: {
          departmentCode: '$_id',
          departmentName: { $ifNull: ['$deptDetails.name', '$_id'] },
          hod: { $ifNull: ['$deptDetails.hod', 'N/A'] },
          totalStudents: 1,
          avgCgpa: { $round: ['$avgCgpa', 2] },
          maxCgpa: { $round: ['$maxCgpa', 2] },
          minCgpa: { $round: ['$minCgpa', 2] },
          avgAttendance: { $round: ['$avgAttendance', 1] },
          feesPaidPercentage: {
            $round: [
              {
                $multiply: [
                  { $divide: ['$feesPaidCount', { $max: ['$totalStudents', 1] }] },
                  100
                ]
              },
              1
            ]
          }
        }
      },
      {
        $sort: { avgCgpa: -1 }
      }
    ];

    const results = await Student.aggregate(pipeline);

    res.json({
      success: true,
      description: 'Department Academic Performance Summary using MongoDB Aggregation ($match, $group, $lookup, $unwind, $project, $sort)',
      pipeline,
      data: results
    });
  } catch (error) {
    console.error('Error in getDepartmentSummary:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    MongoDB Aggregation Pipeline 2: Semester-wise Performance & Pass Rate
 * @route   GET /api/analytics/semester-distribution
 */
exports.getSemesterDistribution = async (req, res) => {
  try {
    const pipeline = [
      {
        $group: {
          _id: '$semester',
          studentCount: { $sum: 1 },
          avgCgpa: { $avg: '$cgpa' },
          passingCount: {
            $sum: { $cond: [{ $gte: ['$cgpa', 5.0] }, 1, 0] }
          },
          distinctionCount: {
            $sum: { $cond: [{ $gte: ['$cgpa', 8.5] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          semester: '$_id',
          studentCount: 1,
          avgCgpa: { $round: ['$avgCgpa', 2] },
          passPercentage: {
            $round: [
              {
                $multiply: [
                  { $divide: ['$passingCount', { $max: ['$studentCount', 1] }] },
                  100
                ]
              },
              1
            ]
          },
          distinctionCount: 1
        }
      },
      {
        $sort: { semester: 1 }
      }
    ];

    const results = await Student.aggregate(pipeline);

    res.json({
      success: true,
      description: 'Semester-wise Pass Rate and Performance Distribution',
      pipeline,
      data: results
    });
  } catch (error) {
    console.error('Error in getSemesterDistribution:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    MongoDB Aggregation Pipeline 3: Grade Distribution Across Embedded Grades
 * @route   GET /api/analytics/grade-distribution
 */
exports.getGradeDistribution = async (req, res) => {
  try {
    const pipeline = [
      // Flatten embedded array of grades
      { $unwind: '$grades' },
      {
        $group: {
          _id: '$grades.grade',
          count: { $sum: 1 },
          avgMarks: { $avg: '$grades.marks' }
        }
      },
      {
        $project: {
          grade: '$_id',
          count: 1,
          avgMarks: { $round: ['$avgMarks', 1] }
        }
      },
      { $sort: { count: -1 } }
    ];

    const results = await Student.aggregate(pipeline);

    res.json({
      success: true,
      description: 'Grade Distribution using $unwind on embedded grades array',
      pipeline,
      data: results
    });
  } catch (error) {
    console.error('Error in getGradeDistribution:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    MongoDB Aggregation Pipeline 4: Top Performing Students Leaderboard
 * @route   GET /api/analytics/top-performers
 */
exports.getTopPerformers = async (req, res) => {
  try {
    const pipeline = [
      { $match: { status: 'Active' } },
      { $sort: { cgpa: -1, attendance: -1 } },
      { $limit: 5 },
      {
        $project: {
          regNo: 1,
          fullName: { $concat: ['$firstName', ' ', '$lastName'] },
          department: 1,
          semester: 1,
          cgpa: 1,
          attendance: 1
        }
      }
    ];

    const results = await Student.aggregate(pipeline);

    res.json({
      success: true,
      description: 'Top 5 Students Leaderboard ($match, $sort, $limit, $project)',
      pipeline,
      data: results
    });
  } catch (error) {
    console.error('Error in getTopPerformers:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Overall System KPIs and Statistics for Dashboard Header
 * @route   GET /api/analytics/dashboard-stats
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const [totalStudents, activeStudents, deptCount, courseCount, cgpaAgg, feeAgg] = await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ status: 'Active' }),
      Department.countDocuments(),
      Course.countDocuments(),
      Student.aggregate([
        { $group: { _id: null, avgCgpa: { $avg: '$cgpa' }, avgAttendance: { $avg: '$attendance' } } }
      ]),
      Student.aggregate([
        {
          $group: {
            _id: '$feeStatus',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const overallAvgCgpa = cgpaAgg.length > 0 ? (cgpaAgg[0].avgCgpa || 0).toFixed(2) : '0.00';
    const overallAvgAttendance = cgpaAgg.length > 0 ? (cgpaAgg[0].avgAttendance || 0).toFixed(1) : '0.0';

    res.json({
      success: true,
      data: {
        totalStudents,
        activeStudents,
        deptCount,
        courseCount,
        overallAvgCgpa,
        overallAvgAttendance,
        feeDistribution: feeAgg
      }
    });
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    MongoDB Query Playground: Demonstrates custom live MongoDB queries for professors/reviewers
 * @route   POST /api/analytics/query-playground
 */
exports.runQueryPlayground = async (req, res) => {
  try {
    const { queryType, params = {} } = req.body;
    let queryResult = null;
    let explanation = '';
    let executedQuery = '';

    switch (queryType) {
      case 'HIGH_ACHIEVERS':
        executedQuery = `Student.find({ cgpa: { $gte: 8.5 } }).select('regNo firstName lastName department cgpa')`;
        explanation = 'MongoDB Range Operator ($gte) retrieving all students with CGPA >= 8.5';
        queryResult = await Student.find({ cgpa: { $gte: 8.5 } })
          .select('regNo firstName lastName department cgpa')
          .limit(10);
        break;

      case 'EMBEDDED_ELEMMATCH':
        executedQuery = `Student.find({ grades: { $elemMatch: { marks: { $gte: 90 }, grade: 'O' } } })`;
        explanation = 'MongoDB Array Operator ($elemMatch) querying embedded grades where marks >= 90 and grade is O';
        queryResult = await Student.find({
          grades: { $elemMatch: { marks: { $gte: 90 }, grade: 'O' } }
        })
          .select('regNo firstName lastName department grades')
          .limit(5);
        break;

      case 'COMPLEX_LOGICAL':
        executedQuery = `Student.find({ $or: [{ department: 'CSE', cgpa: { $gte: 8.0 } }, { attendance: { $lt: 75 } }] })`;
        explanation = 'MongoDB Logical Operator ($or and $and) filtering top CSE students or students with low attendance';
        queryResult = await Student.find({
          $or: [
            { department: 'CSE', cgpa: { $gte: 8.0 } },
            { attendance: { $lt: 75 } }
          ]
        })
          .select('regNo firstName lastName department cgpa attendance')
          .limit(10);
        break;

      case 'FACET_ANALYTICS':
        executedQuery = `Student.aggregate([ { $facet: { ... } } ])`;
        explanation = 'MongoDB Multi-Faceted Aggregation Pipeline ($facet) computing multiple aggregations in a single stage';
        queryResult = await Student.aggregate([
          {
            $facet: {
              genderBreakdown: [
                { $group: { _id: '$gender', count: { $sum: 1 } } }
              ],
              feeStatusBreakdown: [
                { $group: { _id: '$feeStatus', count: { $sum: 1 } } }
              ],
              topGradePerformers: [
                { $sort: { cgpa: -1 } },
                { $limit: 3 },
                { $project: { regNo: 1, firstName: 1, lastName: 1, cgpa: 1 } }
              ]
            }
          }
        ]);
        break;

      default:
        return res.status(400).json({ success: false, message: 'Invalid queryType requested.' });
    }

    res.json({
      success: true,
      queryType,
      executedQuery,
      explanation,
      resultCount: Array.isArray(queryResult) ? queryResult.length : 1,
      results: queryResult
    });
  } catch (error) {
    console.error('Error in runQueryPlayground:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
