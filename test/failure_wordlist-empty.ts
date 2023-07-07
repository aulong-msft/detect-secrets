import tmrm = require('azure-pipelines-task-lib/mock-run');
import * as mockToolRunner from 'azure-pipelines-task-lib/mock-toolrunner';
import * as mockery from 'mockery';
import fs = require("fs");

import path = require('path');

const taskPath = path.join(__dirname, '../azdo-detect-secrets', 'index.js');
const tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);
const srcPath = '/home/vsts/src';

// set inputs for task
// source location: not real. just a mock value
tmr.setInput('sourcelocation', srcPath); /*eslint-disable sonarjs/no-duplicate-string*/
tmr.setInput('usingwordListFile', 'true');
// set scan non git files to false
tmr.setInput('scannongitfiles', 'false');
tmr.setInput('wordListFile', '/home/vsts/src/mywordList.txt');
// import mock task lib 
import tl = require('azure-pipelines-task-lib/mock-task');


// set mock answers for task lib
tmr.setAnswers({
  checkPath: {
   '/home/vsts/src': true,
    '/mocked/tools/detect-secrets': true,
    "/mocked/tools/wc": true,
    '/mocked/tools/pip3': true,
    '/mocked/tools/git': true
  },
  which: {
    "pip3": "/mocked/tools/pip3",
    "detect-secrets": "/mocked/tools/detect-secrets",
    "wc": "/mocked/tools/wc",
    "git": "/mocked/tools/git"
  },
  exec: {
    "/mocked/tools/detect-secrets scan --list-all-plugins | /mocked/tools/wc -l": {
      "code": 0,
      "stdout": "16",
    },
    '/mocked/tools/git ls-files': {
      "code": 0,
      "stdout": "file1.txt",
    },
    "/mocked/tools/pip3 install detect-secrets[word_list]": {
      "code": 0,
      "stdout": "Detect Secrets Installation Success.",
    },
    "/mocked/tools/detect-secrets -C /home/vsts/src scan": {
      "code": 0,
      "stdout": `{
                "version": "1.1.0",
                "plugins_used": [
                  {
                    "name": "ArtifactoryDetector"
                  },
                  {
                    "name": "AWSKeyDetector"
                  },
                  {
                    "name": "AzureStorageKeyDetector"
                  },
                  {
                    "name": "Base64HighEntropyString",
                    "limit": 4.5
                  },
                  {
                    "name": "BasicAuthDetector"
                  },
                  {
                    "name": "CloudantDetector"
                  },
                  {
                    "name": "HexHighEntropyString",
                    "limit": 3.0
                  },
                  {
                    "name": "IbmCloudIamDetector"
                  },
                  {
                    "name": "IbmCosHmacDetector"
                  },
                  {
                    "name": "JwtTokenDetector"
                  },
                  {
                    "name": "KeywordDetector",
                    "keyword_exclude": ""
                  },
                  {
                    "name": "MailchimpDetector"
                  },
                  {
                    "name": "NpmDetector"
                  },
                  {
                    "name": "PrivateKeyDetector"
                  },
                  {
                    "name": "SlackDetector"
                  },
                  {
                    "name": "SoftlayerDetector"
                  },
                  {
                    "name": "SquareOAuthDetector"
                  },
                  {
                    "name": "StripeDetector"
                  },
                  {
                    "name": "TwilioKeyDetector"
                  }
                ],
                "filters_used": [
                  {
                    "path": "detect_secrets.filters.allowlist.is_line_allowlisted"
                  },
                  {
                    "path": "detect_secrets.filters.common.is_ignored_due_to_verification_policies",
                    "min_level": 2
                  },
                  {
                    "path": "detect_secrets.filters.heuristic.is_indirect_reference"
                  },
                  {
                    "path": "detect_secrets.filters.heuristic.is_likely_id_string"
                  },
                  {
                    "path": "detect_secrets.filters.heuristic.is_lock_file"
                  },
                  {
                    "path": "detect_secrets.filters.heuristic.is_not_alphanumeric_string"
                  },
                  {
                    "path": "detect_secrets.filters.heuristic.is_potential_uuid"
                  },
                  {
                    "path": "detect_secrets.filters.heuristic.is_prefixed_with_dollar_sign"
                  },
                  {
                    "path": "detect_secrets.filters.heuristic.is_sequential_string"
                  },
                  {
                    "path": "detect_secrets.filters.heuristic.is_swagger_file"
                  },
                  {
                    "path": "detect_secrets.filters.heuristic.is_templated_secret"
                  }
                ],
                "results": {},
                "generated_at": "2021-12-02T20:17:19Z"
              }
              `
    }
  }
});

