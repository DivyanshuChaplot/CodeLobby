const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

function runCode(language, code, stdin = '', callback) {
  const fileId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  let filename = '';
  let exeName = '';
  let runFolder = '';

  // Centralized done wrapper to guarantee temporary files are unlinked
  const done = (err, result) => {
    if (filename && fs.existsSync(filename)) {
      try { fs.unlinkSync(filename); } catch (e) {}
    }
    if (exeName && fs.existsSync(exeName)) {
      try { fs.unlinkSync(exeName); } catch (e) {}
    }
    if (runFolder && fs.existsSync(runFolder)) {
      try { fs.rmSync(runFolder, { recursive: true, force: true }); } catch (e) {}
    }
    callback(err, result);
  };

  if (language === 'javascript') {
    filename = path.join(TEMP_DIR, `run_${fileId}.js`);
    fs.writeFile(filename, code, (err) => {
      if (err) return done(err);
      executeProcess('node', [filename], stdin, done);
    });
  } 
  else if (language === 'python') {
    filename = path.join(TEMP_DIR, `run_${fileId}.py`);
    fs.writeFile(filename, code, (err) => {
      if (err) return done(err);
      
      // Try 'python'
      executeProcess('python', [filename], stdin, (pyErr, pyResult) => {
        const isMissing = pyErr && pyErr.code === 'ENOENT' || pyResult && (pyResult.exitCode === 9009 || pyResult.stderr.includes('Python was not found'));
        
        if (isMissing) {
          // Try 'py' (Windows standard Python Launcher)
          executeProcess('py', [filename], stdin, (pyErr2, pyResult2) => {
            const isMissing2 = pyErr2 && pyErr2.code === 'ENOENT' || pyResult2 && (pyResult2.exitCode === 9009 || pyResult2.stderr.includes('Python was not found'));
            
            if (isMissing2) {
              // Try 'python3'
              executeProcess('python3', [filename], stdin, (pyErr3, pyResult3) => {
                const isMissing3 = pyErr3 && pyErr3.code === 'ENOENT' || pyResult3 && (pyResult3.exitCode === 9009 || pyResult3.stderr.includes('Python was not found'));
                
                if (isMissing3) {
                  done(null, {
                    stdout: '',
                    stderr: '[System Error: Python environment not found. Please install Python on your system and add it to your environment variables (PATH) to execute python code, or run Javascript/HTML modules.]',
                    exitCode: 127
                  });
                } else {
                  done(pyErr3, pyResult3);
                }
              });
            } else {
              done(pyErr2, pyResult2);
            }
          });
        } else {
          done(pyErr, pyResult);
        }
      });
    });
  } 
  else if (language === 'cpp') {
    filename = path.join(TEMP_DIR, `run_${fileId}.cpp`);
    exeName = path.join(TEMP_DIR, `run_${fileId}.exe`);
    
    fs.writeFile(filename, code, (err) => {
      if (err) return done(err);
      
      exec(`g++ -O3 "${filename}" -o "${exeName}"`, (compErr, stdout, stderr) => {
        if (compErr) {
          const isMissing = compErr.code === 127 || compErr.message.includes('not found') || compErr.message.includes('not recognized');
          const errMsg = isMissing 
            ? '[System Error: g++ (C++ Compiler) was not found on your system PATH. Please install MinGW/GCC and add it to your environment variables to execute C++ code.]'
            : `[Compilation Error]\n${stderr || compErr.message}`;

          return done(null, {
            stdout: '',
            stderr: errMsg,
            exitCode: 1
          });
        }
        
        executeProcess(exeName, [], stdin, done);
      });
    });
  } 
  else if (language === 'c') {
    filename = path.join(TEMP_DIR, `run_${fileId}.c`);
    exeName = path.join(TEMP_DIR, `run_${fileId}.exe`);
    
    fs.writeFile(filename, code, (err) => {
      if (err) return done(err);
      
      exec(`gcc "${filename}" -o "${exeName}"`, (compErr, stdout, stderr) => {
        if (compErr) {
          const isMissing = compErr.code === 127 || compErr.message.includes('not found') || compErr.message.includes('not recognized');
          const errMsg = isMissing 
            ? '[System Error: gcc (C Compiler) was not found on your system PATH. Please install MinGW/GCC and add it to your environment variables to execute C code.]'
            : `[Compilation Error]\n${stderr || compErr.message}`;

          return done(null, {
            stdout: '',
            stderr: errMsg,
            exitCode: 1
          });
        }
        
        executeProcess(exeName, [], stdin, done);
      });
    });
  } 
  else if (language === 'java') {
    runFolder = path.join(TEMP_DIR, `run_${fileId}`);
    fs.mkdirSync(runFolder, { recursive: true });
    filename = path.join(runFolder, 'Main.java');
    
    fs.writeFile(filename, code, (err) => {
      if (err) return done(err);
      
      exec(`javac "${filename}"`, (compErr, stdout, stderr) => {
        if (compErr) {
          const isMissing = compErr.code === 127 || compErr.message.includes('not found') || compErr.message.includes('not recognized');
          const errMsg = isMissing 
            ? '[System Error: javac (Java Compiler) was not found on your system PATH. Please install the Java Development Kit (JDK) and configure JAVA_HOME to execute Java code.]'
            : `[Compilation Error]\n${stderr || compErr.message}`;

          return done(null, {
            stdout: '',
            stderr: errMsg,
            exitCode: 1
          });
        }
        
        executeProcess('java', ['-cp', runFolder, 'Main'], stdin, done);
      });
    });
  } 
  else {
    return callback(new Error(`Unsupported environment language: ${language}`));
  }
}

function executeProcess(cmd, args, stdin, callback) {
  let stdout = '';
  let stderr = '';
  const child = spawn(cmd, args);

  const timeout = setTimeout(() => {
    if (process.platform === 'win32') {
      exec(`taskkill /pid ${child.pid} /T /F`, () => {});
    } else {
      child.kill('SIGKILL');
    }
    stderr += '\n[Execution Timeout: Terminated after 5 seconds]';
  }, 5000);

  if (stdin) {
    child.stdin.write(stdin);
    child.stdin.end();
  }

  child.stdout.on('data', (data) => {
    stdout += data.toString();
  });

  child.stderr.on('data', (data) => {
    stderr += data.toString();
  });

  child.on('close', (codeStatus) => {
    clearTimeout(timeout);
    callback(null, {
      stdout: stdout || '',
      stderr: stderr || '',
      exitCode: codeStatus
    });
  });

  child.on('error', (spawnErr) => {
    clearTimeout(timeout);
    
    if (spawnErr.code === 'ENOENT') {
      callback(null, {
        stdout: '',
        stderr: `[System Error: Environment compiler/runner for "${cmd}" not configured or installed on this server path.]`,
        exitCode: 127
      });
    } else {
      callback(spawnErr);
    }
  });
}

module.exports = { runCode };
