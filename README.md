# postman2swagger
My tooling to generate Flow-compliant Swagger or OpenAPI files from postman collections


# How to generate Swagger2 / OpenAPI 3 efficiently #

1. Start with Postman
	- Save Test/Example data. The tooling uses it to infer the schema used in the generated Swagger/OpenAPI file
	- Add Postman Variables
    - in one collection use the same endpoint only once. The generator will not aggregate multiple calls to the same endpoint in the spec but rather uses the last entry only. 
2. Use the command line tool with:
    ```node . -p my_postmancollection.json -i -o my_swagger.json```
	This will generate the files:
		- my_swagger__OpenAPI3_orig.json
		- my_swagger__OpenAPI3.json
		- my_swagger.json

    ```node . -p my_postmancollection.json -i -o my_swagger.json```
	This will generate the file:
		- my_postmancollection_Swagger.json

# Processing effects #

1. Sets server URL to https://api.arenasolutions.com/v1
2. Switches OpenAPI Spec Version from 3.0.3 to Flow Supported version 3.0.1
3. removes uses of anyOf[] and replaced by type: string
4. removes header that doesn't start with X-Arena-
5. removes nullable properties with type: string
6. addes type: string for properties that don't have a type attribute
7. removes example data
8. removes examples data
9. renames body parameters to 'Body'