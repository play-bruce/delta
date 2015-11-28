
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
function clearQueue(fn) {
    const searchForFn = arguments.length > 0;
    if (searchForFn && queue.every(pair => pair[1].fn !== fn)) {
        return;
    }
    while (queue.length) {
        const node = queue.pop()[1];
        while (queue.length && queue[queue.length - 1][1] === node) {
            const other = queue.pop();
        }
        node.fn(node.emit);
        if (searchForFn && node.fn === fn) break;
    }
}

let deferClearQueue = (() =>
    function deferFn() {
        deferClearQueue = () => {};
        setTimeout(() => {
            deferClearQueue = clearQueue;
            clearQueue();
            deferClearQueue = deferFn;
        }, 1);
    }
)();

function asNode(fn) {
    let node = graph.find(node => (
        node.fn === fn || node.api === fn
    ));
    if (!node) {
        let value;
        node = {
            fn: fn,
            dependants: [],
            order: -1,
            emit: function(newValue) {
                if (queue.some(pair => pair[0] === node)) {
                    clearQueue();
                }
                value = newValue;
                node.dependants.forEach(dependantNode => {
                    const pair = [node, dependantNode];
                    let i = queue.length;
                    while (i--) {
                        if (queue[i][1].order > dependantNode.order) {
                            queue.splice(i + 1, 0, pair);
                            return;
                        }
                    }
                    queue.unshift(pair);
                });
                deferClearQueue();
            },
            api: function(listener) {
                if (arguments.length === 0) {
                    clearQueue(fn);
                    return value;
                } else {
                    return addDependant(listener).api;
                }
            }
        };
        function addDependant(listener) {
            const listenerNode = asNode(listener);
            node.dependants.push(listenerNode);
            const sorted = sort(graph);
            for (let i = 0; i < sorted.length; i++) {
                sorted[i].order = i;
            }
            return listenerNode;
        }
        graph.push(node);
        fn(node.emit);
    }
    return node;
}

function node(fn) {
    const argLength = arguments.length;
    if (argLength === 1) {
        return asNode(fn).api;
    } else {
        const node = asNode(arguments[argLength - 1]);
        for (let i = 0; i < argLength - 1; i++) {
            arguments[i](node.api);
        }
        return node.api;
    }
}








// const node = asNode(a => a).api;

console.clear();

let input;

const inputStream = node(function(emit) {
    input = emit;
});

// input('x');

const format = inputStream(function(emit) {
    // emit('The message is:' + inputStream());
});

const logger = format(function() {
    // console.log(format());
});


// input('test2');



let a;
const $a = node(emit => {a = emit});
a(1);

let b;
const $b = node(emit => {b = emit});
b(2);

// const $sum = $a(emit => emit($a() + $b()));
// $b($sum);
//*
$a(() => {
    console.log(`$a was updated to ${$a()}`);
})(
    () => {console.log('crazy chaining!')}
);
/* */

const $sum = node($a, $b,
                  emit => (console.log('sum'), emit($a() + $b()))
                 );

const $msg = $sum(emit => emit(
    `The sum of ${$a()} and ${$b()} is ${$sum()}`
));

const $log = $msg(emit => {console.log('\t\tmsg: ' + $msg())});

a(10);
b(20);
b(30);










