import * as Ajv from "ajv";

const ajv = new Ajv();

export default function validate(
  data: Object | undefined,
  schema: Object | boolean
) {
  if (!data) {
    return false;
  }
  const validatef = ajv.compile(schema);
  if (validatef(data)) {
    return true;
  } else {
    return false;
  }
}
