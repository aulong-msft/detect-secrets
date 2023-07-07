require('dotenv-json')({path: "./dev-config/.env.json"});
let fs = require('fs');
const path = require('path');

//get the files we need to update into handlers
const manifest = './vss-extension-dev.json';
let package=require('../azdo-detect-secrets/package.json');
let task=require('../azdo-detect-secrets/task.json');

//grab the env-vars from the backup
const version = process.env.ORIGINAL_EXT_VERSION;
const task_id = process.env.ORIGINAL_TASK_ID;
const task_name = process.env.ORIGINAL_TASK_NAME;
const task_author = process.env.ORIGINAL_TASK_AUTHOR;
const task_friendly_name = process.ORIGINAL_TASK_FRIENDLY_NAME;

//if the dev manifest exists -> clean up and restore files for PR.
fs.access(manifest, fs.F_OK, (err) => {
    if(err){
        console.log('Nothing to cleanup!');
        return;
    }
    
    console.log("Cleaning up development resources...")
    restorePackageDotJson();
    restoreTaskDotJson();
    removeVssDevFile();
    removeVsixFiles();

    console.log("Completed cleanup of development resources...")
});


function restorePackageDotJson() {
    console.log("Restoring package.json version...")
    package.version=version;
    fs.writeFileSync('./azdo-detect-secrets/package.json', JSON.stringify(package,null,2));
}

function restoreTaskDotJson() {
    console.log("Restoring task.json version details...")
    let versionParts = version.split('.');
    task.id = task_id;
    task.name = task_name;
    task.author = task_author;
    task.friendlyName = task_friendly_name;
    task.version = {
        "Major": versionParts[0],
        "Minor": versionParts[1],
        "Patch": versionParts[2]
    }

    fs.writeFileSync('./azdo-detect-secrets/task.json', JSON.stringify(task,null,2));
}

function removeVssDevFile() {
    console.log("Removing the vss dev file...")
    fs.unlinkSync(manifest, (err) => {
        if(err) {
            console.log("Failed to delete the development manfest!");
            return;
        }
    });
}

//remove the vsix files created during development work -> not needed outside of test deployments
function removeVsixFiles() {
    console.log("Deleting any VSIX files that have been created...")
    //first we find the files
    let targetFiles = fs.readdirSync('./', { withFileTypes: true})
        .filter(entry => {
            if(!entry.isFile()) {return false; }
            return path.extname(entry.name) == '.vsix';
        }).map(entry => entry.name);
    //then we remove the files
    if(targetFiles.length != 0) {
        for (let target of targetFiles) {
            let file = "./" + target;
            try {
                fs.unlinkSync(file);
                console.log("DELETED: " + file);
            } catch (err) {
                console.log("Unable to delete the vsix files!\nThese are not tracked and can be manually deleted later from the directory.");
            }
        }
    }
}


