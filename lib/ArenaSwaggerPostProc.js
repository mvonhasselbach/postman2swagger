const fs = require('fs');

//var __ = require("lodash");
const noMultipartData = true;
console.log('argv: '+process.argv);
const inputFile = process.argv[2];
const testDir = fs.realpathSync(module.filename+'/..');
console.log('input file: '+inputFile);
const inputData = JSON.parse( fs.readFileSync(inputFile,'utf-8') );
const newPaths = {};
const oldPaths = [];
Object.getOwnPropertyNames( inputData.paths ).forEach( path  => {
    console.log("path: "+path);
    /* remove Content-Type params
    Delete paths.*.*.parameters[*].name==Content-Type
    {
                "name": "Content-Type",
                "in": "header",
                "required": true,
                "type": "string",
                "description": ""
            }
    set consumes to multipart/form-data when parameters[*].in=formData 
    remove path.verb when parameters[*].in=formData && processing flag noMultipartData=true 
    */
    Object.getOwnPropertyNames( inputData.paths[path] ).forEach(verb =>{
        const params = inputData.paths[path][verb].parameters;
        const redParams = params.filter( el => el.name!='Content-Type' || el.in!='header');
        inputData.paths[path][verb].parameters=redParams;

        if(params.find( el => el.in=='formData')){
            if(noMultipartData) delete inputData.paths[path][verb];
            else {
                inputData.paths[path][verb].consumes[0]='multipart/form-data';//check if empty??
                params.find(el => (el.name.endsWith('content') && el.in=='formData')).type='file';
            }
        } 

    });

    /*
    convert path guids in parameters
    AND merge path subelements 

    GUIDS regexp: /\/(\w*)\/[A-Z0-9]{20,24}\b/g
    ->
            {
                "name": $1+"_guid",
                "in": "path",
                "required": true,
                "type": "string",
                "description": "$1 guid"
            }
    */
    const pathGuidRE = /\/(\w*?)(s?)\/[A-Z0-9]{20,24}/gm;
    const subst = '/$1$2/{$1_guid}';
    console.log("got Path pre regexp: "+path);
    const newPath = path.replace(pathGuidRE, subst);
    console.log("got Path post regexp: "+newPath);
    const matches = [...path.matchAll(pathGuidRE)];
    if(matches.length>0){

        const newPObj = inputData.paths[newPath] || {};
        //get all verb subnodes, add path param to them and merge them to (new) path-subst node 
        Object.getOwnPropertyNames( inputData.paths[path] ).forEach(verb =>{
            matches.forEach(match => {
                const pathParam= {
                    "name": match[1]+"_guid",
                    "in": "path",
                    "required": true,
                    "type": "string"
                }
                inputData.paths[path][verb].parameters.push(pathParam)
            });
            newPObj[verb]=inputData.paths[path][verb];
        });
        newPaths[newPath]=newPObj;
        oldPaths.push(path);
    }    
});
const mergedPaths = Object.assign(inputData.paths,newPaths);
oldPaths.forEach(path => delete mergedPaths[path]);
inputData.paths = mergedPaths;

//write resulting file
console.log(JSON.stringify(inputData));
fs.writeFileSync(inputFile.slice(0,-5)+'_postproc.json', JSON.stringify(inputData));
console.log('Wrote to: '+inputFile.slice(0,-5)+'_postproc.json');