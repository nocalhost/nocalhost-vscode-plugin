import * as Ajv from "ajv";

const ajv = new Ajv();

export default function validate(data: Object, schema: Object | boolean) {
  const validatef = ajv.compile(schema);
  if (validatef(data)) {
    return true;
  } else {
    return false;
  }
}
