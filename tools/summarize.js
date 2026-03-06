/**
 * TunnelVision_Summarize Tool
 * Model-driven scene/event summarization. The AI decides when something is
 * worth summarizing — this is NOT interval-based or automatic.
 *
 * Creates temporal summary entries (what happened) as distinct from Remember's
 * entity/fact entries (what exists). Summaries capture scenes, events, and
 * narrative beats that the AI determines are significant enough to persist.
 *
 * Summaries are filed under a dedicated "Summaries" category node in the tree,
 * auto-created if it doesn't exist. This keeps temporal knowledge separate from
 * referential knowledge (characters, locations, rules, etc.).
 */

import { getTree, findNodeById, createTreeNode, saveTree, getSettings } from '../tree-store.js';
import { createEntry } from '../entry-manager.js';
import { getActiveTunnelVisionBooks } from '../tool-registry.js';

export const TOOL_NAME = 'TunnelVision_Summarize';

const SUMMARIES_NODE_LABEL = 'Summaries';

/**
 * Find or create the "Summaries" node in a lorebook's tree.
 * Returns the node ID. Creates the node under root if it doesn't exist.
 * @param {string} bookName
 * @returns {string|null} Node ID of the Summaries category, or null if no tree
 */
function ensureSummariesNode(bookName) {
    const tree = getTree(bookName);
    if (!tree || !tree.root) return null;

    // Look for existing Summaries node (direct child of root)
    for (const child of (tree.root.children || [])) {
        if (child.label === SUMMARIES_NODE_LABEL) {
            return child.id;
        }
    }

    // Create it
    const node = createTreeNode(SUMMARIES_NODE_LABEL, 'Temporal scene summaries and event records created by the AI.');
    tree.root.children.push(node);
    saveTree(bookName, tree);
    console.log(`[TunnelVision] Created "${SUMMARIES_NODE_LABEL}" category in "${bookName}"`);
    return node.id;
}

/**
 * Returns the tool definition for ToolManager.registerFunctionTool().
 * @returns {Object}
 */
export function getDefinition() {
    const activeBooks = getActiveTunnelVisionBooks();
    const bookList = activeBooks.length > 0
        ? activeBooks.join(', ')
        : '(none active)';

    return {
        name: TOOL_NAME,
        displayName: 'TunnelVision Summarize',
        description: `Create a summary of a significant scene, event, or narrative beat for long-term memory. Use this when something important happens that should be remembered as a discrete event — a major conversation, a battle, a discovery, an emotional turning point, or any scene transition worth recording.

This is different from Remember: Remember stores facts and entity information (who someone is, what a place looks like). Summarize stores what happened (events, scenes, narrative beats).

Write summaries in past tense, third person, capturing the key actions, participants, outcomes, and emotional beats. Be concise but thorough — this summary replaces the need to re-read the full scene.

Active lorebooks: ${bookList}

When you notice related events forming a pattern or storyline, group them into "arcs" (narrative threads). Proactively create a new arc with create_arc when a new story thread emerges, and assign subsequent related summaries to it with arc_node_id. You can also use TunnelVision_Reorganize to move earlier summaries into an arc retroactively.`,
        parameters: {
            $schema: 'http://json-schema.org/draft-04/schema#',
            type: 'object',
            properties: {
                lorebook: {
                    type: 'string',
                    description: `Which lorebook to save the summary to. Available: ${bookList}`,
                },
                title: {
                    type: 'string',
                    description: 'A short, descriptive title for this event/scene (e.g. "The Ambush at Thornfield Bridge", "Sable confesses her fears to Ren").',
                },
                summary: {
                    type: 'string',
                    description: 'The scene/event summary. Write in past tense, third person. Include who was involved, what happened, key outcomes, and emotional beats.',
                },
                participants: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Names of characters/entities involved in this event. Used as keywords for cross-referencing.',
                },
                significance: {
                    type: 'string',
                    enum: ['minor', 'moderate', 'major', 'critical'],
                    description: 'How significant is this event? Helps with future retrieval priority. "minor" = flavor/ambiance, "moderate" = plot-relevant, "major" = changes character/world state, "critical" = turning point.',
                },
                arc_node_id: {
                    type: 'string',
                    description: 'Optional: Assign this summary to an existing arc (narrative thread). Provide the arc node ID.',
                },
                create_arc: {
                    type: 'string',
                    description: 'Optional: Create a new arc (narrative thread) with this name. The summary will be the first entry in the arc. Use this when a new story thread begins.',
                },
            },
            required: ['lorebook', 'title', 'summary'],
        },
        action: async (args) => {
            if (!args?.lorebook || !args?.title || !args?.summary) {
                return 'Missing required fields: lorebook, title, and summary are all required.';
            }

            const currentBooks = getActiveTunnelVisionBooks();
            if (!currentBooks.includes(args.lorebook)) {
                return `Lorebook "${args.lorebook}" is not active. Available: ${currentBooks.join(', ')}`;
            }

            // Ensure the Summaries category exists
            const summariesNodeId = ensureSummariesNode(args.lorebook);

            // Determine target node (summaries, arc, or new arc)
            let targetNodeId = summariesNodeId;
            let arcLabel = null;

            if (args.create_arc) {
                // Create a new arc node under Summaries
                const tree = getTree(args.lorebook);
                if (tree && tree.root) {
                    const summNode = findNodeById(tree.root, summariesNodeId);
                    if (summNode) {
                        const arcNode = createTreeNode(args.create_arc, '');
                        arcNode.isArc = true;
                        summNode.children = summNode.children || [];
                        summNode.children.push(arcNode);
                        saveTree(args.lorebook, tree);
                        targetNodeId = arcNode.id;
                        arcLabel = args.create_arc;
                        console.log(`[TunnelVision] Created arc "${args.create_arc}" (${arcNode.id})`);
                    }
                }
            } else if (args.arc_node_id) {
                // Assign to existing arc
                const tree = getTree(args.lorebook);
                if (tree && tree.root) {
                    const arcNode = findNodeById(tree.root, args.arc_node_id);
                    if (arcNode) {
                        targetNodeId = args.arc_node_id;
                        arcLabel = arcNode.label;
                    }
                }
            }

            // Build content with metadata prefix
            const significance = args.significance || 'moderate';
            const participantList = Array.isArray(args.participants) && args.participants.length > 0
                ? args.participants.join(', ')
                : '(unspecified)';

            const content = `[Scene Summary — ${significance}]\nParticipants: ${participantList}\n\n${args.summary.trim()}`;

            // Build keys from participants + significance
            const keys = [];
            if (Array.isArray(args.participants)) {
                keys.push(...args.participants.map(p => String(p).trim()).filter(Boolean));
            }
            keys.push(`summary:${significance}`);

            try {
                const result = await createEntry(args.lorebook, {
                    content,
                    comment: `[Summary] ${args.title}`,
                    keys,
                    nodeId: targetNodeId,
                });
                let response = `Summarized: "${args.title}" (UID ${result.uid}) → "${result.nodeLabel}" in "${args.lorebook}". Significance: ${significance}.`;
                if (arcLabel) {
                    response += ` Arc: "${arcLabel}".`;
                }
                return response;
            } catch (e) {
                console.error('[TunnelVision] Summarize failed:', e);
                return `Failed to save summary: ${e.message}`;
            }
        },
        formatMessage: async () => 'Summarizing scene for long-term memory...',
        shouldRegister: async () => {
            const settings = getSettings();
            if (settings.globalEnabled === false) return false;
            return getActiveTunnelVisionBooks().length > 0;
        },
        stealth: false,
    };
}
