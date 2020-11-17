import {
  ApolloClient,
  ApolloLink,
  Observable,
  InMemoryCache,
} from "@apollo/client/core";
import { graphqlLink } from "./link";

export function createClient() {
  const messages = [
    {
      id: 1,
      message: "Hi",
    },
  ];

  const schemaLink = graphqlLink(
    /* GraphQL */ `
      type Query {
        messages: [Message!]
      }
      type Mutation {
        send(message: String!): Message!
      }

      type Message {
        id: Int!
        message: String!
      }
    `,
    {
      Query: {
        messages: () => messages,
      },
      Mutation: {
        async send(_source: {}, { message }: { message: string }) {
          const newMessage = {
            id: messages.length + 1,
            message,
          };
          messages.push(newMessage);

          return newMessage;
        },
      },
    }
  );

  return new ApolloClient({
    cache: new InMemoryCache(),
    link: ApolloLink.from([
      new ApolloLink((op, next) => {
        return new Observable((observer) => {
          const sub = next(op).subscribe(observer);
          return () => {
            sub.unsubscribe();
          };
        });
      }),
      schemaLink,
    ]),
  });
}

export const client = createClient();
