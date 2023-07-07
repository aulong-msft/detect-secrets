/*
This Files is the Unit Test Driver.  It utilizes the test plan files to execute each test.
*/

import * as path from 'path';
import * as assert from 'assert';
import * as ttm from 'azure-pipelines-task-lib/mock-test';
import { TestCreator } from "../azdo-detect-secrets/testformatter";
import { expect } from 'chai';


// CONSTANTS
const shouldNoWarning = "should have no warnings";
const shouldFail = 'should have failed';
const shouldSucceed = 'should have succeeded'; // eslint-disable-line
const taskJsonFile = "./azdo-detect-secrets/task.json";
const shouldSucceedNoThrow = 'should execute without throwing an error';

describe('Detect Secrets Unit Tests', function () {


  //Happy Path Test Case -- Provides normal expected inputs via the Mocked API 
  //  The test plan is written in success.ts (transpiled to javascript prior to use)
  //  This test should succeed and have no errors or warnings.
  
  it('should succeed with simple inputs', function (done: Mocha.Done) {
    this.timeout(100000);

    const tp = path.join(__dirname, 'success.js');
    const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp,  taskJsonFile);

    tr.run();
    assert.equal(tr.succeeded, true, shouldSucceed + tr.succeeded );  // expect that it succeeds
    assert.equal(tr.warningIssues.length, 0, shouldNoWarning + tr.warningIssues); // expect no warnings
    assert.equal(tr.errorIssues.length, 0, "should have no errors " + tr.errorIssues); // eslint-disable-line

    done();
  });

  it('should succeed with simple inputs including wordlist', function (done: Mocha.Done) {
    this.timeout(100000);

    const tp = path.join(__dirname, 'success_wordlist.js');
    const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp,  taskJsonFile);

    tr.run();
    assert.equal(tr.succeeded, true, "should have succeeded " + tr.succeeded );  // expect that it succeeds
    assert.equal(tr.warningIssues.length, 0, "should have no warnings " + tr.warningIssues); // expect no warnings
    assert.equal(tr.errorIssues.length, 0, "should have no errors " + tr.errorIssues); // expect no errors

    done();
  });
  it('should fail with empty wordlist', function (done: Mocha.Done) {
    this.timeout(100000);

    const tp = path.join(__dirname, 'failure_wordlist-empty.js');
    const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp,  taskJsonFile);

    tr.run();
    assert.equal(tr.succeeded, true, "should have succeeded " + tr.succeeded );  // expect that it succeeds
    assert.equal(tr.warningIssues.length, 1, "should have one warning " + tr.warningIssues); // expect no warnings
    assert.equal(tr.errorIssues.length, 0, "should have no errors " + tr.errorIssues); // expect no errors

    done();
  });
    //Pip Install Failure test case -- Provides normal expected inputs via the Mocked API 
   // up to the point that detect secrets is attempted to be installed via pip. At this point,
   // The mock returns a non-zero return value indicating an error has occurred.
   // The test plan is written in failure-pipinstall.ts (transpiled to javascript prior to use)
  
  it('should fail if pip doesnt install detect-secrets',function (done: Mocha.Done) {
    this.timeout(100000);

    const tp = path.join(__dirname, 'failure-pipinstall.js');
    const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp,  taskJsonFile);

    tr.run();
    assert.equal(tr.succeeded, false, shouldFail); // expect that it fails
    assert.equal(tr.warningIssues.length, 0, shouldNoWarning);  // expect no warnings
    done();
  });

      //Plugins Missing Failure test case -- Provides normal expected inputs via the Mocked API 
  //  up to the point that detect secrets is used to list pluging. At this point,
  //  The mock returns a zero value indicating that there are no plugins on the system.
  //  The test plan is written in failure-plugincheck.ts (transpiled to javascript prior to use)
  
  it('it should fail if plugins not present', function (done: Mocha.Done) {
    this.timeout(100000);

    const tp = path.join(__dirname, 'failure-plugincheck.js');
    const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp,   taskJsonFile);

    tr.run();
    assert.equal(tr.succeeded, false, shouldFail);  // expect that it fails
    assert.equal(tr.warningIssues.length, 0, shouldNoWarning);  // expect no warnings
    done();
  });

});

//Test TestCreator.AddGroupedSuccessResult() to see if it throws an exception
describe('TestCreator', () => {
  describe('Test AddGroupedSuccessResult', () => {
    it(shouldSucceedNoThrow, () => {
      const testCreator = new TestCreator('Test');
      expect(testCreator.AddGroupedSuccessResult('foo', 'bar')).not.Throw;
    });
  });
  describe('Test AddGroupedFailResult', () => {
    it(shouldSucceedNoThrow, () => {
      const testCreator = new TestCreator('Test');
      expect(testCreator.AddGroupedFailResult('foo', 'bar', 'zoo', 'zoo2')).not.Throw;
    });
  });
  // AddSuccessResult
  describe('Test AddSuccessResult', () => {
    it(shouldSucceedNoThrow, () => {
      const testCreator = new TestCreator('Test');
      expect(testCreator.AddSuccessResult('foo')).not.Throw;
    });
  });
  // AddFailResult
  describe('Test AddFailResult', () => {
    it(shouldSucceedNoThrow, () => {
      const testCreator = new TestCreator('Test');
      expect(testCreator.AddFailResult('foo', 'bar', 'zoo', 'zoo2')).not.Throw;
    });
  });
  // EmitXml()
  describe('Test EmitXml', () => {
    it(shouldSucceedNoThrow, () => {
      const tc = new TestCreator('Test');

      for (let x = 0; x < 3; x++) {
        const lineNumber = Math.random() % 1000;

        // this tests both paths of the private GetTestSuiteGroup
        // in the first iteration of the for loop the test creator has no children
        tc.AddGroupedFailResult(
          "GroupName", // group
          "GroupName" + " - " + "fileName" + x + ":" + lineNumber,  // name
          "Detected a secret in file " + "fileName" + ":" + lineNumber, // short msg
          "A secret was detected in a file:\n" +
          "Filename: " + "fileName" + ":" + lineNumber + "\n" +
          "Type: " + "GroupName" + "\n" +
          "Secret Hash: " + Math.random(), // long msg
          "CRITICAL"); // type
      }
      expect(tc.EmitXml()).not.Throw;
      const xmlResult = tc.EmitXml();
      expect(xmlResult).not.be.null;
      expect(xmlResult).not.be.undefined;
      expect(xmlResult.length).is.not.equal(''.length);
      expect(xmlResult.indexOf('CRITICAL')).is.greaterThan(0);
      
    });
  });
});
