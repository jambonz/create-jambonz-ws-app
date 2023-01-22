#!/usr/bin/env node

const nunjucks = require('nunjucks');
const { program } = require('commander');
const {spawn} = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const scenarios = [
  'hello-world',
  'echo',
  'chat-gpt3',
  'all'
];
const baseFiles = [
  'package.json',
  'app.js',
  'index.js',
  '.eslintrc.json',
  '.eslintignore',
  '.gitignore',
  'README.md'
];
const pluginFiles = {
  'hello-world': ['hello-world.js'],
  echo: ['echo.js'],
  'chat-gpt3': ['chat-gpt3.js']
};

const pkg = require(`${__dirname}/../package.json`);
program.version(pkg.version, '-v, --version', 'display the current version');
program
  .name('create-jambonz-ws-app')
  .usage('[options] project-name')
  .addHelpText('after', `

Scenarios available: 
- hello-world: a simple app that responds to an incoming call using text-to-speech
- echo: an collect-and-response app that echos caller voice input
- chat-gpt3: a voicebot that interacts with openai's gpt-3 api (requires an openai api key)
- all: generate all of the above scenarios

Example:
  $ npx create-jambonz-ws-app --scenario "hello-world, echo" my-app`)
  .option('-s, --scenario <scenario>',
    'generates a sample websocket app for jambonz', 'hello-world');

program.parse();
const opts = program.opts();
opts.scenario = (opts.scenario.split(',').map((s) => s.trim()) || []).map((r) => r.toLowerCase());
const extra = opts.scenario.filter((r) => !scenarios.includes(r));
const folder = extra.length ? extra[0] : (program.args.length ? program.args[0] : null);
const includeAll = opts.scenario.includes('all');
if (!folder) program.help();

const cwd = process.cwd();
const target = `${cwd}/${folder}`;

/* don't overwrite */
if (fs.existsSync(target)) {
  console.log(`folder ${folder} exists; please specify a new folder to create`);
  process.exit(0);
}

console.log();
console.log(`Creating a new jambonz websocket app in ${chalk.green(target)}`);
console.log();

fs.mkdirSync(folder);
process.chdir(folder);

const appName = folder;

nunjucks.configure(`${__dirname}/../templates`, {
  lstripBlocks: true,
  trimBlocks: true
});

const shouldRender = (template) => {
  if (baseFiles.includes(template)) return true;
  const baseName = path.basename(template);
  for (const prop in pluginFiles) {
    if ((opts.scenario.includes(prop) || includeAll) &&
      pluginFiles[prop].includes(baseName)) return true;
  }
  return false;
};

const renderFolder = (folder, target) => {
  const entries = fs.readdirSync(folder, {withFileTypes: true});
  for (const entry of entries) {
    //console.log(`rendering ${entry.name}`);
    if (entry.isFile()) {
      if (shouldRender(entry.name)) {
        fs.writeFileSync(`${target}/${entry.name}`, nunjucks.render(`${folder}/${entry.name}`, {
          appName,
          tts: opts.scenario.includes('hello-world') || includeAll,
          echo: opts.scenario.includes('echo') || includeAll,
          chatgpt3: opts.scenario.includes('chat-gpt3') || includeAll
        }));
      }
    }
    else if (entry.isDirectory()) {
      fs.mkdirSync(`${target}/${entry.name}`);
      renderFolder(`${folder}/${entry.name}`, `${target}/${entry.name}`);
    }
  }
};

const spawnCommand = (cmd, args) => {
  return new Promise((resolve, reject) => {
    const child_process = spawn(cmd, args, {stdio: ['inherit', 'pipe', 'pipe']});

    child_process.on('exit', (code, signal) => {
      if (code === 0) {
        return resolve();
      }
      reject(code);
    });
    child_process.on('error', (error) => {
      console.log(`error spawning child process for docker: ${args}`);
    });

    child_process.stdout.on('data', (data) => {
      //console.log(data.toString());
    });
    child_process.stderr.on('data', (data) => {
      //console.log(data.toString());
    });
  });

};

(async() => {
  renderFolder(`${__dirname}/../templates`, process.cwd());
  const packages = ['@jambonz/node-client-ws', 'pino'];
  const devPackages = ['eslint-plugin-promise', 'eslint'];
  if (opts.scenario.includes('chat-gpt3') || includeAll) {
    Array.prototype.push.apply(packages, ['bent']);
  }

  console.log('Installing packages...');
  await spawnCommand('npm',
    ['install', '--loglevel=error', '--save']
      .concat(packages));
  await spawnCommand('npm',
    ['install', '--loglevel=error', '--save-dev']
      .concat(devPackages));
})();
