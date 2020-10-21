var shell = require("shelljs");

const currentPath = process.cwd();
const compound = `${currentPath}/compound-protocol`;
const scriptPath = `${compound}/script/scen/whitePaperModel.scen`;
const portNumber = process.env.COVERAGE ? "8546" : "8545";
const command = `rebuild=true PROVIDER="http://localhost:${portNumber}/" yarn --cwd ${compound} run repl -s ${scriptPath}`;
const log = shell.exec(command);
