import tmrm = require('azure-pipelines-task-lib/mock-run');
import * as mockToolRunner from 'azure-pipelines-task-lib/mock-toolrunner';

import path = require('path');

const taskPath = path.join(__dirname, '../azdo-detect-secrets', 'index.js');
const tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);


//constants
const detectSecretsInstallFailed = "Detect Secrets Installation Failed.";

// *** Set Inputs for the Task ***

// Set the location for the mock source.  This does not really exist.
tmr.setInput('sourcelocation', '/home/vsts/src');
// Set the scan git files value to false
tmr.setInput('scannongitfiles', 'false');

// import the mock version of the task library
import tl = require('azure-pipelines-task-lib/mock-task');

// set the answers for the task functions for specific values
tmr.setAnswers({
    checkPath: {
        '/home/vsts/src': true,
        '/mocked/tools/detect-secrets': true,
        "/mocked/tools/wc": true,
        '/mocked/tools/pip3': true
    },
    which: {
        "pip3": "/mocked/tools/pip3",
        "detect-secrets": "/mocked/tools/detect-secrets",
        "wc": "/mocked/tools/wc",
        "git": "/mocked/tools/git"
    },
    // pipExec.code !=0 
    exec: {
        "/mocked/tools/pip3 install detect-secrets[word_list]": {
            "code": 1,
            "stdout": detectSecretsInstallFailed,
        },
        "/mocked/tools/detect-secrets scan --list-all-plugins | /mocked/tools/wc -l": {
            "code": 0,
            "stdout": "16"
        }
    }
});

// Set the answers for the ToolRunner Mock
mockToolRunner.setAnswers({
    exec: {
        "/mocked/tools/pip3 install detect-secrets[word_list]": {
            "code": 1,
            "stdout": detectSecretsInstallFailed
        }
    }
});

const tlClone = Object.assign({}, tl);

tmr.registerMock('azure-pipelines-task-lib/mock-task', tlClone);

tlClone.tool = (tool: string): mockToolRunner.ToolRunner => {
    return new mockToolRunner.ToolRunner(tool);

}

tmr.registerMock('azure-pipelines-task-lib/toolrunner', mockToolRunner);
tmr.run();