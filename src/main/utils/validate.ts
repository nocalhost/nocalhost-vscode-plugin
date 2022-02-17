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

export function validateData(
  data: Object | undefined,
  schema: Object | boolean
): Ajv.ValidateFunction | boolean {
  if (!data) {
    return false;
  }
  const validate = ajv.compile(schema);

  const result = validate(data);

  if (result === true) {
    return true;
  } else {
    return validate;
  }
}
