import tl = require('azure-pipelines-task-lib/task');
import { ToolRunner, IExecOptions } from 'azure-pipelines-task-lib/toolrunner';

import fs = require('fs');
import crypto = require('crypto');
import { TestCreator } from "./testformatter";
import os = require('os');

const cStrDetectSecrets = 'detect-secrets';

export class Scanner {
    private ScanStarted: Date = new Date();
    private ScanFinished: Date = new Date();

    // --------------------------------------------------
    // :            Methods                             :
    // --------------------------------------------------

    //Method to take JSON string and return a hash of that object 
    hashJson(jsonPayload: string): string {
        //parse out the json 
        const parsedJson = JSON.parse(jsonPayload);
        //stringigy and remove changing date and github info from the object
        const stringifyJson = JSON.stringify(parsedJson, (key, value) => {
            // if matched return value "undefined"
            if (key == "generated_at" || key == ".git/FETCH_HEAD") {
                return undefined;
            }
            // otherwise, return the value itself
            return value;
            // Calculate a rolling hash.
        });

        //crypto functions to generate SHA256 hash
        const hash = crypto.createHash('sha256');
        hash.update(stringifyJson);
        return hash.digest('hex');
    }

    //Method to install the pre-reqs
    installPrerequisites(): number {
        const pipCmd = tl.tool(tl.which('pip3', true));
        pipCmd.arg(['install', 'detect-secrets[word_list]']);
        const pipExec = pipCmd.execSync();
        return pipExec.code;
    }

    //Method to generate the detect secrets build command
    buildCommand(location: string, wordListFile: string, usingWordlistFile: boolean,
        usingBaselineFile: boolean, baselineFile: string, scanNonGitFiles: boolean, excludeFiles: string): [ToolRunner, string] {
        const addrCmd = tl.tool(tl.which(cStrDetectSecrets, true));

        addrCmd.arg(['-C', location]);
        addrCmd.arg('scan');

        // using a wordlist
        if (usingWordlistFile && wordListFile && fs.existsSync(wordListFile)) {
            // word-list filesize check

            const fileInfo = fs.statSync(wordListFile);

            if (0 === fileInfo.size) {
                tl.warning('The provided word-list file is empty! Running without word-list!');
            }
            else {
                addrCmd.arg(['--word-list', wordListFile]);
                tl.debug('Word List file added: ' + wordListFile);
            }
        }
        // scan nonGit files
        if (scanNonGitFiles) {
            addrCmd.arg('--all-files');
        }
        //exclude file functionality
        if (excludeFiles) {

            //create an array of strings delimited by commas
            let i = '';
            const exFile = excludeFiles.split(',');

            //the truth is out there
            for (i in exFile) {
                //each file path needs its own exclude file tag without leading or trailing spaces
                addrCmd.arg(['--exclude-files', exFile[i].trim()]);
            }

        }
        var originalBaseline = ''; // eslint-disable-line no-var
        // baseline scenario
        if (usingBaselineFile && baselineFile && fs.existsSync(baselineFile)) {
            const fileInfo = fs.statSync(baselineFile);
            if (0 === fileInfo.size) {
                tl.warning('The provided baseline file is empty! Running without baseline functionality!');
            }
            else {
                //save off the original baseline file to test the file length later
                const inputBaseline = fs.readFileSync(baselineFile, { encoding: 'utf8', flag: 'r' });
                originalBaseline = this.hashJson(inputBaseline);
                addrCmd.arg(['--baseline', baselineFile]);
            }
        }
        return [addrCmd, originalBaseline];
    }

    //Method to check if the plugins are present
    async checkPlugins(): Promise<void> {
        const detectSecretsPath: string = tl.which('detect-secrets', true);
        const detectSecrets: ToolRunner = tl.tool(detectSecretsPath);
        detectSecrets.arg(['scan', '--list-all-plugins']);

        const wcPath: string = tl.which('wc', true);
        const wc: ToolRunner = tl.tool(wcPath);
        wc.arg('-l');
        detectSecrets.on('stdout', (data) => {
            const output = data.toString().trim();
            tl.debug('' + output + ' plugins detected!!');
            const result = parseInt(output);
            if (result == 0) {
                tl.error('The detect-secrets plugins are not present.');
                tl.setResult(tl.TaskResult.Failed, 'Plugins not present.', true);
            }
        });

        const pipe = detectSecrets.pipeExecOutputToTool(wc);
        await pipe.exec({ failOnStdErr: true } as IExecOptions);
    }

