const TJS = require('typescript-json-schema');
const fs = require('fs');





const schemaDefs = new Array();

schemaDefs.push({ name: 'gah-config', schema: 'GahConfig' });
schemaDefs.push({ name: 'gah-module', schema: 'GahModule' });
schemaDefs.push({ name: 'gah-host', schema: 'GahHost' });
schemaDefs.push({ name: 'gah-environment', schema: 'GahEnvironment' });


schemaDefs.forEach(sd => {
  const program = TJS.programFromConfig('tsconfig.json');
  const generator = TJS.buildGenerator(program);

  const schema = generator.getSchemaForSymbol(sd.schema);

  const json = `${JSON.stringify(schema, null, 4)}\n\n`;
  fs.writeFileSync(`assets/${sd.name}-schema.json`, json);
});
