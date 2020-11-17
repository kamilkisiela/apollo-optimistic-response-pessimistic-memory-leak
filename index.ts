import { gql } from "@apollo/client/core";
import { resolveModuleName } from "typescript";
import { createClient } from "./client";

class Foo {
  foo = "foo";

  message() {
    return this.foo;
  }
}

const QUERY = gql`
  {
    messages {
      id
      message
    }
  }
`;

const client = createClient();

function query() {
  let resolved = false;
  return new Promise((resolve, reject) => {
    const sub = client
      .watchQuery({
        query: QUERY,
      })
      .subscribe({
        next(result) {
          if (!resolved) {
            resolved = true;
            resolve(sub);
          }
          console.log(result);
        },
        error(error) {
          if (!resolved) {
            resolved = true;
            reject();
          }
          console.error(error);
        },
        complete() {
          console.log("Query completes");
        },
      });
  });
}

async function main() {
  const subscription: any = await query();
  const foo = new Foo();

  await client.mutate({
    mutation: gql`
      mutation send($message: String!) {
        send(message: $message) {
          id
          message
        }
      }
    `,
    variables: {
      message: "HELLO",
    },
    optimisticResponse: {
      __typename: "Mutation",
      send: {
        __typename: "Message",
        id: Date.now(),
        message: "HELLO",
      },
    },
    update(cache, result) {
      foo.message();
      const data: any = cache.readQuery({
        query: QUERY,
      });

      cache.writeQuery({
        query: QUERY,
        data: {
          ...data,
          messages: [...data.messages, result.data.send],
        },
      });
    },
  });

  console.log("TAKE A HEAPSNAPSHOT AND LOOK FOR Foo CLASS");
  debugger;

  subscription.unsubscribe();
}

main().catch((error) => {
  console.error(error);
});
