import fs from 'fs';
import path from 'path';

const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
fs.copyFileSync(
  path.join(process.cwd(), 'src/assets/images/logo.png'),
  path.join(publicDir, 'logo.png')
);
console.log('Logo copied to public/logo.png successfully!');
