// Quick test to verify the Report model accepts listItem
const mongoose = require('mongoose');

async function testReportModel() {
  try {
    // Connect to MongoDB (using the same connection string from your .env)
    await mongoose.connect('mongodb+srv://shipitsv0:shipitsv0@shipitsv0.qwh6arp.mongodb.net/shipits-forum?retryWrites=true&w=majority&appName=ShipItsV0');

    // Import the Report model
    const Report = require('./shipits/server/models/Report.ts').Report;

    // Try to create a report with listItem targetType
    const testReport = new Report({
      reporterId: new mongoose.Types.ObjectId(),
      targetType: 'listItem',
      targetId: new mongoose.Types.ObjectId(),
      reason: 'spam',
      details: 'Test report for list item'
    });

    // Validate the model
    await testReport.validate();
    console.log('✅ SUCCESS: Report model accepts listItem targetType');

    // Close connection
    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

testReportModel();
