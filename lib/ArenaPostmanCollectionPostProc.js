const fs = require('fs');

var __ = require("lodash");

/*
item[] nested until request & response -> 
    request.url.raw with Arena guid ID, request.url.path[] with same guid -> replace by: see regex
    response.originalRequest.url and path treated in the same way
*/
const noMultipartData = true;
console.log('argv: '+process.argv);
const inputFile = process.argv[2];
const testDir = fs.realpathSync(module.filename+'/..');
console.log('input file: '+inputFile);
const inputData = JSON.parse( fs.readFileSync(inputFile,'utf-8') );

const newPaths = {};
const oldPaths = [];

const pathGuidRE = /\/(\w*?)(s?)\/([A-Z0-9]{20,24})/gm;
const subst = '/$1$2/{{$1_guid}}';
//recurse nested item[]
const replaceGuidsByPlaceholders = function(request){
    if( request ){
        let path = request.url.raw;
        const newPath = path.replace(pathGuidRE, subst);
        console.log("got Path post regexp: "+newPath);
        const matches = [...path.matchAll(pathGuidRE)];
        console.log("got matches[[]]: "+matches);
        matches.forEach(function(match){
            for(let i=0; i<request.url.path.length;i++){
                if(request.url.path[i]==match[3]) request.url.path[i]='{{'+match[1]+'_guid}}';
            }
        });
        request.url.raw=newPath;
    }

}
const recurseCollection = function(node){
    if( Array.isArray(node.item) ) node.item.forEach(el => recurseCollection(el) );
    else{
        replaceGuidsByPlaceholders(node.request);
        node.response.forEach( resp => replaceGuidsByPlaceholders(resp.originalRequest));
    }
}

recurseCollection(inputData);

//write resulting file
console.log(JSON.stringify(inputData));
fs.writeFileSync(inputFile.slice(0,-5)+'_postproc.json', JSON.stringify(inputData));
console.log('Wrote to: '+inputFile.slice(0,-5)+'_postproc.json');