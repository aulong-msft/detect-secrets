const dotenvJson = require('dotenv-json')({path: "./dev-config/.env.json"});
let fs = require('fs');

//get the files we need to update into handlers
let package=require('../azdo-detect-secrets/package.json');
let manifest=require('../vss-extension.json');
let task=require('../azdo-detect-secrets/task.json');
let environment=require('../dev-config/.env.json');

//grab the env-vars created from the .env.json file
const version = process.env.EXTENSION_VERSION;
const name = process.env.EXTENSION_NAME;
const id = process.env.EXTENSION_ID;
const publisher = process.env.EXTENSION_PUBLISHER;

fs.access('./vss-extension-dev.json', fs.F_OK, (err) => {
    if(err){
        prepareForDev();
        return;
    }
    console.log('Development files already exists.');
});

function prepareForDev(){
    console.log("Creating developer files for extension...");
    backupOriginalConfig();
    copyAndUpdateManifest();
    rewritePackage();
    rewriteTask();

    console.log("Completed generation of developer configuration.")
}

function backupOriginalConfig(){
    console.log("Backing up the details from package.json and task.json...")
    
    environment.ORIGINAL_EXT_VERSION = package.version;
    environment.ORIGINAL_TASK_ID = task.id;
    environment.ORIGINAL_TASK_NAME = task.name;
    environment.ORIGINAL_TASK_AUTHOR = task.author;
    environment.ORIGINAL_TASK_FRIENDLY_NAME = task.friendlyName;

    fs.writeFileSync('./dev-config/.env.json', JSON.stringify(environment,null,2));
}

function rewritePackage() {
    console.log("Rewriting the package.json file...")
    package.version=version;
    fs.writeFileSync('./azdo-detect-secrets/package.json', JSON.stringify(package,null,2));
}

function copyAndUpdateManifest() {
    console.log("Creating a dev version of the extension manifest file...")
    manifest.version=version;
    manifest.name=name;
    manifest.publisher=publisher;
    manifest.id=name;
    fs.writeFileSync('./vss-extension-dev.json', JSON.stringify(manifest,null,2));
}

function rewriteTask() {
    console.log("Rewriting the task.json file...")
    let versionParts = version.split('.');
    task.version={
        "Major": versionParts[0],
        "Minor": versionParts[1],
        "Patch": versionParts[2]
    };
    task.id=id;
    task.name=name;
    task.author=publisher;
    task.friendlyName=name;
    fs.writeFileSync('./azdo-detect-secrets/task.json', JSON.stringify(task,null,2));
}