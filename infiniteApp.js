const { spawn } = require('child_process');

function startProcess() {
  let process = spawn('node', ['app.js']);

  process.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });

  process.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });

  process.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
    console.log('Restarting process...');
    startProcess();

  });
}

startProcess();
