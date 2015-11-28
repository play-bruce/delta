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
    graph.splice(0, graph.length, ...sorted);
}

function next(graph) {
    const next = graph.find(node => node.queued);
    if (next) {
        next.update();
    }
}

function asNode(fn) {
    let node = graph.find(node => (node.fn === fn || node === fn));
    if (!node) {
        node = {
            fn: fn,
            value: undefined,
            queued: true,
            dependants: [],
            addDependant: function(listener) {
                const _listener = asNode(listener);
                node.dependants.push(_listener);
                sort(graph);
            },
            emit: function(value) {
                node.queued = false;
                node.value = value;
                node.dependants.forEach(node => node.queued = true);
                next(graph);
            },
            update: function() {
                node.fn(node.emit);
            }
        };
        graph.push(node);
    }
    return node;
}

function node(fn) {
    const _node = asNode(fn);
    return function nodeApi(listener) {
        if (_node.queued) {
            next(graph);
        }
        if (arguments.length === 0) {
            return _node.value;
        } else {
            _node.addDependant(listener);
            return node(listener);
        }
    }
}


// let input;

// const inputStream = node(function(emit) {
//     input = emit;
// });

// const format = inputStream(function(emit) {
//     emit('The message is:' + inputStream());
// });

// const logger = format(function() {
//     console.log(format());
// });


// input('test2');





