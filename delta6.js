/*
Todo:
- Tests!
- Some more methods for inspecting and manipulating the graph and nodes.
    - A way to add an edge between two nodes, only using their proxy
    - A way to access the entire graph (for debugging/visualisation...)
- Some default functions (filter, count, delay...)
- Helpful error messages, validate args, etc.

*/


function delta() {
    let internalNodeList = [];
    let sortTempList = [];
    const stack = [];
    function sortGraph() {
        stack.length = 0;
        sortTempList.length = 0;
        sortSubgraph(internalNodeList);
        [internalNodeList, sortTempList] = [sortTempList, internalNodeList];
    }
    function sortSubgraph(nodeList) {
        for (let i = 0; i < nodeList.length; i++) {
            const node = nodeList[i];
            if (stack.indexOf(node) !== -1) {
                throw new Error(`Cannot sort cyclic graphs. Found cycle returning to ${node} after ${stack.map(node => internalNodeList.indexOf(node)).join('->')}`);
            }
            if (sortTempList.indexOf(node) === -1) {
                stack.push(node);
                sortSubgraph(node.listeners);
                stack.pop();
                sortTempList.unshift(node);
            }
        }
    }
    function clearQueue(requestedUpdateNode) {
        // @TODO Prevent anything that might change the end index while inside the loop...!?
        const endIndex = arguments.length > 0 ? internalNodeList.indexOf(requestedUpdateNode) : internalNodeList.length;
        for (let i = 0; i < endIndex; i++) {
            const currentNode = internalNodeList[i];
            if (currentNode.incoming.length) {
                currentNode.incoming.length = 0; // Empty the array
                currentNode.handler(currentNode.emit);
            }
        }
    }
    const noop = () => {};
    let deferClearQueue = function setDefer() {
        deferClearQueue = noop;
        setTimeout(() => {
            deferClearQueue = clearQueue;
            clearQueue();
            deferClearQueue = setDefer;
        }, 1);
    }
    function isQueued(internalNode) {
        // @TODO Maybe inline in emit()
        for (let i = 0; i < internalNode.listeners.length; i++) {
            if (internalNode.listeners[i].incoming.indexOf(internalNode) !== -1) {
                return true;
            }
        }
        return false;
    }
    function getNodeByProxy(proxy) {
        for (let i = 0; i < internalNodeList.length; i++) {
            const node = internalNodeList[i];
            if (node.proxy === proxy || node === proxy) {
                return node;
            }
        }
    }
    function newInternalNode() {
        let value;
        const internalNode = {
            incoming: [],
            listeners: [],
            read() {
                clearQueue(internalNode);
                return value;
            },
            emit(newValue) {
                if (isQueued(internalNode)) {
                    clearQueue();
                }
                value = newValue;
                for (let i = 0; i < internalNode.listeners.length; i++) {
                    internalNode.listeners[i].incoming.push(internalNode);
                }
                deferClearQueue();
            }
        };
        internalNodeList.push(internalNode);
        return internalNode;
    }
    return function newSourceNode(userSuppliedSetupFunction) {
        const internalSourceNode = newInternalNode();
        function setSourceNodeHandler(userSuppliedUpdateHandler) {
            internalSourceNode.handler = userSuppliedUpdateHandler;
            return function defaultProxy(listenerMapHandler) {
                if (arguments.length === 0) {
                    return internalSourceNode.read();
                } else {
                    const listenerProxy = newSourceNode(
                        setListenerHandler => setListenerHandler(
                            emitListenerValue => emitListenerValue(
                                listenerMapHandler(
                                    internalSourceNode.read()
                                )
                            )
                        )
                    );
                    internalSourceNode.listeners.push(
                        getNodeByProxy(listenerProxy)
                    );
                    sortGraph();
                    return listenerProxy;
                }
            }
        }
        internalSourceNode.proxy = userSuppliedSetupFunction(setSourceNodeHandler);
        internalSourceNode.handler(internalSourceNode.emit);
        return internalSourceNode.proxy;
    }
}

const graph = delta();
const stream = graph(function userSuppliedSetupFunction(setSourceNodeHandler) {
    return setSourceNodeHandler(function userSuppliedUpdateHandler(emit) {
        whenSomethingCoolHappens(emit);
    });
});

const squared = stream(a => a * a);
const powerOfFour = squared(a => a * a);











