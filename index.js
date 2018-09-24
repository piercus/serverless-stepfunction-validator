'use strict';

const aslValidator = require('asl-validator');
const path = require('path');
const BbPromise = require('bluebird');

class ServerlessStepfunctionValidator {
	constructor(serverless, options) {
		this.serverless = serverless;
		this.options = options;
		this.stateMachine = this.options.stateMachine;

		this.commands = {
			validate: {
				usage: 'Validate that the step function definition is ok with Amazon State Language',
				lifecycleEvents: ['start']
			}
		};

		this.hooks = {
			'before:package:initialize': this.validate.bind(this),
			'validate:start': this.validate.bind(this, true)
		};
	}

	yamlParse() {
    const servicePath = this.serverless.config.servicePath;
    if (!servicePath) {
      return BbPromise.resolve();
    }

    const serverlessYmlPath = path.join(servicePath, 'serverless.yml');
    return this.serverless.yamlParser
      .parse(serverlessYmlPath)
      .then(serverlessFileParam =>
        this.serverless.variables.populateObject(serverlessFileParam)
        .then(parsedObject => {
          this.serverless.service.stepFunctions = {};
          this.serverless.service.stepFunctions.stateMachines
              = parsedObject.stepFunctions
            && parsedObject.stepFunctions.stateMachines
              ? parsedObject.stepFunctions.stateMachines : {};
          this.serverless.service.stepFunctions.activities
              = parsedObject.stepFunctions
            && parsedObject.stepFunctions.activities
              ? parsedObject.stepFunctions.activities : [];

          if (!this.serverless.pluginManager.cliOptions.stage) {
            this.serverless.pluginManager.cliOptions.stage = this.options.stage
            || (this.serverless.service.provider && this.serverless.service.provider.stage)
            || 'dev';
          }

          if (!this.serverless.pluginManager.cliOptions.region) {
            this.serverless.pluginManager.cliOptions.region = this.options.region
            || (this.serverless.service.provider && this.serverless.service.provider.region)
            || 'us-east-1';
          }

          this.serverless.variables.populateService(this.serverless.pluginManager.cliOptions);
          return BbPromise.resolve();
        })
      );
  }

	validate() {
    this.yamlParse().then(() => {
  		let allErrors = [];
  		for (const k of Object.keys(this.serverless.service.stepFunctions.stateMachines)) {
  			const stateMachineDefinition = this.serverless.service.stepFunctions.stateMachines[k];
        console.log(k)
  			const {isValid, errors} = aslValidator(stateMachineDefinition);
  			allErrors = allErrors.concat(errors);
  		}
  		if (allErrors.length > 0) {
        console.log(allErrors)
  			return Promise.reject(new Error('not valid asl'));
  		}
  		return Promise.resolve({});
    });
	}
}

module.exports = ServerlessStepfunctionValidator;
