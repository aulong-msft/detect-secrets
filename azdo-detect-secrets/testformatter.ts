import {v4 as uuidv4} from 'uuid';
import xmlbuilder = require('xmlbuilder');

import builder = require('xmlbuilder');

export class TestCreator
{
    root: jUnitTestSuites = new jUnitTestSuites();

    constructor(testSoftwareName:string)
    {
        this.root.testingToolName = testSoftwareName;
    }

    public AddGroupedSuccessResult(group:string, testName:string)
    {
        const groupTarget = this.GetTestSuiteGroup(group);
        
        const testCase = new jUnitTestCase();
        testCase.name = testName;
        testCase.result = true;
        
        groupTarget.children.push(testCase);
    }

    public AddGroupedFailResult(group:string, testName:string, shortMessage:string, longMessage:string, failureType = "CRITICAL")
    {
        const groupTarget = this.GetTestSuiteGroup(group);
        
        const testCase = new jUnitTestCase();
        testCase.name = testName;
        testCase.result = false;
        testCase.shortMessage = shortMessage;
        testCase.longMessage = longMessage;
        testCase.failureType = failureType;
        
        groupTarget.children.push(testCase);
    }

    public AddSuccessResult(testName:string)
    {
        this.AddGroupedSuccessResult(this.root.testingToolName, testName);
    }

    public AddFailResult(testName:string, shortMessage:string, longMessage:string, failureType = "CRITICAL")
    {
        this.AddGroupedFailResult(this.root.testingToolName, testName, shortMessage, longMessage, failureType);
    }

    public EmitXml() : string
    {
        return this.root.GenerateXml();
    }

    private GetTestSuiteGroup(groupName:string) : jUnitTestSuite
    {
        let target:jUnitTestSuite = null;
        const targetSet = this.root.children.filter(c => c.suiteName === groupName);
        if (targetSet.length == 0)
        {
            target = new jUnitTestSuite();
            target.suiteName = groupName;
            this.root.children.push(target);
            return target;
        }
        else
        {
            return targetSet[0];
        }
    }
}

class jUnitTestSuites
{
    id: string = uuidv4();
    testingToolName: string;

    startTime: Date = new Date();
    endTime: Date = new Date();

    children: Array<jUnitTestSuite> = new Array<jUnitTestSuite>();

    public get totalTests() {
        let sum = 0;
        this.children.forEach(s => sum += s.totalTests);
        return sum;
    }
    public get failed() {
        let sum = 0;
        this.children.forEach(s => sum += s.failed);
        return sum;
    }
    public get totalSeconds() {
        return Math.abs((this.endTime.getTime() - this.startTime.getTime()) / 1000);
    }

    public GenerateXml() {
        this.children.forEach(s => 
        {
            s.startTime = this.startTime;
            s.endTime = this.endTime;
        });

        const testsuites = builder.create('testsuites');

        testsuites.att('id', this.id);
        testsuites.att('name', this.testingToolName);
        testsuites.att('tests', this.totalTests);
        testsuites.att('failures', this.failed);
        testsuites.att('time',this.totalSeconds);
        
        this.children.forEach(c => c.GenerateXml(testsuites));

        return testsuites.end({pretty:true});
    }
}

class jUnitTestSuite
{
    id: string = uuidv4();
    suiteName: string;
    baseRunCount: number;

    startTime: Date = new Date();
    endTime: Date = new Date();

    children: Array<jUnitTestCase> = new Array<jUnitTestCase>();

    public get totalTests() {
        return this.children.length + this.baseRunCount;
    }
    public get failed() {
        return this.children.filter(c => c.result === false).length;
    }

    public get totalSeconds() {
        return Math.abs((this.endTime.getTime() - this.startTime.getTime()) / 1000);
    }

    public GenerateXml(parent: xmlbuilder.XMLDocument) {
        const testSuite = parent.ele('testsuite');
        testSuite.att('id', this.id);
        testSuite.att('name', this.suiteName);
        testSuite.att('tests', this.totalTests);
        testSuite.att('failures', this.failed);
        testSuite.att('time',this.totalSeconds);
        
        //only gen failures
        this.children.forEach(c => { if (c.result === false) { c.GenerateXml(testSuite); } });
    }
}

class jUnitTestCase
{
    id: string = uuidv4();
    name: string;

    result: boolean;

    shortMessage: string;
    longMessage: string;
    failureType = "CRITICAL";

    public GenerateXml(parent: xmlbuilder.XMLDocument) {
        const testSuite = parent.ele('testcase');
        testSuite.att('id', this.id);
        testSuite.att('name', this.name);
        testSuite.att('time', 1);

        if (this.result === false)
        {
            const failure = testSuite.ele('failure', this.longMessage);
            failure.att('message', this.shortMessage);
            failure.att('type', this.failureType);
        }
    }
}