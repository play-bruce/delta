const graph = [];

function sort(graph) {
    const sorted = [];
    const stack = [];
    function visitEach(nodes) {
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (stack.indexOf(node) !== -1) {
                throw new Error(`Cannot sort cyclic graphs. Found cycle returning to ${node} after ${stack.map(node => graph.indexOf(node)).join('->')}`);
            }
            if (sorted.indexOf(node) === -1) {
                stack.push(node);
                visitEach(node.dependants);
                stack.pop();
                sorted.unshift(node);
            }
        }
    }
    visitEach(graph);
    return sorted;
}

const queue = [];
function clearQueue() {
    while (queue.length) {
        const node = queue.pop(); // remove current node
        node.fn(node.emit);
    }
}

function asNode(fn, initValue) {
    let node = graph.find(node => (
        node === fn || node.fn === fn || node.api === fn
    ));
    if (!node) {
        let value = initValue;
        node = {
            fn: fn,
            dependants: [],
            order: -1,
            emit: function(newValue) {
                value = newValue;
                node.dependants.forEach(node => {
                    let i = queue.length;
                    while (i--) {
                        if (queue[i].order < node.order) {
                            queue.splice(i, 0, node);
                            break;
                        }
                    }
                    if (!queue.length) {
                        queue.push(node);
                    }
                });
                clearQueue();
            },
            api: function(listener, initValue = undefined) {
                clearQueue();
                if (arguments.length === 0) {
                    return value;
                } else {
                    return addDependant(listener, initValue).api;
                }
            }
        };
        graph.push(node);
        queue.push(node);
        clearQueue();
        function addDependant(listener, initValue) {
            const listenerNode = asNode(listener, initValue);
            node.dependants.push(listenerNode);
            const sorted = sort(graph);
            for (let i = 0; i < sorted.length; i++) {
                sorted[i].order = i;
            }
            return listenerNode;
        }
    }
    return node;
}

// This could be simplified to just be a first "root" node that we create for you! It will never even be updated.
/*function node(fn) {
    return asNode(fn).api;
}*/

function node(fn) {
    // Test... this should break initValue though.
    const argLength = arguments.length;
    if (argLength === 1) {
        return asNode(fn).api;
    } else {
        const node = asNode(arguments[argLength - 1]);
        for (let i = 0; i < argLength - 1; i++) {
            arguments[i](node.api);
        }
        return node;
    }
}

// const node = asNode(a => a).api;


let input;

const inputStream = node(function(emit) {
    input = emit;
});

input('x');

const format = inputStream(function(emit) {
    emit('The message is:' + inputStream());
});

const logger = format(function() {
    console.log(format());
});


input('test2');



let a;
let b;
const $a = node(emit => a = emit);
const $b = node(emit => b = emit);

const $sum = $a(emit => emit($a() + $b()));
$b($sum);

$sum(e => console.log(
    `The sum of ${$a()} and ${$b()} is ${$sum()}`
));

a(10);
b(20);

/*

Instead of a default value... lets see if its possible to be a bit smarter about WHEN we update values.

Basically, the idea is that we want to wait for as long as possible. Only when a value is needed do we want to calculate everything UP UNTIL that point.

So the main problem is not WHEN we update, but the fact that we must be able to update only up to one particular node.

When we add a new node we must immediately run its function, to allow e.g. the emit function to be exported.

When we CALL a stream to get its value, we obviously need to run any queued node up until that node.

However, when we EMIT a value, what do we need then? Thoughts:
- We want to allow adding multiple new values synchronously without triggering multiple updates of everything.


So what about this:
- The default behavior is to always *defer* updating, to minimize unnecessary updates, but still make sure there aren't a bunch of queued things waiting around for a long time.
- We also run an update when the value of a stream is needed, but only up UNTIL that stream and no longer.
- When an emit function is called, we simply save its value and queue its dependants, but don't actually update anything.[1]
- When a new node is added, we run its handler to give it access to the emit function, and/or give it a change to set a default value. We don't actually queue it though? If it calls another stream, we already handle how to access its value.

[1]: So one possible problem with this scheme: What happens if we call an emit function repeatedly? We need to make sure ALL the values propagate through the graph, so that e.g mousemove events aren't lost. So basically, when we attempt to set a new value by calling an emit function, we must first make sure that its dependants has been notified of the previous value. It seems that we must keep track of not only whether a node IS queued, but also WHY it is, e.g who queued it. That way we can check if the same node A is queuing node B for the second time, and then trigger node B before updating node A with the new value. So then we're basically back to the concept of edges... it's the edge that is "dirty", not the node.

Another thing - should we somehow catch and prevent circular updates? E.g a node updating a node that is an indirect dependency? Or maybe we *should* allow it?

Plan:
- Rework "clear queue" to accept an argument referencing a particular node. We want to clear up until this node only. Change api() to call it only when getting the value.
- Create a function that defers clearing the entire queue (called repeatedly must not make multiple defers). Call this when anything is added to the queue.
- Invoke handler when a new node is created (instead of queuing etc).
- Add data to the queue that shows which node/emit function queued. Emit should check if any of its dependants is already queued from itself, and update as needed before queueing again.





One more question. There's an issue even implying that there *is* a value - some times its more of a signal. Take events again. We're typically not interested in "the latest" event of a certain kind - we're only interested right when it happens. Let's say we're filtering the events based on target, or something else. If we later want to look up "which is the event related to this click target?", then we're going to get an old event. Because we're thinking of it as a value... E.g if we split mousemove into one stream with particular targets, and one stream with particular x/y values, and then wait for a match of both, then we might actually get values from two different events!

A couple of ways of solving this: either split it into a graph of "values" vs a graph of events - e.g does it have finite or infinite duration? Treat them differently.

Or... just make sure the nodes are a bit more hygienic... E.g publish "null" or undefined when a non-matching event comes in, rather than letting the old value linger around.





*/











