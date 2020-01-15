import { clientScanner, IOpenAPI } from "@morlay/ts-gen-client-from-openapi";
import { Decl, Identifier, safeKey, toLowerCamelCase, Type, Value, writerOf } from "@morlay/ts-gen-core";
import { ISchemaBasic } from "@morlay/ts-gen-definitions-from-json-schema";
import { first, forEach, get, has, isObject, keys, last, map, omit, reduce, size, split } from "lodash";

const toDisplayMethod = (name = "") => toLowerCamelCase(["display", name.replace("$$$", "")].join("_"));

const toDisplayObjectField = (schema: ISchemaBasic, decl: Decl) => {
  const name = decl.identifier.name;
  const extendNames = map(decl.identifier.extends, (i) => i.name);

  let props = schema.properties;

  if (schema.allOf) {
    if (!props) {
      props = ((last(schema.allOf) || {}) as ISchemaBasic).properties;
    }
  }

  const propDisplays = map(props, (propSchema: ISchemaBasic, key: string) => {
    let finalSchema = propSchema;

    if (propSchema.allOf) {
      finalSchema = reduce(
        propSchema.allOf.concat(omit(propSchema, "allOf")),
        (a, b) => ({
          ...a,
          ...(b as any),
        }),
        {},
      );
    }

    return Identifier.of(safeKey(key)).valueOf(
      Value.of(
        first(split(finalSchema.description || "", "\n").filter((line: string) => !line.includes("go:generate"))),
      ),
    );
  });

  const callbackFunc = Identifier.of("")
    .operatorsWith(": ", " => ")
    .paramsWith(Identifier.of("field").typed(Type.of(size(props) > 0 ? `keyof ${name}` : `any`)))
    .valueOf(
      Value.memberOf(
        Decl.returnOf(
          Identifier.of(
            ([] as string[])
              .concat(map(extendNames, (n: string): string => `${toDisplayMethod(n)}(field as any)`))
              .concat(`(${Value.objectOf(...(propDisplays as any))} as { [key: string]: string })[field]`)
              .join(" || "),
          ),
        ),
      ),
    );

  return Decl.const(Identifier.of(toDisplayMethod(name)).valueOf(callbackFunc));
};

const toDisplayEnum = (schema: ISchemaBasic, name: string) => {
  const enumDisplays: { [k: string]: string } = {};

  if (isObject(schema) && has(schema, "x-enum-options")) {
    const enumOptions = get(schema, "x-enum-options");

    forEach(enumOptions, ({ value, label }) => {
      enumDisplays[value] = label;
    });
  }

  const callbackFunc = Identifier.of("")
    .operatorsWith(": ", " => ")
    .paramsWith(Identifier.of("type").typed(Type.unionOf(...keys(enumDisplays).map((v) => Type.of(Value.of(v))))))
    .valueOf(
      Value.memberOf(
        Decl.returnOf(
          Identifier.of(
            `${Value.objectOf(
              ...map(enumDisplays, (value: string, key: string) => Identifier.of(key).valueOf(Value.of(value))),
            )}[type]`,
          ),
        ),
      ),
    );

  return Decl.const(Identifier.of(toDisplayMethod(name)).valueOf(callbackFunc));
};

export const generate = (clientID: string, openAPI: IOpenAPI, clientCreator = "") => {
  const writer = writerOf({ prefixInterface: "I", prefixType: "I" });

  writer.onWrite = (decl: Decl, ctx: any) => {
    if (decl.kind === "enum") {
      writer.write(toDisplayEnum(ctx as ISchemaBasic, decl.identifier.name));
    }

    if (decl.kind === "interface") {
      writer.write(toDisplayObjectField(ctx as ISchemaBasic, decl));
    }
  };

  clientScanner(writer, openAPI, {
    clientId: clientID,
    clientLib: {
      path: /^(.+)\.(\w+)$/.exec(clientCreator)![1],
      method: /^(.+)\.(\w+)$/.exec(clientCreator)![2],
    },
  });

  return `/* eslint-disable @typescript-eslint/no-use-before-define */

${writer.output()}
`;
};
