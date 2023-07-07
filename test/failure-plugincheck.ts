import tmrm = require('azure-pipelines-task-lib/mock-run');
import * as mockToolRunner from 'azure-pipelines-task-lib/mock-toolrunner';
import path = require('path');


const taskPath = path.join(__dirname, '../azdo-detect-secrets', 'index.js');
const tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);


// *** Set Inputs for the Task ***
// set the source location.  this location does not really exist.
tmr.setInput('sourcelocation', '/home/vsts/src');
// set scan non git files to false
tmr.setInput('scannongitfiles', 'false');
// import mock version of the task lib
import tl = require('azure-pipelines-task-lib/mock-task');

// set mock answers for the task lib methods/functions
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
        exec: {
            "/mocked/tools/pip3 install detect-secrets[word_list]": {
                "code": 0,
                "stdout": "Detect Secrets ",
            },
            "/mocked/tools/detect-secrets scan --list-all-plugins | /mocked/tools/wc -l": {
                "code": 1,
                "stdout": "0",
                "stderr": "Plugins Failed."
            }
        }
});

// set mock answers for toolrunner
mockToolRunner.setAnswers({
        exec: {
            "/mocked/tools/pip3 install detect-secrets[word_list]": {
                "code": 0,
                "stdout": "Detect Secrets Installation Success."
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
