## AffX

AffX is a micro state manager heavily inspired by [Elm](http://elm-lang.org/),
[PureScript](http://www.purescript.org/), and [Redux](https://redux.js.org/).

Embracing the [Micro Frontends](https://micro-frontends.org/) (and Elm)
phylosophy, it allows to easily handle state at the _Component_ level, rather
than at the _application_ level.

AffX' syntax and concepts being very close from the Redux' ones, it's
very easy to grasp. AffX' update function allows to return "commands"
additionally to the state to perform side effects (such as `fetch`, `Date`,
etc...), it's therefore strongly adviced to take a look at
[TEA](https://guide.elm-lang.org/architecture/) if you don't feel confortable
with the concept.

The library is written in [TypeScript](https://www.typescriptlang.org/) for more
fun and benefits :)

For a complete example see
[here](https://github.com/gaku-sei/affx-simple-example/blob/master/src/App.tsx)

### Installation

```
npm install affx
```

or

```
yarn add affx
```

### A simple example using React and react-affx

The Actions and State types

```typescript
// The Action type is defined by AffX
type CounterActions = Action<"INCREMENT"> | Action<"DECREMENT">;

interface CounterState {
  counter: number;
}

const initialState: CounterState = { counter: 0 };
```

The Component

```typescript
// The `object` type hinting here prevents a known issue when the Component does not take any props
// It will be resolved soon

// The WithAffxProps type is available in react-affx
const AffxLessCounter: React.StatelessComponent<
  object & WithAffxProps<CounterState, CounterActions>
> = ({ dispatch, state }) => (
  <div>
    <button onClick={dispatch.always({ type: "INCREMENT" })}>+</button>
    <button onClick={dispatch.always({ type: "DECREMENT" })}>-</button>
    <strong>{state.counter}</strong>
  </div>
);

// We can now use the withAffx HOC defined by react-affx
// The update function is defined below
const Counter = withAffx(initialState, update)(Counter);
```

The Update function

```typescript
// The Update type defined by AffX will enforce the type of our update function
const update: Update<CounterState, CounterActions> = action => state => {
  switch (action.type) {
    case "INCREMENT": {
      return { state: { ...state, counter: state.counter + 1 } };
    }

    case "DECREMENT": {
      return { state: { ...state, counter: state.counter - 1 } };
    }

    default: {
      // AffX will NOT render our React component if no changes have been performed on the state
      return { state };
    }
  }
};
```

### The asynchronous effects (affects)

Where AffX shines is how it handles the side effects. Let's say we want to add a
button in our Counter Component that sends the counter state to a Rest API. Depending
on the UI framework we use (here React), the solution may be different, but we
would have to call an injected service, or an imported function, to handle the
asynchronicity ourself, in a somewhat heterogeneous manner, and mostly _inside_
our Component.

Not with AffX:

```typescript
  // We need to add a new Action to our CounterActions type
  type CounterActions = ... | Action<"SEND_TO_SERVER">;

  // We just add this button in our render method
  <button onClick={this.dispatch.always({ type: "SEND_TO_SERVER" })}>

  // And finally we may update our "update" function (pun intended)
  // ...
  case "SEND_TO_SERVER": {
    // ajax is defined in the affx-affects library and relies on fetch to perform the requests
    const sendToServer = ajax(
      "https://www.my-super-rest-api/counters/", // URL
      "json", // Method used to decode the Response
      { body: state.counter.toString()}, // Any Fetch options
    );

    return {
      state,
      commands: [sendToServer(/* an actionCreator has to be given to sendToServer */)]
    };
  }
  // ...
```

And voilà!

### Additional words

Of course, we may update our state while we send "commands", we therefore may
add some "loading" attribute to our state while sending the counter state to the
API.

Also, the `actionCreator` we pass to `sentToServer` will be called once the
Request is over (whether it failed or not), then its result will be pass to the
dispatcher method of our Component. The whole logic disappears from the
Component, however, our update function remains pure!
