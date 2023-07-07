# BETA Credential Scanning extension for Azure DevOps

[detect-secrets](https://github.com/Yelp/detect-secrets) is a popular free and open source security tool to help identify secrets during the development process. This extension scans the code base for secrets by using sophisticated algorothms utilizing Shannon entropy, and reports the findings into the Azure DevOps Pipeline model to enable quick feedback and response from development teams throughout the development life-cycle.

## Usage

### Configuration
**Below contains the nominal YAML configuration for this tool - utilizing the wordlist functionality.**
- Add the Detect-Secrets plugin from the task assistant without changing the default settings. e.g., Source Code Location = $(Build.Repository.LocalPath) and the box checked named "Scan files which are not tracked by Git".
```
    -   ```YAML
        - task: CSEDetectSecrets@1
          inputs:
            sourceLocation: '$(Build.Repository.LocalPath)'
            setFailureasWarning: false
            usingwordListFile: true
            wordListFile: 'your_allow-list_filename.txt'

- To report on the detect-secrets scan results add the following underneath the Yelp task:
    -   ```YAML
        - task: PublishTestResults@2
          displayName: 'Publish Test Results'
          inputs:
              testResultsFormat: 'JUnit'
              testResultsFiles: 'report.xml'
              searchFolder: '$(Build.Repository.LocalPath)   //Note this path must change if your source location changes.
          condition: always()    
```

#### Default Scan Argument Notes

> By default, the nominal scan will invoke the detect-secrets scanner with the argurments -C <path to root directory> scan --force-use-all-plugins. 
> If you would like to point the tool at a specific directory append the desired location in the YAML e.g.,  '$(Build.Repository.LocalPath)/desired_path' and you will have to update the  searchFolder: '$(Build.Repository.LocalPath) path to see the results of the scan.
> If the pipeline is configured without the scanNonGitFiles is configured for your pipeline then the --all-files  argument will be set to scan git artifacts in your pipeline as well.
> setFailureasWarning will be set to false unless otherwise indicated, which will fail the task if a finding occurs. 

#### Allow-List Scan Argument Notes *Preferred method of running the tool*
> To mitigate against false positives in the nominal you can add an allow list to skip over false positive secrets in future runs.
> You must first add an allow-list in your repository; this is a text file with a name of your choosing containing a list of allow-listed secrets seperated by carriage return. *Note You must populate this list with the NON-HASHED SECRET!*
> Then you must check the "Use a word-list file?" box and then fill in the field "Location of secrets word-list file in respoitory" with your new file location.
```
    -   YAML
        - task: CSEDetectSecrets@1
          inputs:
            sourceLocation: '$(Build.Repository.LocalPath)'
            usingwordListFile: true
            wordListFile: 'your_allow-list_filename.txt'
```

> Save and run the pipeline! If you come across more false positives in your pipeline, simply add them into your new allow-list file. 

#### .secrets.baseline Scan Arguments *Less optimal method of running the tool*
> To run your code with a .secrets.baseline file you must first generate one. You can create this artifact by running the default version of this tool and commit the .secrets.baseline file into your codebase or to the secure file location.
> After commiting your .secrets.baseline file you can then check the box "Use a secrets.baseline file?" and input the location of your .secrets.baseline file
> This action will either pass the pipeline with Success if nothing new has been identified in the codebase, otherwise it will throw a warning that your .secrets.baseline file has found changed and will need to be updated in the codebase, and the secrets will need to be mitigated.

```
    -   YAML
        - task: CSEDetectSecrets@1
          inputs:
            sourceLocation: '$(Build.Repository.LocalPath)'
            usingBaselineFile: true
            baselineFile: .secrets.basline
```
### Exclude File Functionality 
>If you would like to exclude certian files from being scanned please provide a list of comma seperated filepaths in the excludeFiles textbox/ Below demonstrates an example YAML.

```
    -   YAML
        - task: CSEDetectSecrets@1
          inputs:
            sourceLocation: '$(Build.Repository.LocalPath)'
            excludeFiles: '/home/vsts/work/1/s/<FOLDER>/<FILE_1>, /home/vsts/work/1/s/<FOLDER>/<FILE_2>'
```

### Reporting 
> After the detect-secrets tool has been executed in the pipeline it will fail red with the number of secrets found in the repository, or it will pass green with no secrets found.
> To look at the full detailed results naviagte to the detect-secrets run results by clicking on the pipeline job number that just finished executing. For example a path should have this form at the top of the page, to the right of the Azure DevOps Logo: <user name>/<org name>/Pipelines/<name of pipeline>/<run #>. 
>Cliking on the <run #> field will take you to an Azure DevOps page which sonntains the following tabs: "Summary" , "Tests", "Scans". 
>if you select the "Tests" tab you will be navigated to a very nice looking report summary, which showcases the suspect file(s), line number, and a hashed version of the secret along with how many secrets were found in the repository classified as "<#> Total tests"  

### User Story Generation 

> To add these secrets into the backlog you can navigate to the "Test Plans" pane *located in the navigation panel on the left*, click on "Runs", and then double click your most recent run it will take you to a Junit XML report.
> Under the "Test Results" tab you can select the desired fixes *Note You can ctrl click the desired issues and group them into one user story - or generate individual user stories.* and click on "Create bug" above. 
> Add a name and notice that clicking on the link icon to the far right of the story contains the information for the backlog item. Add a description if desired - Save and Close. This will create the story in the "Boards" Pane related to this organization. 

### SECURE FILE 

**Considerations:**
Secure files give you a way to store files that you can share across pipelines. Use the secure files library to store files such as:

- allow_lists
- signing certificates
- Apple Provisioning Profiles
- Android Keystore files
- SSH keys

These files can be stored on the server without having to commit them to your **repository.**

Adding a secure file:

1. Go to Pipelines > Library > Secure files
2. Select Secure file to upload a new secure file. Browse to upload or drag and drop your file. You can delete this file, but you can't replace it.
3. Add permisssions to your file. 
    a. Apply security role restrictions for all files from the **Security** tab at **Pipelines > Library**
    b. To add permissions for an individual file, in the file's edit view, select ****Pipeline** permissions** to set per-pipeline permissions. Or, select **Security** to set security roles.
> You can also set Approvals and Checks for the file. For more information, see Approvals and checks.

Consume a secure file in a pipeline 

Use the [Download Secure File](https://docs.microsoft.com/en-us/azure/devops/pipelines/tasks/utility/download-secure-file?view=azure-devops) utility task to consume secure files in a pipeline. 

The following YAML pipeline example downloads a secure certificate file and installs it in a Linux environment

#### Download secure file
Use this task in a pipeline to download a **secure file** to the agent machine. When specifying the name of the file (using the **secureFile** input) use the name you specified when uploading it rather than the actual filename.

Once downloaded, use the **name** value that is set on the task (or "Reference name" in the classic editor) to reference the path to the secure file on the agent machine.
For example, if the task is given the name **mySecureFile**, its path can be referenced in the pipeline as **$(mySecureFile.secureFilePath)**. 
Alternatively, downloaded secure files can be found in the directory given by **$(Agent.TempDirectory)**. 

```
     -   YAML
        - task: DownloadSecureFile@1
          inputs:
            sourceLocation: '$(Build.Repository.LocalPath)'
            wordListFile: 'your_allow-list_filename.txt' #secureFile 
```
