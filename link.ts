import { ApolloLink, Observable } from "@apollo/client/core";
import { execute, subscribe, getOperationAST } from "graphql";
import { makeExecutableSchema } from "@graphql-tools/schema";

export function graphqlLink(typeDefs, resolvers) {
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers
  });

  return new ApolloLink((operation) => {
    const { query: document, variables: variableValues } = operation;
    const { operation: operationType } = getOperationAST(document, null);

    if (operationType === "subscription") {
      return asyncIteratorToObservable(() =>
        subscribe({
          schema,
          document,
          variableValues
        })
      );
    }

    return new Observable((observer) => {
      try {
        Promise.resolve(
          execute({
            schema,
            document,
            variableValues
          })
        ).then((result) => {
          observer.next(result);
          observer.complete();
        }, observer.error.bind(observer));
      } catch (error) {
        observer.error(error);
      }
    });
  });
}

function isAsyncIterator(a) {
  return a.next;
}

function asyncIteratorToObservable(generator) {
  let asyncIterator;

  const cleanup = () => {
    console.log('cleanup');
    return asyncIterator && asyncIterator.return && asyncIterator.return()
  }

  return new Observable((observer) => {
    try {
      generator().then((result) => {
        if (isAsyncIterator(result)) {
          asyncIterator = result;

          if (observer.closed) {
            console.log('observer closed');
            cleanup();
            return;
          }

          void asyncIteratorToObserver(result, observer);
        } else {
          observer.next(result);
          observer.complete();
        }
      }, observer.error.bind(observer));
    } catch (error) {
      observer.error(error);
    }

    return cleanup;
  });
}

async function asyncIteratorToObserver(asyncIterator, observer) {
  const asyncIterable = {
    [Symbol.asyncIterator]() {
      return asyncIterator;
    }
  };

  try {
    for await (const value of asyncIterable) {
      observer.next(value);
    }
    observer.complete();
  } catch (error) {
    observer.error(error);
  }
}