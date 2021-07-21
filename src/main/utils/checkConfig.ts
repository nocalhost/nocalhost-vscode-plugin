import validate from "./validate";


const workLoadSchema = {
    type: "object",
    required: ["containers"],
    properties: {
      containers: {
        type: "array",
        items: {
          type: "object",
          required: ["dev"],
          properties: {
            dev: {
              type: "object",
              required: ["image"],
              properties: {
                image: {
                  type: "string",
                  minLength: 1,
                },
              },
            },
          },
        },
        minItems: 1,
      },
    },
  };

export const checkWorkloadConfig = (config = {}, schema = workLoadSchema) => {
    return validate(config, schema);
};