// set answers for tool runner
mockToolRunner.setAnswers({
  exec: {
    "/mocked/tools/pip3 install detect-secrets[word_list]": {
      "code": 0,
      "stdout": "Detect Secrets Installation Success."
    },
    "/mocked/tools/detect-secrets scan --list-all-plugins | /mocked/tools/wc -l": {
      "code": 0,
      "stdout": "16"
    }
  }
});

const tlClone = Object.assign({}, tl);

tmr.registerMock('azure-pipelines-task-lib/mock-task', tlClone);


tlClone.tool = (tool: string): mockToolRunner.ToolRunner => {
  return new mockToolRunner.ToolRunner(tool);
}

// Register Mocks
tmr.registerMock('azure-pipelines-task-lib/toolrunner', mockToolRunner);

// Register additional mocks for node/js functions via mockery
mockery.registerMock('fs', {
  statSync: () =>
  <fs.Stats>{ "dev": 2, "size": 0 },
  writeFileSync: () => 0,
  readFileSync: () => `{
    "id": "297abefd-2bb4-4777-94f1-9e6e1a533ff6",
    "name": "CSEDetectSecrets",
    "description": "Utilize Yelp's Detect-Secrets tool within Azure DevOps",
    "helpMarkDown": "",
    "category": "Utility",
    "author": "CSE Security Solution Area",
    "version": {
      "Major": "1",
      "Minor": "2",
      "Patch": "1"
    },
    "instanceNameFormat": "CSE Detect-Secrets Scanner",
    "inputs": [
      {
        "name": "sourceLocation",
        "type": "string",
        "label": "Source Code Location",
        "helpMarkDown": "Location of source code to scan for secrets",
        "defaultValue": "$(Build.Repository.LocalPath)",
        "required": true
      },
      {
        "name": "scanNonGitFiles",
        "type": "boolean",
        "label": "Scan files which are not tracked by Git",
        "helpMarkDown": "Even if files are untracked, they are scanned for secrets",
        "defaultValue": true,
        "required": false
      },
      {
        "name": "usingwordListFile",
        "type": "boolean",
        "label": "Use a word-list file?",
        "helpMarkDown": "Use a word-list file, which allows the scanner to be aware of previously-identified secrets and ignore them",
        "defaultValue": false,
        "required": false
      },
      {
        "name": "wordListFile",
        "type": "string",
        "label": "Use a word List File?",
        "helpMarkDown": "Location of a word-list file to compare against, stored in the scanned code base",
        "defaultValue": "",
        "required": false,
        "visibleRule": "usingwordListFile = true"
      },
      {
        "name": "usingBaselineFile",
        "type": "boolean",
        "label": "Use a .secrets.baseline file?",
        "helpMarkDown": "Use a secrets.baseline file, which allows the scanner to be aware of previously-identified secrets and ignore them",
        "defaultValue": false,
        "required": false
      },
      {
        "name": "baselineFile",
        "type": "string",
        "label": "Location of secrets.baseline file in repository",
        "helpMarkDown": "Location of a secrets.baseline file to compare against, stored in the scanned code base",
        "defaultValue": "",
        "required": false,
        "visibleRule": "usingBaselineFile = true"
      }
    ],
    "execution": {
      "Node10": {
        "target": "index.js"
      }
    }
  }
  `,
  existsSync: () => true,
});
tmr.run();