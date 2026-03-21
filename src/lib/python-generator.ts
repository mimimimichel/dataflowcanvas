
import { PipelineNode, Connector, JoinOperation, FilterOperation, GroupByOperation, SortOperation } from './pipeline-data';

/**
 * Generates a Python script using Pandas based on the provided pipeline nodes and connectors.
 */
export function generatePythonCode(nodes: PipelineNode[], connectors: Connector[]): string {
  let code = `import pandas as pd\nimport numpy as np\n\n# --- Generated Data Pipeline ---\n\n`;

  // Helper to get variable name from node ID
  const getVarName = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return `df_${nodeId.replace(/[^a-zA-Z0-9]/g, '_')}`;
    return `df_${node.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${node.id.split('-').pop()}`;
  };

  // Topological Sort (simple version) to ensure dependencies are defined first
  const visited = new Set<string>();
  const sortedNodeIds: string[] = [];

  const visit = (nodeId: string) => {
    if (visited.has(nodeId)) return;
    
    // Find parent nodes (dependencies)
    const parentConnectors = connectors.filter(c => c.to === nodeId);
    parentConnectors.forEach(c => visit(c.from));

    visited.add(nodeId);
    sortedNodeIds.push(nodeId);
  };

  nodes.forEach(node => visit(node.id));

  // Generate code for each node in order
  sortedNodeIds.forEach(nodeId => {
    const node = nodes.find(n => n.id === nodeId)!;
    const varName = getVarName(nodeId);
    const parentIds = connectors.filter(c => c.to === nodeId).map(c => c.from);

    code += `# Node: ${node.name} (${node.type})\n`;

    switch (node.type) {
      case 'source':
        code += `${varName} = pd.read_csv('${node.location || 'data_source.csv'}')  # From ${node.system || 'External System'}\n`;
        break;

      case 'transformation':
        if (!node.operation) {
          if (parentIds.length > 0) {
            code += `${varName} = ${getVarName(parentIds[0])}.copy()\n`;
          } else {
            code += `${varName} = pd.DataFrame() # No inputs connected\n`;
          }
          break;
        }

        const op = node.operation;
        switch (op.type) {
          case 'filter':
            const fOp = op as FilterOperation;
            const inputVar = getVarName(parentIds[0]);
            let val = fOp.settings.value;
            if (typeof val === 'string') val = `'${val}'`;
            code += `${varName} = ${inputVar}[${inputVar}['${fOp.settings.field}'] ${fOp.settings.operator} ${val}]\n`;
            break;

          case 'join':
            const jOp = op as JoinOperation;
            if (parentIds.length >= 2) {
                const leftVar = getVarName(jOp.settings.leftNodeId || parentIds[0]);
                const rightVar = getVarName(jOp.settings.rightNodeId || parentIds[1]);
                code += `${varName} = pd.merge(\n    ${leftVar}, \n    ${rightVar}, \n    how='${jOp.settings.joinType}', \n    left_on='${jOp.settings.condition.leftField}', \n    right_on='${jOp.settings.condition.rightField}'\n)\n`;
            } else {
                code += `${varName} = # Waiting for two inputs to join\n`;
            }
            break;

          case 'group_by':
            const gOp = op as GroupByOperation;
            const gInputVar = getVarName(parentIds[0]);
            const aggDict = gOp.settings.aggregations.reduce((acc: any, agg) => {
              acc[agg.field] = agg.type === 'count' ? 'count' : agg.type;
              return acc;
            }, {});
            
            code += `${varName} = ${gInputVar}.groupby([\n    ${gOp.settings.groupByFields.map(f => `'${f}'`).join(', ')}\n]).agg(${JSON.stringify(aggDict).replace(/"/g, "'")}).reset_index()\n`;
            
            // Handle renaming
            gOp.settings.aggregations.forEach(agg => {
                code += `${varName}.rename(columns={'${agg.field}': '${agg.newName}'}, inplace=True)\n`;
            });
            break;

          case 'sort':
            const sOp = op as SortOperation;
            const sInputVar = getVarName(parentIds[0]);
            const fields = sOp.settings.conditions.map(c => `'${c.field}'`);
            const ascending = sOp.settings.conditions.map(c => c.direction === 'asc');
            code += `${varName} = ${sInputVar}.sort_values(\n    by=[${fields.join(', ')}], \n    ascending=[${ascending.join(', ')}]\n)\n`;
            break;

          default:
            code += `${varName} = ${getVarName(parentIds[0])}.copy()  # Operation: ${op.type}\n`;
        }
        break;

      case 'dataset':
        if (parentIds.length > 0) {
            code += `${varName} = ${getVarName(parentIds[0])}.copy()  # Cache point\n`;
        }
        break;

      case 'destination':
        const dInputVar = getVarName(parentIds[0]);
        code += `# Exporting to ${node.system || 'Destination'} at ${node.location || 'output_path'}\n`;
        code += `${dInputVar}.to_csv('${node.location || 'output.csv'}', index=False)\n`;
        break;
    }
    code += `\n`;
  });

  code += `\nprint("Pipeline execution complete.")\n`;
  return code;
}
