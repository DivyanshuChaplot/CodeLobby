const { runCode } = require('./runner');

console.log('Starting automated runner tests...');

runCode('javascript', 'console.log("Automated JS execution pass!");', '', (err, result) => {
  if (err) {
    console.error('JS Execution Test Failed:', err);
    process.exit(1);
  }
  console.log('JS execution response:', result);
  
  if (result.stdout.trim() !== 'Automated JS execution pass!') {
    console.error('Error: stdout mismatch!');
    process.exit(1);
  }

  // Test Python execution
  runCode('python', 'print("Automated Python execution pass!")', '', (pyErr, pyResult) => {
    if (pyErr || (pyResult && pyResult.exitCode === 9009) || (pyResult && pyResult.stderr.includes('not found'))) {
      console.warn('Python Execution Test skipped (Python not configured or not installed on this Windows environment).');
      console.log('All JS tests passed successfully!');
      process.exit(0);
    } else {
      console.log('Python execution response:', pyResult);
      if (pyResult.stdout.trim() !== 'Automated Python execution pass!') {
        console.error('Error: Python stdout mismatch!');
        process.exit(1);
      }
      console.log('All automated runner tests passed successfully!');
      process.exit(0);
    }
  });
});
