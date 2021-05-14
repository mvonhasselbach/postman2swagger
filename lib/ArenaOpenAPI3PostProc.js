const fs = require('fs');
const __ = require('lodash');
const jp = require('jsonpath');
const Converter = require('api-spec-converter');
const { transpile } = require('postman2openapi');


/*
item[] nested until request & response -> 
    request.url.raw with Arena guid ID, request.url.path[] with same guid -> replace by: see regex
    response.originalRequest.url and path treated in the same way
*/

function process(inputFile, outputIntermediateFiles, outputFile) {
  console.log('input file: ' + inputFile);
  const inputStr = fs.readFileSync(inputFile, 'utf-8');

  const openapi = transpile(inputStr, 'json');
  if(outputIntermediateFiles){
    const openapi3outFile = outputFile ? outputFile.slice(0, -5) + '_OpenAPI3_orig.json' : inputFile.slice(0, -5) + '_OpenAPI3_orig.json';
    fs.writeFileSync(openapi3outFile, openapi);
    console.log(`==> generated output file: ${openapi3outFile} `);
  }

  const inputData = JSON.parse(openapi);
  /*
      1. switch version to 3.0.2
    2. Replace the use of all "anyOf":[{type:string}] -> type:string . That works because 1) most of the time the use of anyOf is due to null values and 2) the Flow Swagger Connector doesn't like anyOf!
    3. remove any non-X-Arena-prefixed response headers
    4. for any nullable=true element, w/o type, set type='string'. ? Remove nullable to avoid "x-nullable" in Swagger?
  
  */

  console.log("1. Setting server URL to https://api.arenasolutions.com/v1");
  inputData.servers[0].url = 'https://api.arenasolutions.com/v1'
  console.log("2. Switching OpenAPI Spec Version from " + inputData.openapi + " to Flow Supported version 3.0.1");
  inputData.openapi = '3.0.1'; //the Flow Swagger connector rejects openapi > v3.0.1 and there is no real difference between 3.0.2.and 3.0.1 for our purpose 

  var count = 0;
  jp.query(inputData, '$..properties[?(@.anyOf)]').forEach(el => {
    count++;
    el.type = 'string';
    delete el.anyOf;
  });
  console.log("3. removed " + count + " uses of anyOf[] and replaced by type: string");
  count = 0;
  jp.query(inputData, '$..responses..headers').forEach(el => {
    Object.getOwnPropertyNames(el).forEach(headerName => {
      if (!headerName.startsWith('X-Arena-')) {
        count++;
        delete el[headerName];
      }
    });
  });
  console.log(`4. removed ${count} header that doesn't start with X-Arena-`);
  count = 0;
  jp.query(inputData, '$..[?(@.nullable==true)]').forEach(el => {
    count++;
    if (!el.type) el.type = 'string';
    delete el.nullable;
  })
  console.log(`5. removed ${count} nullable properties with type: string`);
  count = 0;

  jp.query(inputData, '$..properties.*').forEach(el => {
    if (!el.type) {
      count++;
      el.type = 'string';
    }
  });
  console.log(`6. added ${count} type: string for properties that don't have a type attribute`);
  count = 0;

  jp.query(inputData, '$..[?(@.example)]').forEach(el => {
    count++;
    delete el.example;
  })
  console.log(`7. removed ${count} example data`);
  count = 0;
  jp.query(inputData, '$..[?(@.examples)]').forEach(el => {
    count++;
    delete el.examples;
  })
  console.log(`8. removed ${count} examples data`);
  count = 0;
  if(outputIntermediateFiles){
    const openapi3outFile = outputFile ? outputFile.slice(0, -5) + '_OpenAPI3.json' : inputFile.slice(0, -5) + '_OpenAPI3.json';
    fs.writeFileSync(openapi3outFile, JSON.stringify(inputData, null, '\t'));
    console.log(`==> generated output file: ${openapi3outFile} `);
  }
  //write resulting file
  Converter.convert({
    from: 'openapi_3',
    to: 'swagger_2',
    source: inputData
  })
    .then(function (converted) {
      // console.log(converted.stringify());
      converted.fillMissing();

      jp.query(converted, "$..parameters[?(@.in=='body')]").forEach(el => {
        count++;
        el.name = 'Body';
      })
      console.log(`9. renamed ${count} body parameters to 'Body'`);
      count = 0;
        
      return converted.validate()
        .then(function (result) {
          if (result.errors)
            console.error(JSON.stringify(result.errors, null, 2));
          if (result.warnings)
            console.error(JSON.stringify(result.warnings, null, 2));

          converted.spec.consumes = ["application/json"];
          converted.spec.produces = ["application/json"];

          const swaggeroutFile = outputFile ? outputFile : inputFile.slice(0, -5) + '_Swagger.json';
          fs.writeFileSync(swaggeroutFile, JSON.stringify(converted.spec, null, '\t'));
          console.log(`==> generated output file: ${swaggeroutFile} `);
        });
      // fs.writeFileSync(inputFile.slice(0,-5)+'_postproc.json', JSON.stringify(inputData, null,'\t'));
    });
  // console.log(JSON.stringify(inputData,null,'\t'));
  // fs.writeFileSync(inputFile.slice(0,-5)+'_postproc.json', JSON.stringify(inputData, null,'\t'));
  // console.log('Wrote to: '+inputFile.slice(0,-5)+'_postproc.json');
}
module.exports={ 
  process
};

//console.log('argv: ' + process.argv);
//let inputFile = process.argv[2];
//const testDir = fs.realpathSync(module.filename+'/..');
//process(inputFile);