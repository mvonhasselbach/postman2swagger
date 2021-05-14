#!/usr/bin/env node

const yargs = require("yargs");
const aspp = require ("../lib/ArenaOpenAPI3PostProc.js");

const options = yargs
 .usage("Usage: node . -p <postmanCollection.json> -o <outputFile>")
 .option("p", { alias: "PostmanCollection", describe: "Postman Collection export file", type: "file", demandOption: true })
 .option("o", { alias: "output", describe: "Output file", type: "file", demandOption: false })
 .option("i", { alias: "outputIntermediateFiles", describe: "Output files of intermediate steps i.e. *_OpenAPI3_orig.json and *_OpenAPI3.json", type: "boolean", demandOption: false, default: false })
 .argv;

console.log("outputIntermediateFiles: "+options.i);
aspp.process(options.p, options.i, options.o);

