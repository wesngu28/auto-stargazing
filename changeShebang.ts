import { readFileSync, writeFileSync } from 'fs';

const built = readFileSync('bin/stargazing.js')
const replacedShebang = String(built).replace('#!/usr/bin/env npx ts-node', '#!/usr/bin/env node')

writeFileSync("bin/stargazing.js", replacedShebang);