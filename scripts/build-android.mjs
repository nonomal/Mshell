#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const tasks = {
  debug: 'assembleDebug',
  release: 'assembleRelease',
  bundle: 'bundleRelease'
};

const mode = process.argv[2] || 'debug';
const gradleTask = tasks[mode];

if (!gradleTask) {
  console.error(`Unknown Android build mode: ${mode}`);
  console.error(`Available modes: ${Object.keys(tasks).join(', ')}`);
  process.exit(1);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const androidDir = path.join(rootDir, 'android');
const isWindows = process.platform === 'win32';
const gradleFile = isWindows ? 'gradlew.bat' : 'gradlew';
const gradleCommand = isWindows ? gradleFile : `./${gradleFile}`;
const gradlePath = path.join(androidDir, gradleFile);

if (!existsSync(gradlePath)) {
  console.error(`Android Gradle wrapper not found: ${gradlePath}`);
  process.exit(1);
}

function run(command, args, cwd = rootDir) {
  console.log(`\n> ${[command, ...args].join(' ')}`);

  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: isWindows
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run('npm', ['run', 'mobile:typecheck']);
run('npm', ['run', 'android:sync']);
run(gradleCommand, [gradleTask], androidDir);

console.log(`\nAndroid ${mode} build completed.`);
