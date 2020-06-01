const TJS = require('typescript-json-schema');
const fs = require('fs');



const program = TJS.programFromConfig('tsconfig.json');
const generator = TJS.buildGenerator(program);

const schemaDefs = new Array();

schemaDefs.push({ name: 'gah-config', schema: generator.getSchemaForSymbol('GahConfig') });
schemaDefs.push({ name: 'gah-module', schema: generator.getSchemaForSymbol('GahModule') });
schemaDefs.push({ name: 'gah-host', schema: generator.getSchemaForSymbol('GahHost') });


schemaDefs.forEach(sd => {
  const json = JSON.stringify(sd.schema, null, 4) + '\n\n';
  fs.writeFileSync('assets/' + sd.name + '-schema.json', json);
});
