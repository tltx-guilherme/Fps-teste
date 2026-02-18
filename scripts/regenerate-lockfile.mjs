import { execSync } from 'child_process';

try {
  console.log('Running npm install to regenerate package-lock.json...');
  const output = execSync('cd /vercel/share/v0-project && npm install', {
    encoding: 'utf-8',
    timeout: 120000,
  });
  console.log(output);
  console.log('Successfully regenerated package-lock.json');
} catch (error) {
  console.error('Error:', error.message);
  if (error.stdout) console.log('stdout:', error.stdout);
  if (error.stderr) console.log('stderr:', error.stderr);
}
