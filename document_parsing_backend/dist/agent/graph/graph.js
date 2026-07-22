"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentGraph = void 0;
exports.createAgentWorkflow = createAgentWorkflow;
const langgraph_1 = require("@langchain/langgraph");
const state_1 = require("./state");
const start_node_1 = require("./nodes/start.node");
const intent_node_1 = require("./nodes/intent.node");
const planning_node_1 = require("./nodes/planning.node");
const toolSelection_node_1 = require("./nodes/toolSelection.node");
const toolExecution_node_1 = require("./nodes/toolExecution.node");
const contextValidation_node_1 = require("./nodes/contextValidation.node");
const llm_node_1 = require("./nodes/llm.node");
const response_node_1 = require("./nodes/response.node");
const end_node_1 = require("./nodes/end.node");
function createAgentWorkflow() {
    const workflow = new langgraph_1.StateGraph(state_1.AgentStateAnnotation)
        .addNode('start', start_node_1.startNode)
        .addNode('intentDetection', intent_node_1.intentNode)
        .addNode('planning', planning_node_1.planningNode)
        .addNode('toolSelection', toolSelection_node_1.toolSelectionNode)
        .addNode('toolExecution', toolExecution_node_1.toolExecutionNode)
        .addNode('contextValidation', contextValidation_node_1.contextValidationNode)
        .addNode('llm', llm_node_1.llmNode)
        .addNode('response', response_node_1.responseNode)
        .addNode('end', end_node_1.endNode);
    // Set sequence path flow edges
    workflow.addEdge(langgraph_1.START, 'start');
    workflow.addEdge('start', 'intentDetection');
    workflow.addEdge('intentDetection', 'planning');
    workflow.addEdge('planning', 'toolSelection');
    workflow.addEdge('toolSelection', 'toolExecution');
    workflow.addEdge('toolExecution', 'contextValidation');
    workflow.addEdge('contextValidation', 'llm');
    workflow.addEdge('llm', 'response');
    workflow.addEdge('response', 'end');
    workflow.addEdge('end', langgraph_1.END);
    const checkpointer = new langgraph_1.MemorySaver();
    return workflow.compile({ checkpointer });
}
exports.agentGraph = createAgentWorkflow();
exports.default = exports.agentGraph;