    //Method to generate reporting
    generateReporting(jsonStr: string, location: string, scanNonGitFiles: boolean): TestCreator {
        const json = JSON.parse(jsonStr);
        //if the json string value is NULL then die here
        if (!jsonStr) {
            tl.setResult(tl.TaskResult.Failed, "JSON string was NULL");
            return;
        }

        // --------------------------------------------------
        // :             GENERATE XML REPORT                :
        // --------------------------------------------------

        const tc = new TestCreator("Detect-Secrets");
        tc.root.startTime = this.ScanStarted;
        tc.root.endTime = this.ScanFinished;

        let passingFiles: Array<string>;

        // get tracked files
        let gitCmd = tl.tool(tl.which('git', true));
        tl.cd(location);
        gitCmd.arg(['ls-files']);
        passingFiles = gitCmd.execSync().stdout.split(os.EOL);

        if (scanNonGitFiles) {
            // append untracked files
            gitCmd = tl.tool(tl.which('git', true));
            tl.cd(location);
            gitCmd.arg(['ls-files', '--exclude-standard', '--others']);
            const untrackedFiles = gitCmd.execSync().stdout.split(os.EOL);
            passingFiles = passingFiles.concat(untrackedFiles);
        }

        passingFiles = passingFiles.filter(pf => pf !== '');
        const results = json.results;

        Object.keys(results).forEach(function (v) {
            const thisFile = results[v];
            const fileName = v;
            thisFile.forEach(item => {
                tc.AddGroupedFailResult(
                    item.type, // group
                    item.type + " - " + fileName + ":" + item.line_number,  // name
                    "Detected a secret in file " + fileName + ":" + item.line_number, // short msg
                    "A secret was detected in a file:\n" +
                    "Filename: " + fileName + ":" + item.line_number + "\n" +
                    "Type: " + item.type + "\n" +
                    "Secret Hash: " + item.hashed_secret, // long msg
                    "CRITICAL"); // type
            });
        });

        // add success counts per-category based on file list
        tc.root.children.forEach(c => {
            c.baseRunCount = passingFiles.length - c.children.length;
        });

        const xml = tc.EmitXml();

        fs.writeFileSync(location + "/report.xml", xml);
        fs.writeFileSync(location + "/.secrets.baseline", jsonStr);
        tl.uploadArtifact(cStrDetectSecrets, location + "/report.xml", "Secrets Report");
        tl.uploadArtifact(cStrDetectSecrets, location + "/.secrets.baseline", "Secrets Report");

        return tc;
    }

    public async run(): Promise<void> {
        try {
            // --------------------------------------------------
            // :             INSTALL PREREQUISITES              :
            // --------------------------------------------------

            if (0 != this.installPrerequisites()) {
                tl.setResult(tl.TaskResult.Failed, 'Failed to install Detect Secrets.', true);
                return;
            }

            // --------------------------------------------------
            // :                 PARSE OPTIONS                  :
            // --------------------------------------------------

            // base command ("detect-secrets scan")
            const location: string = tl.getInput("sourceLocation", true);
            const scanNonGitFiles: boolean = tl.getBoolInput("scanNonGitFiles", false);
            const wordListFile: string = tl.getInput("wordListFile", false);
            const baselineFile: string = tl.getInput("baselineFile", false);
            const usingWordlistFile: boolean = tl.getBoolInput("usingWordlistFile", false);
            let usingBaselineFile: boolean = tl.getBoolInput("usingBaselineFile", false);
            const setFailureasWarning: boolean = tl.getBoolInput("setFailureasWarning", false);
            const excludeFiles: string = tl.getInput("excludeFiles", false);

            // Checks whether the provided input path exists. If the path does not exist, it will throw.
            tl.checkPath(location, "Path Location");

            // --------------------------------------------------
            // :                 BUILD COMMAND                  :
            // --------------------------------------------------+

            const [addrCmd, originalBaseline] =
                this.buildCommand(location, wordListFile, usingWordlistFile, usingBaselineFile,
                    baselineFile, scanNonGitFiles, excludeFiles);

            // if originalBaseline is empty, it means we aren't using the baseline functionality
            usingBaselineFile = !!originalBaseline;
            // --------------------------------------------------
            // :                    Check Plugins               :
            // --------------------------------------------------

            this.checkPlugins();

            // --------------------------------------------------
            // :                    EXECUTE                     :
            // --------------------------------------------------

            this.ScanStarted = new Date();
            var jsonStr = addrCmd.execSync().stdout; // eslint-disable-line no-var

            //if using a baseline file make the output of jsonStr value the new baseline output
            if (usingBaselineFile) {
                jsonStr = fs.readFileSync(baselineFile, { encoding: 'utf8', flag: 'r' });
                var newlyGeneratedBaseline = this.hashJson(jsonStr); // eslint-disable-line no-var

                //output the baseline input to the screen
                tl.debug(jsonStr);
            }
            tl.debug("detect-secrets tool execution completed successfully");
            this.ScanFinished = new Date();

            // --------------------------------------------------
            // :               GENERATE REPORT                  :
            // --------------------------------------------------

            const tc = this.generateReporting(jsonStr, location, scanNonGitFiles);

            //if using a baseline file only output if the baseline file contents have changed
            if (usingBaselineFile) {
                if (tc.root.failed > 0 && originalBaseline != newlyGeneratedBaseline) {
                    tl.setResult(tl.TaskResult.SucceededWithIssues,
                        "The baseline file has changed! and contains " + tc.root.failed +
                        " secrets. Please update your .secrets.baseline file");
                }
                else {
                    tl.setResult(tl.TaskResult.Succeeded, "The baseline file has NOT changed.");
                }
            }
            //otherwise use the logic of the number of secrets found
            else {
                if (tc.root.failed > 0 && setFailureasWarning) {
                    tl.setResult(tl.TaskResult.SucceededWithIssues,
                        "Quality Gate Warning: The repository contains " + tc.root.failed + " secrets.");
                }
                else if (tc.root.failed > 0 && !setFailureasWarning) {
                    tl.setResult(tl.TaskResult.Failed, "Quality Gate Failure: The repository contains " +
                        tc.root.failed + " secrets.");
                }
                else {
                    tl.setResult(tl.TaskResult.Succeeded,
                        "Quality Gate Success: The repository contains no unexpected secrets.");
                }
            }
        }
        catch (err) {
            tl.setResult(tl.TaskResult.Failed, "Scan Tool Error! " + err.message);
        }
    }
}
new Scanner().run();
